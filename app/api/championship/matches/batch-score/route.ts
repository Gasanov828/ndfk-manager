import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncClubMatchVotingFromChampionship } from "@/lib/championship/syncClubMatchVoting";

type ScoreEntry = {
  matchId?: number;
  homeGoals?: number;
  awayGoals?: number;
};

type Body = {
  scores?: ScoreEntry[];
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Войдите" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Только капитан" }, { status: 403 }),
    };
  }

  return { db: createAdminClient() ?? supabase };
}

function revalidateChampionship() {
  revalidatePath("/");
  revalidatePath("/championship");
  revalidatePath("/championship", "layout");
  revalidatePath("/championship/matches");
  revalidatePath("/admin/championship");
}

export async function PATCH(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const entries = Array.isArray(body.scores) ? body.scores : [];
  if (entries.length === 0) {
    return NextResponse.json({ error: "Нет матчей для сохранения" }, { status: 400 });
  }

  const normalized = entries.map((entry) => ({
    matchId: Number(entry.matchId),
    homeGoals: Number(entry.homeGoals),
    awayGoals: Number(entry.awayGoals),
  }));

  for (const entry of normalized) {
    if (
      !Number.isFinite(entry.matchId) ||
      entry.matchId <= 0 ||
      !Number.isFinite(entry.homeGoals) ||
      !Number.isFinite(entry.awayGoals) ||
      entry.homeGoals < 0 ||
      entry.awayGoals < 0
    ) {
      return NextResponse.json({ error: "Укажите корректный счёт для всех матчей" }, { status: 400 });
    }
  }

  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const db = auth.db!;

  const matchIds = normalized.map((entry) => entry.matchId);
  const { data: existing, error: loadError } = await db
    .from("championship_matches")
    .select("id, is_live")
    .in("id", matchIds);

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }

  const byId = new Map((existing ?? []).map((row) => [Number(row.id), row]));
  for (const entry of normalized) {
    const match = byId.get(entry.matchId);
    if (!match) {
      return NextResponse.json({ error: `Матч #${entry.matchId} не найден` }, { status: 404 });
    }
    if (match.is_live) {
      return NextResponse.json(
        { error: "LIVE-матч сначала завершите через live-пульт" },
        { status: 400 }
      );
    }
  }

  let saved = 0;
  let votingOpened = 0;

  for (const entry of normalized) {
    const homeGoals = Math.floor(entry.homeGoals);
    const awayGoals = Math.floor(entry.awayGoals);

    const { error } = await db
      .from("championship_matches")
      .update({
        home_goals: homeGoals,
        away_goals: awayGoals,
        is_played: true,
      })
      .eq("id", entry.matchId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const votingSync = await syncClubMatchVotingFromChampionship({
      db,
      championshipMatchId: entry.matchId,
      homeGoals,
      awayGoals,
    });

    if (votingSync.error) {
      return NextResponse.json({ error: votingSync.error }, { status: 500 });
    }

    if (votingSync.synced) votingOpened += 1;
    saved += 1;
  }

  revalidateChampionship();
  revalidatePath("/matches");
  revalidatePath("/live");

  return NextResponse.json({ ok: true, saved, votingOpened });
}
