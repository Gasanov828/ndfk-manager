import { formatNetworkAuthError, formatPlayerAuthError } from "@/lib/playerAuth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type LoginBody = {
  email?: string;
  password?: string;
  adminOnly?: boolean;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const adminOnly = body.adminOnly === true;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Укажите email и пароль" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    await supabase.auth.signOut();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: formatPlayerAuthError(signInError.message) },
        { status: 401 }
      );
    }

    const { data: rows } = await supabase.rpc("get_my_profile");
    const role = rows?.[0]?.role as string | undefined;

    if (adminOnly) {
      if (role !== "admin") {
        await supabase.auth.signOut();
        return NextResponse.json(
          {
            error:
              "Это игровой аккаунт. Для админки нужен отдельный email — войдите через «Вход игрока».",
            code: "wrong_role_player",
          },
          { status: 403 }
        );
      }
    } else if (role === "admin") {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "Это админский аккаунт. Для игрока используйте другой email и /player/login.",
          code: "wrong_role_admin",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: formatNetworkAuthError(error) },
      { status: 503 }
    );
  }
}
