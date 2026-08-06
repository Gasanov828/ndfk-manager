import type { SupabaseClient } from "@supabase/supabase-js";
import { getPositionGroup } from "@/lib/positionStyles";
import {
  isVotingDeadlinePassed,
  normalizeVoteScore,
} from "@/lib/matchRatings";
import { sortMatchesByDate, type Match } from "@/lib/matches";
import type { PlayerAchievementStats } from "@/lib/achievements/types";

function emptyStats(
  positionGroup: PlayerAchievementStats["positionGroup"]
): PlayerAchievementStats {
  return {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    goals: 0,
    assists: 0,
    mvpCount: 0,
    avgMatchRating: 0,
    bestMatchRating: 0,
    ovr: 0,
    tackles: 0,
    interceptions: 0,
    cleanSheets: 0,
    consecutiveMatches: 0,
    winStreak: 0,
    clubMatches: 0,
    reactionForm: 0,
    reactionMachine: 0,
    reactionAccurate: 0,
    reactionWall: 0,
    reactionSoul: 0,
    positionGroup,
  };
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * Собирает все метрики игрока для системы достижений.
 * Средняя оценка сезона = среднее match_rating по закрытым голосованиям.
 */
export async function buildPlayerAchievementStats(
  playerId: number,
  db: SupabaseClient
): Promise<PlayerAchievementStats> {
  const { data: player } = await db
    .from("players")
    .select("id, position, rating, goals, assists")
    .eq("id", playerId)
    .maybeSingle();

  const positionGroup = player
    ? getPositionGroup(null, player.position)
    : null;

  const stats = emptyStats(positionGroup);
  if (!player) return stats;

  stats.ovr = Number(player.rating) || 0;
  stats.goals = Number(player.goals) || 0;
  stats.assists = Number(player.assists) || 0;

  const { data: matches } = await db
    .from("matches")
    .select(
      "id, opponent, date, time, is_played, ndfk_goals, opponent_goals, rating_voting_ends_at"
    )
    .eq("is_played", true);

  const playedMatches = sortMatchesByDate((matches ?? []) as Match[]);

  const { data: participation } = await db
    .from("match_player_participation")
    .select("match_id, participated")
    .eq("player_id", playerId);

  const participated = new Set<number>();
  if (participation && participation.length > 0) {
    for (const row of participation) {
      if (row.participated) participated.add(row.match_id);
    }
  } else {
    // нет таблицы участия — считаем все сыгранные матчи
    for (const match of playedMatches) participated.add(match.id);
  }

  let matchStats: Array<{
    match_id: number;
    goals: number;
    assists: number;
    saves?: number;
    tackles?: number;
    interceptions?: number;
  }> | null = null;

  {
    const first = await db
      .from("match_player_stats")
      .select("match_id, goals, assists, saves, tackles, interceptions")
      .eq("player_id", playerId);

    if (first.error?.message?.includes("tackles") || first.error?.message?.includes("interceptions")) {
      const fallback = await db
        .from("match_player_stats")
        .select("match_id, goals, assists, saves")
        .eq("player_id", playerId);
      matchStats = fallback.data;
    } else {
      matchStats = first.data;
    }
  }

  let tackles = 0;
  let interceptions = 0;
  let goalsFromMatches = 0;
  let assistsFromMatches = 0;
  const statsByMatch = new Map<number, { goals: number; assists: number }>();

  for (const row of matchStats ?? []) {
    tackles += Number((row as { tackles?: number }).tackles) || 0;
    interceptions += Number((row as { interceptions?: number }).interceptions) || 0;
    goalsFromMatches += Number(row.goals) || 0;
    assistsFromMatches += Number(row.assists) || 0;
    statsByMatch.set(row.match_id, {
      goals: Number(row.goals) || 0,
      assists: Number(row.assists) || 0,
    });
  }

  stats.tackles = tackles;
  stats.interceptions = interceptions;
  // totals on players row preferred; fallback to sum of match stats
  if (stats.goals <= 0 && goalsFromMatches > 0) stats.goals = goalsFromMatches;
  if (stats.assists <= 0 && assistsFromMatches > 0) {
    stats.assists = assistsFromMatches;
  }

  const { data: summaries } = await db
    .from("match_player_rating_summary")
    .select(
      "match_id, match_rating, vote_count, is_mvp, match:matches(date, time, is_played, rating_voting_ends_at, opponent_goals)"
    )
    .eq("player_id", playerId);

  const ratingValues: number[] = [];
  let mvpCount = 0;
  let best = 0;

  for (const row of summaries ?? []) {
    const match = one(
      row.match as
        | {
            date: string;
            time?: string;
            is_played?: boolean;
            rating_voting_ends_at?: string | null;
            opponent_goals?: number | null;
          }
        | {
            date: string;
            time?: string;
            is_played?: boolean;
            rating_voting_ends_at?: string | null;
            opponent_goals?: number | null;
          }[]
        | null
    );
    if (!match) continue;

    const closed = isVotingDeadlinePassed({
      date: match.date,
      time: match.time || "00:00",
      is_played: Boolean(match.is_played),
      rating_voting_ends_at: match.rating_voting_ends_at ?? null,
    });
    if (!closed || (row.vote_count ?? 0) <= 0) continue;

    const rating = normalizeVoteScore(Number(row.match_rating) || 0);
    ratingValues.push(rating);
    if (rating > best) best = rating;
    if (row.is_mvp) mvpCount += 1;
  }

  stats.mvpCount = mvpCount;
  stats.bestMatchRating = best;
  stats.avgMatchRating =
    ratingValues.length > 0
      ? Math.round(
          (ratingValues.reduce((sum, value) => sum + value, 0) /
            ratingValues.length) *
            10
        ) / 10
      : 0;

  let matchesPlayed = 0;
  let wins = 0;
  let losses = 0;
  let cleanSheets = 0;

  for (const match of playedMatches) {
    if (!participated.has(match.id)) continue;
    if (match.ndfk_goals == null || match.opponent_goals == null) continue;

    matchesPlayed += 1;
    if (match.ndfk_goals > match.opponent_goals) wins += 1;
    else if (match.ndfk_goals < match.opponent_goals) losses += 1;

    if (positionGroup === "ВРТ" && match.opponent_goals === 0) {
      cleanSheets += 1;
    }
  }

  stats.matchesPlayed = matchesPlayed;
  stats.clubMatches = matchesPlayed;
  stats.wins = wins;
  stats.losses = losses;
  stats.cleanSheets = cleanSheets;

  // consecutive participation from newest
  let consecutive = 0;
  for (const match of playedMatches) {
    if (participated.has(match.id)) consecutive += 1;
    else break;
  }
  stats.consecutiveMatches = consecutive;

  // personal win streak from newest participated matches
  let winStreak = 0;
  for (const match of playedMatches) {
    if (!participated.has(match.id)) continue;
    if (match.ndfk_goals == null || match.opponent_goals == null) break;
    if (match.ndfk_goals > match.opponent_goals) winStreak += 1;
    else break;
  }
  stats.winStreak = winStreak;

  const { data: reactionTotals } = await db
    .from("player_reaction_totals")
    .select("reaction_code, count")
    .eq("player_id", playerId);

  for (const row of reactionTotals ?? []) {
    const count = Number(row.count) || 0;
    switch (row.reaction_code) {
      case "form":
        stats.reactionForm = count;
        break;
      case "machine":
        stats.reactionMachine = count;
        break;
      case "accurate":
        stats.reactionAccurate = count;
        break;
      case "wall":
        stats.reactionWall = count;
        break;
      case "soul":
        stats.reactionSoul = count;
        break;
      default:
        break;
    }
  }

  return stats;
}
