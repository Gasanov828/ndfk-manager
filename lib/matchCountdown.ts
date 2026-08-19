import type { Match } from "@/lib/matches";

export type MatchDateTimeInput = Pick<Match, "date" | "time">;

/** Клубные матчи ведутся по московскому времени (UTC+3, без перехода на летнее). */
export const CLUB_TIME_ZONE_OFFSET = "+03:00";

export function parseMatchTimeParts(time: string): { hours: number; minutes: number } {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return { hours: 0, minutes: 0 };
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Дата/время матча как абсолютный момент.
 * Важно: НЕ зависеть от timezone сервера (локально MSK, на Vercel UTC),
 * иначе дедлайн голосования / форма / «Матчи» на главной расходятся.
 */
export function getMatchDateTime(match: MatchDateTimeInput): Date | null {
  let year = 0;
  let month = 0;
  let day = 0;

  if (/^\d{4}-\d{2}-\d{2}$/.test(match.date)) {
    const parts = match.date.split("-").map(Number);
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else {
    const dotted = match.date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!dotted) return null;
    day = Number(dotted[1]);
    month = Number(dotted[2]);
    year = Number(dotted[3]);
  }

  const { hours, minutes } = parseMatchTimeParts(match.time || "00:00");
  const iso = `${year}-${pad2(month)}-${pad2(day)}T${pad2(hours)}:${pad2(minutes)}:00${CLUB_TIME_ZONE_OFFSET}`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
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

export function formatMatchCountdownLabel(match: MatchDateTimeInput): string | null {
  const target = getMatchDateTime(match);
  if (!target) return null;

  const countdown = getCountdownParts(target);
  if (countdown.expired) return "скоро старт";

  const days = countdown.days > 0 ? `${countdown.days}д ` : "";
  return `${days}${padTime(countdown.hours)}:${padTime(countdown.minutes)}:${padTime(countdown.seconds)}`;
}
