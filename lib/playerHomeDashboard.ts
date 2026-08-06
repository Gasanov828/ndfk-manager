import { formatMatchDate, type Match } from "@/lib/matches";
import { getMatchDateTime } from "@/lib/matchCountdown";
import { formatVoteScore, isVotingDeadlinePassed, type MatchMvpInfo } from "@/lib/matchRatings";
import type { PlayerWelcomeData } from "@/lib/playerStats";

export type FormRatingPoint = {
  matchId: number;
  rating: number;
  opponent: string;
  date: string;
  shortLabel: string;
};

export type PlayerHomeAchievement = {
  id: string;
  icon: string;
  title: string;
  detail: string;
};

export type RatingSummaryRow = {
  match_id: number;
  match_rating: number;
  vote_count: number;
  is_mvp: boolean;
  rating_before?: number | null;
  rating_after?: number | null;
  match:
    | {
        opponent: string;
        date: string;
        time?: string | null;
        is_played?: boolean | null;
        rating_voting_ends_at?: string | null;
      }
    | {
        opponent: string;
        date: string;
        time?: string | null;
        is_played?: boolean | null;
        rating_voting_ends_at?: string | null;
      }[]
    | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function shortDateLabel(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [, month, day] = date.split("-");
    return `${day}.${month}`;
  }
  return date.slice(0, 5);
}

/** Последние закрытые оценки матча (хронологически слева направо). */
export function buildFormRatingsFromRows(
  rows: RatingSummaryRow[],
  limit = 6
): FormRatingPoint[] {
  const points: FormRatingPoint[] = [];

  for (const row of rows) {
    const match = one(row.match);
    if (!match) continue;
    if ((row.vote_count ?? 0) <= 0) continue;

    const deadlinePassed = isVotingDeadlinePassed({
      date: match.date,
      time: match.time || "00:00",
      is_played: Boolean(match.is_played),
      rating_voting_ends_at: match.rating_voting_ends_at ?? null,
    });
    if (!deadlinePassed) continue;

    points.push({
      matchId: row.match_id,
      rating: Number(row.match_rating) || 0,
      opponent: match.opponent,
      date: match.date,
      shortLabel: shortDateLabel(match.date),
    });
  }

  points.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.matchId - b.matchId;
  });

  if (points.length <= limit) return points;
  return points.slice(points.length - limit);
}

export function buildFormSparklinePoints(
  ratings: FormRatingPoint[],
  width = 220,
  height = 56,
  padding = 8
): string {
  if (ratings.length === 0) return "";

  const minRating = 4;
  const maxRating = 10;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  return ratings
    .map((point, index) => {
      const x =
        padding +
        (ratings.length === 1
          ? innerW / 2
          : (index / (ratings.length - 1)) * innerW);
      const normalized =
        (Math.max(minRating, Math.min(maxRating, point.rating)) - minRating) /
        (maxRating - minRating);
      const y = padding + innerH - normalized * innerH;
      return `${x},${y}`;
    })
    .join(" ");
}

export function getFormStreak(ratings: FormRatingPoint[]): number {
  let streak = 0;
  for (let index = ratings.length - 1; index >= 0; index -= 1) {
    if (ratings[index].rating >= 6.5) streak += 1;
    else break;
  }
  return streak;
}

export function getFormBadge(status: string): {
  label: string;
  tone: "good" | "mid" | "bad" | "neutral";
} {
  if (status === "ready") return { label: "Готов", tone: "good" };
  if (status === "maybe") return { label: "Под вопросом", tone: "mid" };
  if (status === "absent") return { label: "Не придёт", tone: "bad" };
  return { label: "—", tone: "neutral" };
}

