import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveLevelFromTotalXp } from "@/lib/championship/progressFormula";
import { recalculateChampionshipSeasonStats } from "@/lib/championship/finishMatch";
import { applyChampionshipTourResults } from "@/lib/championship/tourResults";

type OrdinaryMatchRow = {
  id: number;
  date: string;
  time: string;
  opponent?: string | null;
};

type TeamRef = { id: number; name: string };

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function findOrdinaryMatchForChampionship(
  db: SupabaseClient,
  params: {
    matchDate: string;
    matchTime: string;
    homeTeamId: number;
    awayTeamId: number;
    homeTeamName: string;
    awayTeamName: string;
  }
): Promise<number | null> {
  const homeClubTeam = await db
    .from("championship_teams")
    .select("id, name")
    .eq("name", "Дженгутай")
    .maybeSingle();

  if (!homeClubTeam.data) return null;

  const weAreHome = Number(params.homeTeamId) === Number(homeClubTeam.data.id);
  const opponent = weAreHome ? params.awayTeamName : params.homeTeamName;
  const time = params.matchTime || "18:00";

  const { data: ordinaryMatch } = await db
    .from("matches")
    .select("id")
    .eq("date", params.matchDate)
    .eq("time", time)
    .eq("opponent", opponent)
    .maybeSingle();

  return ordinaryMatch ? Number(ordinaryMatch.id) : null;
}

/** Копирует голы/пасы из club match_player_stats в championship_match_player_stats */
export async function syncChampionshipGoalsAssistsFromClubMatch(
  db: SupabaseClient,
  ordinaryMatchId: number
): Promise<{ synced: boolean; championshipMatchId: number | null }> {
  const { data: ordinaryMatch } = await db
    .from("matches")
    .select("id, opponent, date, time")
    .eq("id", ordinaryMatchId)
    .maybeSingle();

  const linked = await findChampionshipMatchForVoting(db, ordinaryMatch);
  if (!linked) {
    return { synced: false, championshipMatchId: null };
  }

  const { data: clubStats, error: statsError } = await db
    .from("match_player_stats")
    .select("player_id, goals, assists")
    .eq("match_id", ordinaryMatchId);

  if (statsError) throw statsError;
  if (!clubStats?.length) {
    return { synced: false, championshipMatchId: linked.championshipMatchId };
  }

  const { data: squadRows } = await db
    .from("championship_player_season_stats")
    .select("player_id")
    .eq("championship_id", linked.championshipId)
    .eq("team_id", linked.teamId);

  const squadIds = new Set(
    (squadRows ?? [])
      .map((row) => Number(row.player_id))
      .filter((id) => Number.isFinite(id) && id > 0)
  );

  const statRows = (clubStats ?? []).filter((row) =>
    squadIds.has(Number(row.player_id))
  );

  if (statRows.length === 0) {
    return { synced: false, championshipMatchId: linked.championshipMatchId };
  }

  const playerIds = statRows.map((row) => Number(row.player_id));
  const { data: existingRows } = await db
    .from("championship_match_player_stats")
    .select("player_id, match_rating, is_mvp")
    .eq("match_id", linked.championshipMatchId)
    .in("player_id", playerIds);

  const existingMap = new Map(
    (existingRows ?? []).map((row) => [Number(row.player_id), row])
  );

  const upsertRows = statRows.map((row) => {
    const playerId = Number(row.player_id);
    const existing = existingMap.get(playerId);
    return {
      match_id: linked.championshipMatchId,
      player_id: playerId,
      team_id: linked.teamId,
      goals: Number(row.goals) || 0,
      assists: Number(row.assists) || 0,
      match_rating:
        existing?.match_rating != null ? Number(existing.match_rating) : null,
      is_mvp: Boolean(existing?.is_mvp),
    };
  });

  const { error } = await db
    .from("championship_match_player_stats")
    .upsert(upsertRows, { onConflict: "match_id,player_id" });

  if (error) throw error;

  return { synced: true, championshipMatchId: linked.championshipMatchId };
}

export async function findChampionshipMatchForVoting(
  db: SupabaseClient,
  ordinaryMatch: OrdinaryMatchRow | null | undefined
): Promise<{
  championshipId: number;
  championshipMatchId: number;
  teamId: number;
} | null> {
  if (!ordinaryMatch?.date || !ordinaryMatch.time || !ordinaryMatch.opponent) {
    return null;
  }

  const { data: championship } = await db
    .from("championships")
    .select("id")
    .eq("status", "active")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!championship) return null;

  const { data: homeClubTeam } = await db
    .from("championship_teams")
    .select("id, name")
    .eq("name", "Дженгутай")
    .maybeSingle();

  if (!homeClubTeam) return null;

  const { data: championshipMatches } = await db
    .from("championship_matches")
    .select(
      "id, home_team_id, away_team_id, match_date, match_time, home_team:championship_teams!championship_matches_home_team_id_fkey(id, name), away_team:championship_teams!championship_matches_away_team_id_fkey(id, name)"
    )
    .eq("championship_id", championship.id)
    .eq("match_date", ordinaryMatch.date)
    .eq("match_time", ordinaryMatch.time || "18:00")
    .or(`home_team_id.eq.${homeClubTeam.id},away_team_id.eq.${homeClubTeam.id}`);

  const sourceMatch = (championshipMatches ?? []).find((row) => {
    const home = one(row.home_team as TeamRef | TeamRef[] | null);
    const away = one(row.away_team as TeamRef | TeamRef[] | null);
    const weAreHome = Number(row.home_team_id) === Number(homeClubTeam.id);
    const opponentName = weAreHome ? away?.name : home?.name;
    return opponentName === ordinaryMatch.opponent;
  });

  if (!sourceMatch) return null;

  return {
    championshipId: Number(championship.id),
    championshipMatchId: Number(sourceMatch.id),
    teamId: Number(homeClubTeam.id),
  };
}

