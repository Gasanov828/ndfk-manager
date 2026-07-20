import { score10ToOverallDelta } from "@/lib/matchRatings";

/** Небольшое изменение ★ от звёзд (большинство игроков) */
export const MATCH_STAR_MAX_DELTA = 0.12;

/** Дополнительно игроку матча (MVP по голосам) */
export const MATCH_MVP_BONUS = 0.1;

/** Бонус лучшему бомбардиру (при ничьей — всем с max голов) */
export const MATCH_TOP_GOALSCORER_BONUS = 0.15;

/** За каждый гол */
export const MATCH_GOAL_BONUS_EACH = 0.04;

/** Бонус лидеру по ассистам */
export const MATCH_TOP_ASSIST_BONUS = 0.1;

/** За каждый ассист */
export const MATCH_ASSIST_BONUS_EACH = 0.03;

/** За сейв вратаря */
export const MATCH_SAVE_BONUS_EACH = 0.02;
export const MATCH_SAVE_BONUS_MAX = 0.08;

/** Потолок прироста ★ за один матч */
export const MATCH_RATING_GAIN_CAP = 0.35;

/** Максимальный штраф от низких оценок */
export const MATCH_RATING_LOSS_CAP = 0.12;

export type MatchStatCounts = {
  goals?: number;
  assists?: number;
  saves?: number;
};

export type MatchPlayerRatingInput = {
  ratingBefore: number;
  avgStars: number | null;
  voteCount: number;
  isMvp: boolean;
  goals: number;
  assists: number;
  saves: number;
  maxGoalsInMatch: number;
  maxAssistsInMatch: number;
};

export function computeMatchMaxStats(
  statsMap: Record<number, MatchStatCounts>,
  participantIds: number[]
): { maxGoals: number; maxAssists: number } {
  let maxGoals = 0;
  let maxAssists = 0;

  for (const id of participantIds) {
    const stats = statsMap[id];
    if (!stats) continue;
    maxGoals = Math.max(maxGoals, stats.goals ?? 0);
    maxAssists = Math.max(maxAssists, stats.assists ?? 0);
  }

  return { maxGoals, maxAssists };
}

export function hasMatchStatActivity(stats: MatchStatCounts): boolean {
  return (stats.goals ?? 0) > 0 || (stats.assists ?? 0) > 0 || (stats.saves ?? 0) > 0;
}

export function shouldApplyMatchRatings(params: {
  isPlayed: boolean;
  voteCount: number;
  hasStatActivity: boolean;
}): boolean {
  return params.isPlayed && (params.voteCount > 0 || params.hasStatActivity);
}

export function computeMatchRatingDelta(input: MatchPlayerRatingInput): number {
  let delta = 0;

  if (input.avgStars != null && input.voteCount > 0) {
    delta += score10ToOverallDelta(input.avgStars, MATCH_STAR_MAX_DELTA);
  }

  if (input.isMvp && input.voteCount > 0) {
    delta += MATCH_MVP_BONUS;
  }

  if (input.goals > 0) {
    if (input.maxGoalsInMatch > 0 && input.goals === input.maxGoalsInMatch) {
      delta += MATCH_TOP_GOALSCORER_BONUS;
    }
    delta += input.goals * MATCH_GOAL_BONUS_EACH;
  }

  if (input.assists > 0) {
    if (input.maxAssistsInMatch > 0 && input.assists === input.maxAssistsInMatch) {
      delta += MATCH_TOP_ASSIST_BONUS;
    }
    delta += input.assists * MATCH_ASSIST_BONUS_EACH;
  }

  if (input.saves > 0) {
    delta += Math.min(
      input.saves * MATCH_SAVE_BONUS_EACH,
      MATCH_SAVE_BONUS_MAX
    );
  }

  if (delta > 0) {
    delta = Math.min(delta, MATCH_RATING_GAIN_CAP);
  } else if (delta < 0) {
    delta = Math.max(delta, -MATCH_RATING_LOSS_CAP);
  }

  return Math.round(delta * 10) / 10;
}

export function computeMatchPlayerRatingAfter(
  input: MatchPlayerRatingInput
): number {
  const next = input.ratingBefore + computeMatchRatingDelta(input);
  return Math.min(99, Math.max(1, Math.round(next * 10) / 10));
}

export function formatMatchRatingDeltaLabel(delta: number): string {
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : String(delta);
}