export function buildPlayerHomeAchievements(params: {
  welcome: PlayerWelcomeData;
  formRatings: FormRatingPoint[];
  personalMvp: MatchMvpInfo | null;
  playedMatchesCount: number;
}): PlayerHomeAchievement[] {
  const { welcome, formRatings, personalMvp, playedMatchesCount } = params;
  const items: PlayerHomeAchievement[] = [];
  const latestRating = formRatings[formRatings.length - 1] ?? null;

  if (welcome.ratingDelta != null && welcome.ratingDelta > 0) {
    items.push({
      id: "rating-up",
      icon: "📈",
      title: `+${welcome.ratingDelta} OVR`,
      detail: "Рост после последнего матча",
    });
  }

  if (personalMvp?.isConfirmedMvp) {
    items.push({
      id: "mvp",
      icon: "🏆",
      title: "MVP матча",
      detail: `vs ${personalMvp.opponent}`,
    });
  }

  if (latestRating && latestRating.rating >= 8) {
    items.push({
      id: "elite-rating",
      icon: "🌟",
      title: "Оценка 8+",
      detail: `${formatVoteScore(latestRating.rating)} vs ${latestRating.opponent}`,
    });
  }

  if (welcome.goals > 0) {
    items.push({
      id: "goals",
      icon: "⚽",
      title: `${welcome.goals} ${welcome.goals === 1 ? "гол" : welcome.goals < 5 ? "гола" : "голов"}`,
      detail: "За сезон",
    });
  }

  if (welcome.assists > 0 && items.length < 4) {
    items.push({
      id: "assists",
      icon: "🎯",
      title: `${welcome.assists} ${welcome.assists === 1 ? "передача" : welcome.assists < 5 ? "передачи" : "передач"}`,
      detail: "За сезон",
    });
  }

  if (playedMatchesCount > 0 && items.length < 4) {
    items.push({
      id: "matches-rated",
      icon: "📋",
      title: `${playedMatchesCount} ${playedMatchesCount === 1 ? "матч" : playedMatchesCount < 5 ? "матча" : "матчей"}`,
      detail: "С оценками",
    });
  }

  const streak = getFormStreak(formRatings);
  if (streak >= 2 && items.length < 4) {
    items.push({
      id: "form-streak",
      icon: "🟢",
      title: `Серия ${streak}`,
      detail: "Матчей с оценкой 6.5+",
    });
  }

  return items.slice(0, 4);
}

export function getUpcomingMatchesList(
  matches: Match[],
  limit = 4
): Match[] {
  const now = Date.now();

  const upcoming = matches
    .filter((match) => !match.is_played)
    .map((match) => ({ match, date: getMatchDateTime(match) }))
    .filter(
      (entry): entry is { match: Match; date: Date } =>
        entry.date !== null && entry.date.getTime() >= now
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => entry.match);

  if (upcoming.length >= limit) return upcoming.slice(0, limit);

  const unplayed = matches
    .filter((match) => !match.is_played)
    .sort((a, b) => {
      const dateA = getMatchDateTime(a)?.getTime() ?? 0;
      const dateB = getMatchDateTime(b)?.getTime() ?? 0;
      return dateA - dateB;
    });

  const merged = [...upcoming];
  for (const match of unplayed) {
    if (merged.some((item) => item.id === match.id)) continue;
    merged.push(match);
    if (merged.length >= limit) break;
  }

  return merged.slice(0, limit);
}

export function getMatchVenueLabel(
  location: string | null | undefined
): "Дом" | "Выезд" | string {
  if (!location || !location.trim()) return "—";
  const normalized = location.trim().toLowerCase();
  if (!normalized) return "—";
  if (
    normalized.includes("дом") ||
    normalized.includes("home") ||
    normalized.includes("нижн")
  ) {
    return "Дом";
  }
  if (
    normalized.includes("выезд") ||
    normalized.includes("away") ||
    normalized.includes("гост")
  ) {
    return "Выезд";
  }
  return location.length > 18 ? `${location.slice(0, 16)}…` : location;
}

export function formatCalendarRow(match: Match): string {
  const time = match.time?.trim() ? match.time : "—";
  return `${formatMatchDate(match.date)} · ${time}`;
}
