import {
  getMatchVotingDeadline,
  isVotingDeadlinePassed,
  type MatchMvpInfo,
  type RatingVotingMatch,
} from "@/lib/matchRatings";

/** Большая карточка MVP — 3 дня после закрытия голосования */
export const HOME_MVP_FEATURED_DAYS = 3;
/** После 3 дней карточку полностью убираем с главной */
export const HOME_MVP_VISIBLE_DAYS = 3;

export type HomeMvpDisplayMode = "hidden" | "featured" | "compact";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Когда MVP можно показывать на главной и в каком виде.
 * Якорь — момент закрытия голосования (12ч после матча).
 */
export function getHomeMvpDisplayMode(params: {
  isLive: boolean;
  mvp: Pick<MatchMvpInfo, "isConfirmedMvp"> | null;
  match: RatingVotingMatch | null;
  now?: Date;
}): HomeMvpDisplayMode {
  const { isLive, mvp, match } = params;
  if (isLive || !mvp?.isConfirmedMvp || !match) return "hidden";
  if (!isVotingDeadlinePassed(match)) return "hidden";

  const endedAt = getMatchVotingDeadline(match);
  if (!endedAt) return "hidden";

  const now = params.now ?? new Date();
  const ageMs = now.getTime() - endedAt.getTime();
  if (ageMs < 0) return "hidden";

  const ageDays = ageMs / MS_PER_DAY;
  if (ageDays < HOME_MVP_FEATURED_DAYS) return "featured";
  if (ageDays < HOME_MVP_VISIBLE_DAYS) return "compact";
  return "hidden";
}
