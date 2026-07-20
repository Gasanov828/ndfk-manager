import type { Match } from "@/lib/matches";

export type MatchDateTimeInput = Pick<Match, "date" | "time">;

export function parseMatchTimeParts(time: string): { hours: number; minutes: number } {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return { hours: 0, minutes: 0 };
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function getMatchDateTime(match: MatchDateTimeInput): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(match.date)) {
    const [year, month, day] = match.date.split("-").map(Number);
    const { hours, minutes } = parseMatchTimeParts(match.time || "00:00");
    const parsed = new Date(year, month - 1, day, hours, minutes, 0);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const dotted = match.date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    const year = Number(dotted[3]);
    const { hours, minutes } = parseMatchTimeParts(match.time || "00:00");
    const parsed = new Date(year, month - 1, day, hours, minutes, 0);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

export function getNextScheduledMatch(matches: Match[]): Match | null {
  const now = Date.now();

  const upcoming = matches
    .filter((match) => !match.is_played)
    .map((match) => ({ match, date: getMatchDateTime(match) }))
    .filter(
      (entry): entry is { match: Match; date: Date } =>
        entry.date !== null && entry.date.getTime() > now
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return upcoming[0]?.match ?? null;
}

export type CountdownParts = {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function getCountdownParts(target: Date): CountdownParts {
  const diff = target.getTime() - Date.now();

  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { expired: false, days, hours, minutes, seconds };
}

export function padTime(value: number): string {
  return String(value).padStart(2, "0");
}
