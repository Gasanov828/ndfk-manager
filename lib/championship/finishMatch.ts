import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveLevelFromTotalXp } from "@/lib/championship/progressFormula";
import { applyChampionshipTourResults } from "@/lib/championship/tourResults";

export type ChampionshipPlayerLine = {
  playerId: number;
  teamId: number;
  goals?: number;
  assists?: number;
  isMvp?: boolean;
  matchRating?: number | null;
  redCards?: number;
};

/**
 * Завершает матч чемпионата:
 * 1) сезонная статистика чемпионата
 * 2) дельта голов/пасов в карьеру
 * 3) итоги тура: XP / уровень / рейтинг сезона
 */
export async function finishChampionshipMatch(
  db: SupabaseClient,
  params: {
    matchId: number;
    homeGoals: number;
    awayGoals: number;
    lines: ChampionshipPlayerLine[];
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { matchId, homeGoals, awayGoals, lines } = params;

  const { data: match, error: matchError } = await db
    .from("championship_matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    return { ok: false, error: matchError?.message ?? "Матч не найден" };
  }

  const { data: previousLines } = await db
    .from("championship_match_player_stats")
    .select("player_id, goals, assists")
    .eq("match_id", matchId);

  const prevMap = new Map<number, { goals: number; assists: number }>();
  for (const row of previousLines ?? []) {
    prevMap.set(Number(row.player_id), {
      goals: Number(row.goals) || 0,
      assists: Number(row.assists) || 0,
    });
  }

  if (match.tour_results_applied) {
    await rollbackMatchXp(db, matchId, Number(match.championship_id));
  }

  const { error: updateError } = await db
    .from("championship_matches")
    .update({
      home_goals: homeGoals,
      away_goals: awayGoals,
      is_played: true,
      is_live: false,
      tour_results_applied: false,
    })
    .eq("id", matchId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await db
    .from("championship_match_player_stats")
    .delete()
    .eq("match_id", matchId);

  if (lines.length > 0) {
    const { error: insertError } = await db
      .from("championship_match_player_stats")
      .insert(
        lines.map((line) => ({
          match_id: matchId,
          player_id: line.playerId,
          team_id: line.teamId,
          goals: Math.max(0, line.goals ?? 0),
          assists: Math.max(0, line.assists ?? 0),
          is_mvp: Boolean(line.isMvp),
          match_rating:
            line.matchRating != null && Number.isFinite(line.matchRating)
              ? line.matchRating
              : null,
          red_cards: Math.max(0, line.redCards ?? 0),
        }))
      );
    if (insertError) {
      // без колонки red_cards — повтор без неё
      if (insertError.message?.includes("red_cards")) {
        const retry = await db.from("championship_match_player_stats").insert(
          lines.map((line) => ({
            match_id: matchId,
            player_id: line.playerId,
            team_id: line.teamId,
            goals: Math.max(0, line.goals ?? 0),
            assists: Math.max(0, line.assists ?? 0),
            is_mvp: Boolean(line.isMvp),
            match_rating:
              line.matchRating != null && Number.isFinite(line.matchRating)
                ? line.matchRating
                : null,
          }))
        );
        if (retry.error) {
          return { ok: false, error: retry.error.message };
        }
      } else {
        return { ok: false, error: insertError.message };
      }
    }
  }

  await recalculateChampionshipSeasonStats(db, Number(match.championship_id));

  const careerDelta = new Map<number, { goals: number; assists: number }>();
  const touched = new Set<number>([
    ...prevMap.keys(),
    ...lines.map((line) => line.playerId),
  ]);
  for (const playerId of touched) {
    const prev = prevMap.get(playerId) ?? { goals: 0, assists: 0 };
    const nextLine = lines.find((line) => line.playerId === playerId);
    const next = {
      goals: Math.max(0, nextLine?.goals ?? 0),
      assists: Math.max(0, nextLine?.assists ?? 0),
    };
    const dg = next.goals - prev.goals;
    const da = next.assists - prev.assists;
    if (dg !== 0 || da !== 0) {
      careerDelta.set(playerId, { goals: dg, assists: da });
    }
  }
  await applyCareerDelta(db, careerDelta);

  const tour = await applyChampionshipTourResults(db, matchId);
  if (!tour.ok) {
    return { ok: false, error: tour.error };
  }

  // Постоянные награды чемпионата → карьера игроков и клуба
  try {
    const { syncAllChampionshipCareerAwards } = await import(
      "@/lib/championship/careerAwards"
    );
    const championshipId = Number(match.championship_id);
    const { data: champ } = await db
      .from("championships")
      .select("season")
      .eq("id", championshipId)
      .maybeSingle();
    const { data: homeTeam } = await db
      .from("championship_teams")
      .select("id")
      .eq("name", "Дженгутай")
      .maybeSingle();

    await syncAllChampionshipCareerAwards(db, {
      championshipId,
      season: champ?.season ?? "сезон",
      homeTeamId: homeTeam?.id ?? null,
      matchId,
      homeGoals,
      awayGoals,
      homeTeamMatchId: Number(match.home_team_id),
      awayTeamMatchId: Number(match.away_team_id),
      lines: lines.map((line) => ({
        playerId: line.playerId,
        teamId: line.teamId,
        goals: Math.max(0, line.goals ?? 0),
        assists: Math.max(0, line.assists ?? 0),
        isMvp: Boolean(line.isMvp),
        matchRating:
          line.matchRating != null && Number.isFinite(line.matchRating)
            ? Number(line.matchRating)
            : null,
      })),
    });

    const { syncSeasonPrizeUnlocks } = await import(
      "@/lib/championship/seasonAwards"
    );
    await syncSeasonPrizeUnlocks(db, {
      championshipId,
      season: champ?.season ?? "сезон",
      homeTeamId: homeTeam?.id ?? null,
    });
  } catch {
    // таблицы career awards / prizes могут ещё не быть созданы
  }

  return { ok: true };
}

async function rollbackMatchXp(
  db: SupabaseClient,
  matchId: number,
  championshipId: number
) {
  const { data: logs } = await db
    .from("championship_match_xp_log")
    .select("player_id, xp_gained, match_rating")
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
      Number(progress.season_xp) - (Number(log.xp_gained) || 0)
    );
    const prevLevel = Number(progress.season_level);
    const derived = deriveLevelFromTotalXp(nextXp);
    const levelsLost = Math.max(0, prevLevel - derived.level);
    let ratingSum = Number(progress.rating_sum);
    let ratingCount = Number(progress.rating_count);
    if (
      log.match_rating != null &&
      Number(log.match_rating) > 0 &&
      ratingCount > 0
    ) {
      ratingSum = Math.max(0, ratingSum - Number(log.match_rating));
      ratingCount = Math.max(0, ratingCount - 1);
    }
    const seasonRating =
      ratingCount > 0
        ? Math.round((ratingSum / ratingCount) * 10) / 10
        : 0;

    await db
      .from("championship_player_progress")
      .update({
        season_xp: nextXp,
        season_level: derived.level,
        season_cards: Math.max(
          0,
          Number(progress.season_cards ?? 0) - levelsLost
        ),
        season_rating: seasonRating,
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
}

export async function recalculateChampionshipSeasonStats(
  db: SupabaseClient,
  championshipId: number
) {
  const { data: matchRows } = await db
    .from("championship_matches")
    .select("id")
    .eq("championship_id", championshipId)
    .eq("is_played", true);

  const matchIds = (matchRows ?? []).map((row) => Number(row.id));

  type DetailedRow = {
    match_id: number;
    player_id: number;
    team_id: number;
    goals: number;
    assists: number;
    is_mvp: boolean;
    match_rating: number | null;
  };

  const { data: detailed } =
    matchIds.length > 0
      ? await db
          .from("championship_match_player_stats")
          .select(
            "match_id, player_id, team_id, goals, assists, is_mvp, match_rating"
          )
          .in("match_id", matchIds)
      : { data: [] as DetailedRow[] };

  const totals = new Map<
    number,
    {
      teamId: number;
      matches: Set<number>;
      goals: number;
      assists: number;
      mvp: number;
      ratingSum: number;
      ratingCount: number;
    }
  >();

  for (const row of (detailed ?? []) as DetailedRow[]) {
    const playerId = Number(row.player_id);
    const current = totals.get(playerId) ?? {
      teamId: Number(row.team_id),
      matches: new Set<number>(),
      goals: 0,
      assists: 0,
      mvp: 0,
      ratingSum: 0,
      ratingCount: 0,
    };
    current.matches.add(Number(row.match_id));
    current.goals += Number(row.goals) || 0;
    current.assists += Number(row.assists) || 0;
    if (row.is_mvp) current.mvp += 1;
    if (row.match_rating != null && Number(row.match_rating) > 0) {
      current.ratingSum += Number(row.match_rating);
      current.ratingCount += 1;
    }
    current.teamId = Number(row.team_id);
    totals.set(playerId, current);
  }

  const { data: existing } = await db
    .from("championship_player_season_stats")
    .select("id, player_id, team_id")
    .eq("championship_id", championshipId);

  for (const row of existing ?? []) {
    const next = totals.get(Number(row.player_id));
    await db
      .from("championship_player_season_stats")
      .update({
        matches_played: next?.matches.size ?? 0,
        goals: next?.goals ?? 0,
        assists: next?.assists ?? 0,
        mvp_count: next?.mvp ?? 0,
        rating_sum: next?.ratingSum ?? 0,
        rating_count: next?.ratingCount ?? 0,
        team_id: next?.teamId ?? row.team_id,
      })
      .eq("id", row.id);
  }

  for (const [playerId, next] of totals) {
    const has = (existing ?? []).some(
      (row) => Number(row.player_id) === playerId
    );
    if (has) continue;
    await db.from("championship_player_season_stats").insert({
      championship_id: championshipId,
      player_id: playerId,
      team_id: next.teamId,
      matches_played: next.matches.size,
      goals: next.goals,
      assists: next.assists,
      mvp_count: next.mvp,
      rating_sum: next.ratingSum,
      rating_count: next.ratingCount,
    });
  }
}

async function applyCareerDelta(
  db: SupabaseClient,
  deltas: Map<number, { goals: number; assists: number }>
) {
  for (const [playerId, delta] of deltas) {
    const { data: player } = await db
      .from("players")
      .select("id, goals, assists")
      .eq("id", playerId)
      .maybeSingle();
    if (!player) continue;

    await db
      .from("players")
      .update({
        goals: Math.max(0, (Number(player.goals) || 0) + delta.goals),
        assists: Math.max(0, (Number(player.assists) || 0) + delta.assists),
      })
      .eq("id", playerId);
  }
}
