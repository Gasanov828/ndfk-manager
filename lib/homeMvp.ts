import {
  getMatchVotingDeadline,
  isVotingDeadlinePassed,
  type MatchMvpInfo,
  type RatingVotingMatch,
} from "@/lib/matchRatings";

/** После закрытия голосования MVP на главной держим 3 дня */
export const HOME_MVP_FEATURED_DAYS = 3;

export type HomeMvpDisplayMode = "hidden" | "featured" | "compact";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Сценарий:
 * 1) Пока голосование открыто (24ч) — MVP на главной скрыт (светится только кнопка оценок).
 * 2) После закрытия голосования — показываем MVP 3 дня.
 * 3) Потом снова скрываем.
 */
export function getHomeMvpDisplayMode(params: {
  isLive: boolean;
  mvp: Pick<MatchMvpInfo, "isConfirmedMvp"> | null;
  match: RatingVotingMatch | null;
  now?: Date;
}): HomeMvpDisplayMode {
  const { isLive, mvp, match } = params;
  if (isLive || !mvp || !match) return "hidden";

  // Пока 24ч голосования ещё идут — MVP не показываем
  if (!isVotingDeadlinePassed(match)) return "hidden";

  const endedAt = getMatchVotingDeadline(match);
  if (!endedAt) return "hidden";

  const now = params.now ?? new Date();
  const ageMs = now.getTime() - endedAt.getTime();
  if (ageMs < 0) return "hidden";

  const ageDays = ageMs / MS_PER_DAY;
  if (ageDays >= HOME_MVP_FEATURED_DAYS) return "hidden";

  return "featured";
}