async function loadClubMatchStatLines(
  db: SupabaseClient,
  ordinaryMatchId: number,
  squadIds: Set<number>
) {
  const [{ data: summaries }, { data: clubStats }] = await Promise.all([
    db
      .from("match_player_rating_summary")
      .select("player_id, match_rating, is_mvp, vote_count")
      .eq("match_id", ordinaryMatchId),
    db
      .from("match_player_stats")
      .select("player_id, goals, assists")
      .eq("match_id", ordinaryMatchId),
  ]);

  const clubByPlayer = new Map<
    number,
    { goals: number; assists: number }
  >();
  for (const row of clubStats ?? []) {
    clubByPlayer.set(Number(row.player_id), {
      goals: Number(row.goals) || 0,
      assists: Number(row.assists) || 0,
    });
  }

  const playerIds = new Set<number>([
    ...(summaries ?? []).map((row) => Number(row.player_id)),
    ...(clubStats ?? []).map((row) => Number(row.player_id)),
  ]);

  const rows = [...playerIds]
    .filter((playerId) => squadIds.has(playerId))
    .map((playerId) => {
      const summary = (summaries ?? []).find(
        (row) => Number(row.player_id) === playerId
      );
      const club = clubByPlayer.get(playerId);
      return {
        player_id: playerId,
        match_rating:
          summary?.match_rating != null && Number(summary.match_rating) > 0
            ? Number(summary.match_rating)
            : null,
        is_mvp: Boolean(summary?.is_mvp),
        goals: club?.goals ?? 0,
        assists: club?.assists ?? 0,
      };
    })
    .filter(
      (row) =>
        row.match_rating != null ||
        row.is_mvp ||
        row.goals > 0 ||
        row.assists > 0
    );

  return rows;
}

async function syncSeasonPrizesAfterStats(
  db: SupabaseClient,
  championshipId: number
) {
  try {
    const [{ data: champ }, { data: homeTeam }] = await Promise.all([
      db.from("championships").select("season").eq("id", championshipId).maybeSingle(),
      db
        .from("championship_teams")
        .select("id")
        .eq("name", "Дженгутай")
        .maybeSingle(),
    ]);
    const { syncSeasonPrizeUnlocks } = await import(
      "@/lib/championship/seasonAwards"
    );
    await syncSeasonPrizeUnlocks(db, {
      championshipId,
      season: champ?.season ?? "сезон",
      homeTeamId: homeTeam?.id ?? null,
    });
  } catch {
    // таблицы призов могут ещё не быть созданы
  }
}

