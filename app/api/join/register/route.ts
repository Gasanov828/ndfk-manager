import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlayerEmail } from "@/lib/playerAuth";
import { NextResponse } from "next/server";

type RegisterBody = {
  token?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "На сервере нет SUPABASE_SERVICE_ROLE_KEY. Supabase → Settings → API → Secret keys → скопируйте ключ sb_secret_... в .env.local и перезапустите npm run dev.",
      },
      { status: 503 }
    );
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const token = body.token?.trim() ?? "";
  const email = body.email ? normalizePlayerEmail(body.email) : "";
  const password = body.password ?? "";

  if (!token || !email || password.length < 6) {
    return NextResponse.json(
      { error: "Укажите ссылку, email и пароль (мин. 6 символов)." },
      { status: 400 }
    );
  }

  const { data: inviteRows, error: inviteError } = await admin.rpc(
    "get_player_invite",
    { p_token: token }
  );

  if (inviteError || !inviteRows?.length) {
    return NextResponse.json(
      { error: "Ссылка недействительна, уже использована или истекла." },
      { status: 400 }
    );
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (!createError && created.user) {
    return NextResponse.json({ userId: created.user.id, created: true });
  }

  const createMessage = createError?.message.toLowerCase() ?? "";
  const alreadyExists =
    createMessage.includes("already") ||
    createMessage.includes("registered") ||
    createMessage.includes("exists");

  if (!alreadyExists) {
    return NextResponse.json(
      { error: createError?.message ?? "Не удалось создать аккаунт." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  await supabase.auth.signOut();

  if (signInError || !signInData.user) {
    return NextResponse.json(
      { error: "Этот email уже зарегистрирован. Проверьте пароль." },
      { status: 409 }
    );
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", signInData.user.id)
    .maybeSingle();

  if (existingProfile?.role === "admin") {
    return NextResponse.json(
      {
        error:
          "Этот email — админский. Для игрока зарегистрируйтесь с другим email.",
        code: "admin_use_separate_player_email",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ userId: signInData.user.id, created: false });
}
