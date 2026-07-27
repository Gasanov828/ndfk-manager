/**
 * Shared types for the post-match gamification layer (season averages, career
 * XP/levels/titles and achievements). Everything downstream is derived
 * deterministically from a player's rated-match history so the pipeline stays
 * idempotent (recalc runs on every vote).
 */

/** One match in which the player received at least one rating vote. */
export type RatedMatchEntry = {
  matchId: number;
  season: number;
  date: string;
  /** Average received rating for this match, 1–10. */
  matchRating: number;
  voteCount: number;
  isMvp: boolean;
  goals: number;
  assists: number;
  saves: number;
};

export type SeasonStat = {
  season: number;
  matchesRated: number;
  sumRating: number;
  avgRating: number;
};

/** Aggregated, deterministic view of a player used by every evaluator. */
export type PlayerGamificationStats = {
  playerId: number;
  /** Only matches with voteCount > 0, sorted by date descending. */
  ratedMatches: RatedMatchEntry[];
  matchesRated: number;
  mvpCount: number;
  bestRating: number;
  careerAvg: number;
  perfectCount: number;
  greatCount: number;
  /** Consecutive most-recent rated matches with rating >= 7. */
  goodStreak: number;
  totalGoals: number;
  totalAssists: number;
  totalSaves: number;
  seasons: SeasonStat[];
  bestSeasonAvg: number;
};
