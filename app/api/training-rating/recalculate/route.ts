import { recalculateTrainingRatings } from "@/lib/trainingRatingSync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Body = {
  trainingId?: number;
};

export async function POST(request: Request) {
  let body: Body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const trainingId = Number(body.trainingId);
  if (!Number.isFinite(trainingId) || trainingId <= 0) {
    return NextResponse.json({ error: "Укажите trainingId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите как игрок" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "На сервере нет SUPABASE_SERVICE_ROLE_KEY — нельзя обновить ★. Добавьте ключ в Vercel.",
      },
      { status: 503 }
    );
  }

  try {
    const result = await recalculateTrainingRatings(trainingId, admin);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