async function rollbackChampionshipMatchXp(
  db: SupabaseClient,
  matchId: number,
  championshipId: number
) {
  const { data: logs } = await db
    .from("championship_match_xp_log")
    .select("player_id, xp_gained, match_rating, level_before")
    .eq("match_id", matchId);

  for (const log of logs ?? []) {
    const playerId = Number(log.player_id);
    const { data: progress } = await db
      .from("championship_player_progress")
      .select("*")
      .eq("championship_id", championshipId)
      .eq("player_id", playerId)
      .maybeSingle();

    if (!progress) continue;

    const nextXp = Math.max(
      0,
      Number(progress.season_xp ?? 0) - (Number(log.xp_gained) || 0)
    );
    const derived = deriveLevelFromTotalXp(nextXp);
    const prevLevel = Number(progress.season_level ?? 1);
    const levelsLost = Math.max(0, prevLevel - derived.level);
    let ratingSum = Number(progress.rating_sum ?? 0);
    let ratingCount = Number(progress.rating_count ?? 0);

    if (
      log.match_rating != null &&
      Number(log.match_rating) > 0 &&
      ratingCount > 0
    ) {
      ratingSum = Math.max(0, ratingSum - Number(log.match_rating));
      ratingCount = Math.max(0, ratingCount - 1);
    }

    await db
      .from("championship_player_progress")
      .update({
        season_xp: nextXp,
        season_level: derived.level,
        season_cards: Math.max(
          0,
          Number(progress.season_cards ?? 0) - levelsLost
        ),
        season_rating:
          ratingCount > 0
            ? Math.round((ratingSum / ratingCount) * 10) / 10
            : 0,
        rating_sum: ratingSum,
        rating_count: ratingCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", progress.id);
  }

  await db.from("championship_match_xp_log").delete().eq("match_id", matchId);
  await db
    .from("championship_season_cards")
    .delete()
    .filter("meta->>match_id", "eq", String(matchId));
  await db
    .from("championship_matches")
    .update({ tour_results_applied: false })
    .eq("id", matchId);
}

/** Синхронизирует голы/пас/рейтинг из обычного матча в статистику чемпионата. */
export async function mergeClubMatchStatsIntoChampionship(
  db: SupabaseClient,
  ordinaryMatchId: number,
  options?: {
    reapplyXp?: boolean;
    skipSeasonRecalc?: boolean;
    skipPrizeSync?: boolean;
  }
): Promise<{ synced: boolean; championshipMatchId: number | null }> {
  const reapplyXp = options?.reapplyXp ?? false;
  const skipSeasonRecalc = options?.skipSeasonRecalc ?? false;
  const skipPrizeSync = options?.skipPrizeSync ?? false;

  const { data: ordinaryMatch } = await db
    .from("matches")
    .select("id, opponent, date, time")
    .eq("id", ordinaryMatchId)
    .maybeSingle();

  const linked = await findChampionshipMatchForVoting(db, ordinaryMatch);
  if (!linked) return { synced: false, championshipMatchId: null };

  const { data: squadRows } = await db
    .from("championship_player_season_stats")
    .select("player_id")
    .eq("championship_id", linked.championshipId)
    .eq("team_id", linked.teamId);

  const squadIds = new Set(
    (squadRows ?? [])
      .map((row) => Number(row.player_id))
      .filter((id) => Number.isFinite(id) && id > 0)
  );

  if (squadIds.size === 0) {
    return { synced: false, championshipMatchId: linked.championshipMatchId };
  }

  const lines = await loadClubMatchStatLines(db, ordinaryMatchId, squadIds);
  if (lines.length === 0) {
    return { synced: false, championshipMatchId: linked.championshipMatchId };
  }

  const rows = lines.map((line) => ({
    match_id: linked.championshipMatchId,
    player_id: line.player_id,
    team_id: linked.teamId,
    goals: line.goals,
    assists: line.assists,
    match_rating: line.match_rating,
    is_mvp: line.is_mvp,
  }));

  const { error } = await db
    .from("championship_match_player_stats")
    .upsert(rows, { onConflict: "match_id,player_id" });

  if (error) throw error;

  if (!skipSeasonRecalc) {
    await recalculateChampionshipSeasonStats(db, linked.championshipId);
  }
  if (!skipPrizeSync) {
    await syncSeasonPrizesAfterStats(db, linked.championshipId);
  }

  if (reapplyXp) {
    await rollbackChampionshipMatchXp(
      db,
      linked.championshipMatchId,
      linked.championshipId
    );
    const applied = await applyChampionshipTourResults(
      db,
      linked.championshipMatchId
    );
    if (!applied.ok) throw new Error(applied.error);
  }

  return { synced: true, championshipMatchId: linked.championshipMatchId };
}

/** Подтягивает статистику по всем сыгранным матчам клуба в активном чемпионате. */
export async function backfillChampionshipStatsFromClubMatches(
  db: SupabaseClient,
  championshipId: number
): Promise<void> {
  const { data: homeClubTeam } = await db
    .from("championship_teams")
    .select("id")
    .eq("name", "Дженгутай")
    .maybeSingle();

  if (!homeClubTeam) return;

  const { data: ourMatches } = await db
    .from("championship_matches")
    .select(
      "id, match_date, match_time, home_team_id, away_team_id, home_team:championship_teams!championship_matches_home_team_id_fkey(name), away_team:championship_teams!championship_matches_away_team_id_fkey(name)"
    )
    .eq("championship_id", championshipId)
    .eq("is_played", true)
    .or(
      `home_team_id.eq.${homeClubTeam.id},away_team_id.eq.${homeClubTeam.id}`
    );

  for (const match of ourMatches ?? []) {
    const weAreHome = Number(match.home_team_id) === Number(homeClubTeam.id);
    const opponentTeam = one(
      (weAreHome ? match.away_team : match.home_team) as
        | TeamRef
        | TeamRef[]
        | null
    );
    if (!opponentTeam?.name) continue;

    const { data: ordinaryMatch } = await db
      .from("matches")
      .select("id")
      .eq("date", match.match_date)
      .eq("time", match.match_time || "18:00")
      .eq("opponent", opponentTeam.name)
      .maybeSingle();

    if (ordinaryMatch) {
      await mergeClubMatchStatsIntoChampionship(db, Number(ordinaryMatch.id), {
        reapplyXp: false,
        skipSeasonRecalc: true,
        skipPrizeSync: true,
      });
    }
  }

  await recalculateChampionshipSeasonStats(db, championshipId);
}

export async function syncChampionshipProgressFromMatchRatings(
  db: SupabaseClient,
  ordinaryMatchId: number
): Promise<{ synced: boolean; championshipMatchId: number | null }> {
  return mergeClubMatchStatsIntoChampionship(db, ordinaryMatchId, {
    reapplyXp: true,
  });
}
