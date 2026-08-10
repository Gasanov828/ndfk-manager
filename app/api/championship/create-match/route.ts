import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncClubMatchVotingFromChampionship, syncScheduledClubMatchFromChampionship } from "@/lib/championship/syncClubMatchVoting";

type Body = {
  homeTeamId?: number;
  awayTeamId?: number;
  matchDate?: string;
  matchTime?: string;
  location?: string;
  homeGoals?: number;
  awayGoals?: number;
  markPlayed?: boolean;
  roundId?: number | null;
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
  return { supabase, db: createAdminClient() ?? supabase };
}

function revalidateChampionship() {
  revalidatePath("/");
  revalidatePath("/championship");
  revalidatePath("/championship", "layout");
  revalidatePath("/championship/matches");
  revalidatePath("/admin/championship");
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const homeTeamId = Number(body.homeTeamId);
  const awayTeamId = Number(body.awayTeamId);
  const matchDate = String(body.matchDate ?? "").trim();
  const matchTime = String(body.matchTime ?? "18:00").trim() || "18:00";
  const location = String(body.location ?? "").trim();
  const markPlayed = Boolean(body.markPlayed);
  const homeGoals = Number(body.homeGoals);
  const awayGoals = Number(body.awayGoals);
  const roundId =
    body.roundId != null && Number.isFinite(Number(body.roundId))
      ? Number(body.roundId)
      : null;

  if (!Number.isFinite(homeTeamId) || !Number.isFinite(awayTeamId)) {
    return NextResponse.json({ error: "Выберите команды" }, { status: 400 });
  }
  if (homeTeamId === awayTeamId) {
    return NextResponse.json(
      { error: "Команды должны отличаться" },
      { status: 400 }
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) {
    return NextResponse.json({ error: "Укажите дату YYYY-MM-DD" }, { status: 400 });
  }
  if (
    markPlayed &&
    (!Number.isFinite(homeGoals) ||
      !Number.isFinite(awayGoals) ||
      homeGoals < 0 ||
      awayGoals < 0)
  ) {
    return NextResponse.json({ error: "Укажите корректный счёт" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const db = auth.db!;

  const { data: championship, error: champError } = await db
    .from("championships")
    .select("id")
    .eq("status", "active")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (champError || !championship) {
    return NextResponse.json(
      {
        error:
          champError?.message ??
          "Нет активного чемпионата. Выполните supabase/championship.sql",
      },
      { status: 400 }
    );
  }

  const teamIds = [homeTeamId, awayTeamId];
  const { data: existingParticipants, error: participantSelectError } = await db
    .from("championship_participants")
    .select("team_id")
    .eq("championship_id", championship.id)
    .in("team_id", teamIds);

  if (participantSelectError) {
    return NextResponse.json({ error: participantSelectError.message }, { status: 500 });
  }

  const existingTeamIds = new Set(
    (existingParticipants ?? []).map((row) => Number(row.team_id))
  );
  const missingParticipants = teamIds
    .filter((teamId) => !existingTeamIds.has(teamId))
    .map((teamId) => ({ championship_id: championship.id, team_id: teamId }));

  if (missingParticipants.length > 0) {
    const { error: participantInsertError } = await db
      .from("championship_participants")
      .insert(missingParticipants);

    if (participantInsertError) {
      return NextResponse.json({ error: participantInsertError.message }, { status: 500 });
    }
  }

  const { data: created, error } = await db
    .from("championship_matches")
    .insert({
      championship_id: championship.id,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      match_date: matchDate,
      match_time: matchTime,
      location,
      home_goals: markPlayed ? Math.floor(homeGoals) : null,
      away_goals: markPlayed ? Math.floor(awayGoals) : null,
      is_played: markPlayed,
      is_live: false,
      ...(roundId != null ? { round_id: roundId } : {}),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let votingOpened = false;
  let clubScheduled = false;
  if (markPlayed) {
    const votingSync = await syncClubMatchVotingFromChampionship({
      db,
      championshipMatchId: Number(created.id),
      homeGoals: Math.floor(homeGoals),
      awayGoals: Math.floor(awayGoals),
    });

    if (votingSync.error) {
      return NextResponse.json({ error: votingSync.error }, { status: 500 });
    }
    votingOpened = votingSync.synced;
  } else {
    const scheduleSync = await syncScheduledClubMatchFromChampionship({
      db,
      championshipMatchId: Number(created.id),
    });

    if (scheduleSync.error) {
      return NextResponse.json({ error: scheduleSync.error }, { status: 500 });
    }
    clubScheduled = scheduleSync.synced;
  }

  revalidateChampionship();
  revalidatePath("/matches");
  revalidatePath("/live");
  return NextResponse.json({ ok: true, id: created.id, votingOpened, clubScheduled });
}