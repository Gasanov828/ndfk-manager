import { MAX_VOTE_SCORE } from "@/lib/matchRatings";

export type BallotLimitResult =
  | { ok: true }
  | { ok: false; reason: string };

// Ограничение на количество оценок 8/9/10 за один бюллетень снято —
// игроки могут ставить сколько угодно высоких оценок.

export function canSelectStarScore(
  _currentScores: Record<number, number>,
  _playerId: number,
  nextScore: number
): BallotLimitResult {
  if (nextScore <= 0) return { ok: true };
  if (nextScore > MAX_VOTE_SCORE) {
    return { ok: false, reason: `Максимум ${MAX_VOTE_SCORE}` };
  }
  return { ok: true };
}

export function validateStarBallotLimits(_scores: number[]): BallotLimitResult {
  return { ok: true };
}
