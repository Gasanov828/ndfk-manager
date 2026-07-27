import { computeSeasonStats } from "@/lib/gamification/season";
import type {
  PlayerGamificationStats,
  RatedMatchEntry,
} from "@/lib/gamification/types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Build the aggregated, deterministic stats view for a single player.
 *
 * `entries` should contain every match the player participated in (stat totals
 * are summed across all of them); rating-derived metrics only use matches that
 * actually received votes.
 */
export function buildPlayerStats(
  playerId: number,
  entries: RatedMatchEntry[]
): PlayerGamificationStats {
  const rated = entries
    .filter((entry) => entry.voteCount > 0)
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        b.matchId - a.matchId
    );

  const matchesRated = rated.length;
  const sum = rated.reduce((acc, entry) => acc + entry.matchRating, 0);

  let goodStreak = 0;
  for (const entry of rated) {
    if (entry.matchRating >= 7) goodStreak += 1;
    else break;
  }

  const seasons = computeSeasonStats(rated);

  return {
    playerId,
    ratedMatches: rated,
    matchesRated,
    mvpCount: rated.filter((entry) => entry.isMvp).length,
    bestRating: rated.reduce((max, entry) => Math.max(max, entry.matchRating), 0),
    careerAvg: matchesRated > 0 ? round2(sum / matchesRated) : 0,
    perfectCount: rated.filter((entry) => entry.matchRating >= 10).length,
    greatCount: rated.filter((entry) => entry.matchRating >= 9).length,
    goodStreak,
    totalGoals: entries.reduce((acc, entry) => acc + entry.goals, 0),
    totalAssists: entries.reduce((acc, entry) => acc + entry.assists, 0),
    totalSaves: entries.reduce((acc, entry) => acc + entry.saves, 0),
    seasons,
    bestSeasonAvg: seasons.reduce((max, s) => Math.max(max, s.avgRating), 0),
  };
}
