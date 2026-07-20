import { getMatchDateTime } from "@/lib/matchCountdown";
import { sortMatchesByDate, type Match } from "@/lib/matches";

export const MATCH_FINISHED_EVENT = "ndfk:match-finished";
export const MATCH_STARTED_EVENT = "ndfk:match-started";

export type MatchWithLive = Match & {
  is_live?: boolean;
};

export function isMatchKickoffPassed(match: Match): boolean {
  const kickoff = getMatchDateTime(match);
  if (!kickoff) return false;
  return Date.now() >= kickoff.getTime();
}

/** Матч идёт: не завершён и (админ нажал «начать» или время матча уже наступило) */
export function isMatchInProgress(match: MatchWithLive): boolean {
  if (match.is_played) return false;
  return Boolean(match.is_live) || isMatchKickoffPassed(match);
}

export function getLiveMatch(matches: MatchWithLive[]): MatchWithLive | null {
  const live = matches
    .filter((match) => isMatchInProgress(match))
    .map((match) => ({ match, kickoff: getMatchDateTime(match)?.getTime() ?? 0 }))
    .sort((a, b) => b.kickoff - a.kickoff);

  return live[0]?.match ?? null;
}

export function getNextUpcomingMatch(
  matches: MatchWithLive[]
): MatchWithLive | null {
  // Ближайший матч, который ещё не начат и не завершён
  const candidates = matches.filter(
    (match) => !match.is_played && !match.is_live
  );

  if (candidates.length === 0) return null;

  const now = Date.now();

  const withDates = candidates
    .map((match) => ({ match, date: getMatchDateTime(match) }))
    .filter(
      (entry): entry is { match: MatchWithLive; date: Date } =>
        entry.date !== null
    );

  const future = withDates
    .filter((entry) => entry.date.getTime() >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (future.length > 0) return future[0].match;

  // Время матча прошло, но матч ещё не начат — показываем в расписании
  return (
    withDates.sort((a, b) => b.date.getTime() - a.date.getTime())[0]?.match ??
    sortMatchesByDate(candidates)[0] ??
    null
  );
}

export function notifyMatchFinished(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MATCH_FINISHED_EVENT));
}

export function notifyMatchStarted(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MATCH_STARTED_EVENT));
}
