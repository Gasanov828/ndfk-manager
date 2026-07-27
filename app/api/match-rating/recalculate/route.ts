import { recalculateMatchRatings } from "@/lib/matchRatingSync";
import { processMatchGamification } from "@/lib/server/matchGamification";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Body = {
  matchId?: number;
};

export async function POST(request: Request) {
  let body: Body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const matchId = Number(body.matchId);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    return NextResponse.json({ error: "Укажите matchId" }, { status: 400 });
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
    const result = await recalculateMatchRatings(matchId, admin);

    // Post-match gamification (season averages, career XP/level/title,
    // achievements). Deterministic & idempotent — safe to run on every recalc.
    // Never let it break the core rating recalc response.
    let gamification: Awaited<ReturnType<typeof processMatchGamification>> = {};
    try {
      gamification = await processMatchGamification(matchId, admin);
    } catch (gamificationError) {
      console.error("Gamification processing failed", gamificationError);
    }

    return NextResponse.json({ ...result, gamification });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
