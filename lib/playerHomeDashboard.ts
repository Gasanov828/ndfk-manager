import {
  formatMatchDate,
  getUpcomingMatch,
  sortMatchesByDate,
  type Match,
} from "@/lib/matches";
import {
  formatOverallRating,
  formatVoteScore,
  normalizeVoteScore,
  type MatchMvpInfo,
} from "@/lib/matchRatings";
import { getFirstName, type PlayerWelcomeData } from "@/lib/playerStats";

export type PlayerFormPoint = {
  matchId: number;
  rating: number;
  opponent: string;
  date: string;
  isMvp: boolean;
};

export type PlayerHomeBadge = {
  id: string;
  label: string;
  tone: "lime" | "violet" | "amber" | "slate" | "rose";
};

export type PlayerHomeAchievement = {
  id: string;
  icon: string;
  title: string;
  detail: string;
};

export type PlayerHomeLeader = {
  id: number;
  name: string;
  valueLabel: string;
  photoUrl?: string | null;
};

export type PlayerHomeLeaders = {
  scorer: PlayerHomeLeader | null;
  assister: PlayerHomeLeader | null;
  rating: PlayerHomeLeader | null;
};

export type PlayerHomeCalendarMatch = {
  id: number;
  opponent: string;
  date: string;
  time: string;
  location: string;
  isHome: boolean;
  dateLabel: string;
  timeLabel: string;
};

export type PlayerFormRatingRow = {
  match_id: number;
  match_rating: number;
  vote_count: number;
  is_mvp: boolean;
  rating_before?: number | null;
  rating_after?: number | null;
  match?:
    | {
        opponent?: string | null;
        date?: string | null;
        is_played?: boolean | null;
      }
    | {
        opponent?: string | null;
        date?: string | null;
        is_played?: boolean | null;
      }[]
    | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Дом / выезд по тексту локации (отдельного поля в БД нет). */
export function isLikelyHomeMatch(location: string): boolean {
  const loc = location.trim().toLowerCase();
  if (!loc) return true;
  if (
    loc.includes("выезд") ||
    loc.includes("away") ||
    loc.includes("гости") ||
    loc.includes("в гостях")
  ) {
    return false;
  }
  if (
    loc.includes("дом") ||
    loc.includes("home") ||
    loc.includes("дженгутай") ||
    loc.includes("ндфк") ||
    loc.includes("нижний")
  ) {
    return true;
  }
  return true;
}

export function buildFormSeries(
  rows: PlayerFormRatingRow[],
  limit = 6
): PlayerFormPoint[] {
  const points: PlayerFormPoint[] = [];

  for (const row of rows) {
    if ((row.vote_count ?? 0) <= 0) continue;
    const match = one(row.match);
    const rating = normalizeVoteScore(Number(row.match_rating) || 0);
    if (rating <= 0) continue;

    points.push({
      matchId: row.match_id,
      rating,
      opponent: match?.opponent?.trim() || "соперник",
      date: match?.date ?? "",
      isMvp: Boolean(row.is_mvp),
    });
  }

  return points
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, limit)
    .reverse();
}

export function getAverageForm(points: PlayerFormPoint[]): number | null {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, point) => acc + point.rating, 0);
  return Math.round((sum / points.length) * 10) / 10;
}

export function buildFormBadge(points: PlayerFormPoint[]): PlayerHomeBadge | null {
  const avg = getAverageForm(points);
  if (avg == null) return null;

  if (avg >= 8.5) {
    return { id: "form-fire", label: "В огне", tone: "lime" };
  }
  if (avg >= 7.5) {
    return { id: "form-good", label: "Хорошая форма", tone: "violet" };
  }
  if (avg >= 6.5) {
    return { id: "form-stable", label: "Стабильно", tone: "amber" };
  }
  if (avg >= 5.5) {
    return { id: "form-ok", label: "Средне", tone: "slate" };
  }
  return { id: "form-low", label: "Спад", tone: "rose" };
}

/** Серия матчей подряд с оценкой ≥ 7. */
export function buildStreakBadge(
  points: PlayerFormPoint[]
): PlayerHomeBadge | null {
  if (points.length === 0) return null;

  let streak = 0;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].rating >= 7) streak += 1;
    else break;
  }

  if (streak < 2) return null;
  return {
    id: "streak",
    label: `Серия ${streak}`,
    tone: "lime",
  };
}

