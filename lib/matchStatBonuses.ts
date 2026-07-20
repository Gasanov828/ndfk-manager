/** Бонус ★ за гол (до 3 голов за матч) */
export const GOAL_RATING_BONUS = 0.05;
export const GOAL_RATING_BONUS_MAX = 0.15;

/** Бонус ★ за ассист (до 3 за матч) */
export const ASSIST_RATING_BONUS = 0.03;
export const ASSIST_RATING_BONUS_MAX = 0.09;

/** Бонус ★ за сейв вратаря (до 6 за матч) */
export const SAVE_RATING_BONUS = 0.02;
export const SAVE_RATING_BONUS_MAX = 0.12;

/** Общий потолок бонуса от статистики за матч */
export const MATCH_STAT_BONUS_CAP = 0.2;

export type MatchStatCounts = {
  goals?: number;
  assists?: number;
  saves?: number;
};

export function computeMatchStatBonus(stats: MatchStatCounts): number {
  const goalsBonus = Math.min(
    Math.max(0, stats.goals ?? 0) * GOAL_RATING_BONUS,
    GOAL_RATING_BONUS_MAX
  );
  const assistsBonus = Math.min(
    Math.max(0, stats.assists ?? 0) * ASSIST_RATING_BONUS,
    ASSIST_RATING_BONUS_MAX
  );
  const savesBonus = Math.min(
    Math.max(0, stats.saves ?? 0) * SAVE_RATING_BONUS,
    SAVE_RATING_BONUS_MAX
  );

  const total = goalsBonus + assistsBonus + savesBonus;
  return Math.round(Math.min(total, MATCH_STAT_BONUS_CAP) * 10) / 10;
}

export function applyStatBonusToRating(rating: number, bonus: number): number {
  if (bonus <= 0) return rating;
  return Math.min(
    99,
    Math.max(1, Math.round((rating + bonus) * 10) / 10)
  );
}

export function formatStatBonusLabel(bonus: number): string {
  if (bonus <= 0) return "";
  return bonus % 1 === 0 ? `+${bonus}` : `+${bonus.toFixed(1)}`;
}
