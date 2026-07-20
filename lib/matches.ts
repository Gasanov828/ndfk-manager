import { getMatchDateTime } from "@/lib/matchCountdown";

export type Match = {
  id: number;
  opponent: string;
  date: string;
  time: string;
  location: string;
  ndfk_goals?: number;
  opponent_goals?: number;
  is_played?: boolean;
  is_live?: boolean;
  /** ����� �������� ����������� �� ������ (ISO). �������� ��� ���������� �����. */
  rating_voting_ends_at?: string | null;
};

export function formatMatchDate(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }

  return date;
}

export function formatMatchTime(time: string): string {
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time;
  }

  return time;
}

export function sortMatchesByDate(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const dateA = getMatchDateTime(a)?.getTime() ?? 0;
    const dateB = getMatchDateTime(b)?.getTime() ?? 0;
    return dateB - dateA;
  });
}

export function getUpcomingMatch(matches: Match[]): Match | null {
  if (matches.length === 0) return null;

  const now = Date.now();

  const upcoming = matches
    .filter((match) => !match.is_played)
    .map((match) => ({ match, date: getMatchDateTime(match) }))
    .filter(
      (entry): entry is { match: Match; date: Date } =>
        entry.date !== null && entry.date.getTime() >= now
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (upcoming.length > 0) return upcoming[0].match;

  const unplayed = matches.filter((match) => !match.is_played);
  return sortMatchesByDate(unplayed)[0] ?? sortMatchesByDate(matches)[0] ?? null;
}