export function buildRecentAchievements(input: {
  welcome: PlayerWelcomeData;
  form: PlayerFormPoint[];
  latestMatchRating: number | null;
  isPersonalMvp: boolean;
  matchMvp: MatchMvpInfo | null;
}): PlayerHomeAchievement[] {
  const items: PlayerHomeAchievement[] = [];
  const { welcome, form, latestMatchRating, isPersonalMvp, matchMvp } = input;

  if (welcome.ratingDelta != null && welcome.ratingDelta !== 0) {
    const up = welcome.ratingDelta > 0;
    items.push({
      id: "rating-delta",
      icon: up ? "📈" : "📉",
      title: up ? "Рост рейтинга" : "Падение рейтинга",
      detail: `${up ? "+" : ""}${formatOverallRating(welcome.ratingDelta)} OVR${
        welcome.lastMatchLabel ? ` · ${welcome.lastMatchLabel}` : ""
      }`,
    });
  }

  if (isPersonalMvp && matchMvp) {
    items.push({
      id: "mvp",
      icon: "🏆",
      title: "MVP матча",
      detail: `vs ${matchMvp.opponent} · ${formatVoteScore(matchMvp.avgScore)}`,
    });
  }

  if (latestMatchRating != null && latestMatchRating >= 8) {
    items.push({
      id: "high-rating",
      icon: "⭐",
      title: "Сильная оценка",
      detail: `${formatVoteScore(latestMatchRating)} в последнем матче`,
    });
  }

  if (welcome.goals > 0) {
    items.push({
      id: "goals",
      icon: "⚽",
      title: "Голы в сезоне",
      detail: `${welcome.goals} · ${welcome.firstName}`,
    });
  }

  if (welcome.assists > 0) {
    items.push({
      id: "assists",
      icon: "🎯",
      title: "Ассисты в сезоне",
      detail: `${welcome.assists} передач`,
    });
  }

  const lastPoint = form[form.length - 1];
  if (lastPoint?.isMvp && !isPersonalMvp) {
    items.push({
      id: "form-mvp",
      icon: "🥇",
      title: "Был MVP",
      detail: `vs ${lastPoint.opponent}`,
    });
  }

  return items.slice(0, 4);
}

type LeaderPlayer = {
  id: number;
  name: string;
  goals: number;
  assists: number;
  rating: number;
  photo_url?: string | null;
};

export function buildTeamLeaders(players: LeaderPlayer[]): PlayerHomeLeaders {
  if (players.length === 0) {
    return { scorer: null, assister: null, rating: null };
  }

  const scorer = [...players].sort(
    (a, b) => b.goals - a.goals || b.assists - a.assists || b.rating - a.rating
  )[0];
  const assister = [...players].sort(
    (a, b) => b.assists - a.assists || b.goals - a.goals || b.rating - a.rating
  )[0];
  const rating = [...players].sort(
    (a, b) => b.rating - a.rating || b.goals - a.goals || a.id - b.id
  )[0];

  return {
    scorer:
      scorer.goals > 0
        ? {
            id: scorer.id,
            name: getFirstName(scorer.name),
            valueLabel: `${scorer.goals} гол.`,
            photoUrl: scorer.photo_url ?? null,
          }
        : null,
    assister:
      assister.assists > 0
        ? {
            id: assister.id,
            name: getFirstName(assister.name),
            valueLabel: `${assister.assists} асс.`,
            photoUrl: assister.photo_url ?? null,
          }
        : null,
    rating: {
      id: rating.id,
      name: getFirstName(rating.name),
      valueLabel: formatOverallRating(rating.rating),
      photoUrl: rating.photo_url ?? null,
    },
  };
}

export function buildUpcomingCalendar(
  matches: Match[],
  limit = 4
): PlayerHomeCalendarMatch[] {
  const now = Date.now();
  const upcoming = matches
    .filter((match) => !match.is_played)
    .map((match) => ({ match }))
    .sort((a, b) => {
      const da = `${a.match.date}T${a.match.time || "00:00"}`;
      const db = `${b.match.date}T${b.match.time || "00:00"}`;
      return da.localeCompare(db);
    });

  const future = upcoming.filter((entry) => {
    const stamp = Date.parse(`${entry.match.date}T${entry.match.time || "00:00"}`);
    return Number.isFinite(stamp) ? stamp >= now - 60 * 60 * 1000 : true;
  });

  const list = (future.length > 0 ? future : upcoming).slice(0, limit);

  return list.map(({ match }) => ({
    id: match.id,
    opponent: match.opponent,
    date: match.date,
    time: match.time,
    location: match.location,
    isHome: isLikelyHomeMatch(match.location ?? ""),
    dateLabel: formatMatchDate(match.date),
    timeLabel: match.time?.slice(0, 5) || "—",
  }));
}

export function getNextCalendarMatch(
  matches: Match[]
): PlayerHomeCalendarMatch | null {
  const next = getUpcomingMatch(matches);
  if (!next || next.is_played) return null;
  return buildUpcomingCalendar([next], 1)[0] ?? null;
}

export function countPlayerMatchesPlayed(
  matchIds: Array<number | null | undefined>
): number {
  return new Set(matchIds.filter((id): id is number => typeof id === "number"))
    .size;
}

/** Сортировка матчей для календаря — ближайшие сверху. */
export function sortUpcomingFirst(matches: Match[]): Match[] {
  return sortMatchesByDate(matches).reverse();
}
