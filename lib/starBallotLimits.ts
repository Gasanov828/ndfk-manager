import {
  MAX_EIGHT_PLUS_PER_BALLOT,
  MAX_NINE_PLUS_PER_BALLOT,
  MAX_VOTE_SCORE,
  normalizeVoteScore,
} from "@/lib/matchRatings";

export type BallotLimitResult =
  | { ok: true }
  | { ok: false; reason: string };

function countHighScores(scores: number[]): {
  ninePlus: number;
  eightPlus: number;
} {
  let ninePlus = 0;
  let eightPlus = 0;
  for (const raw of scores) {
    const score = normalizeVoteScore(raw);
    if (score <= 0) continue;
    if (score >= 9) {
      ninePlus += 1;
      eightPlus += 1;
    } else if (score >= 8) {
      eightPlus += 1;
    }
  }
  return { ninePlus, eightPlus };
}

export function canSelectStarScore(
  currentScores: Record<number, number>,
  playerId: number,
  nextScore: number
): BallotLimitResult {
  if (nextScore <= 0) return { ok: true };
  if (nextScore > MAX_VOTE_SCORE) {
    return { ok: false, reason: `Максимум ${MAX_VOTE_SCORE}` };
  }

  const merged = { ...currentScores, [playerId]: nextScore };
  const counts = countHighScores(Object.values(merged));

  if (counts.ninePlus > MAX_NINE_PLUS_PER_BALLOT) {
    return {
      ok: false,
      reason: `Оценку 9–10 можно максимум ${MAX_NINE_PLUS_PER_BALLOT} игрокам — иначе все будут на десятках.`,
    };
  }

  if (counts.eightPlus > MAX_EIGHT_PLUS_PER_BALLOT) {
    return {
      ok: false,
      reason: `Оценки 8–10 вместе — не больше ${MAX_EIGHT_PLUS_PER_BALLOT}. Остальным ставь 7 или ниже.`,
    };
  }

  return { ok: true };
}

export function validateStarBallotLimits(scores: number[]): BallotLimitResult {
  const counts = countHighScores(scores);
  if (counts.ninePlus > MAX_NINE_PLUS_PER_BALLOT) {
    return {
      ok: false,
      reason: `Слишком много оценок 9–10 (макс. ${MAX_NINE_PLUS_PER_BALLOT}).`,
    };
  }
  if (counts.eightPlus > MAX_EIGHT_PLUS_PER_BALLOT) {
    return {
      ok: false,
      reason: `Слишком много высоких оценок 8–10 (макс. ${MAX_EIGHT_PLUS_PER_BALLOT}).`,
    };
  }
  return { ok: true };
}
