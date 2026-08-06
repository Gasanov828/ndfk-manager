/**
 * 5 категорий «как сыграл».
 *
 * Антиинфляция: «Норм» = обычный матч (6, без копилки).
 * «Хорошо» и «Отлично» — выше среднего и редкие.
 * Копилка: 6.5+/7+ → Хорошо(7), 8+ → только Отлично(9).
 */
export type PerformanceTierId =
  | "poor"
  | "meh"
  | "ok"
  | "good"
  | "great";

export type PerformanceTier = {
  id: PerformanceTierId;
  label: string;
  phrase: string;
  score: number;
  tone: "slate" | "zinc" | "violet" | "cyan" | "amber";
  /** Даёт очки в копилку достижений */
  banksPoints: boolean;
};

export const PERFORMANCE_TIERS: PerformanceTier[] = [
  {
    id: "poor",
    label: "Слабо",
    phrase: "Слабая игра",
    score: 3,
    tone: "slate",
    banksPoints: false,
  },
  {
    id: "meh",
    label: "Так себе",
    phrase: "Так себе",
    score: 5,
    tone: "zinc",
    banksPoints: false,
  },
  {
    id: "ok",
    label: "Норм",
    phrase: "Обычный матч",
    score: 6,
    tone: "violet",
    banksPoints: false,
  },
  {
    id: "good",
    label: "Хорошо",
    phrase: "Выше среднего",
    score: 7,
    tone: "cyan",
    banksPoints: true,
  },
  {
    id: "great",
    label: "Отлично",
    phrase: "Лучшие на поле",
    score: 9,
    tone: "amber",
    banksPoints: true,
  },
];

/** Лимиты на один бюллетень — нельзя всем поставить «Хорошо» */
export const MAX_GREAT_PER_BALLOT = 2;
export const MAX_ABOVE_AVG_PER_BALLOT = 4; // Хорошо + Отлично

const SCORE_TO_TIER = new Map(
  PERFORMANCE_TIERS.map((tier) => [tier.score, tier])
);

export function getPerformanceTier(score: number): PerformanceTier | null {
  if (!Number.isFinite(score) || score <= 0) return null;

  const exact = SCORE_TO_TIER.get(Math.round(score));
  if (exact && Math.abs(exact.score - score) < 0.4) return exact;

  let best: PerformanceTier = PERFORMANCE_TIERS[0];
  let bestDist = Infinity;
  for (const tier of PERFORMANCE_TIERS) {
    const dist = Math.abs(tier.score - score);
    if (dist < bestDist) {
      bestDist = dist;
      best = tier;
    }
  }
  return best;
}

export function getPerformanceTierById(
  id: PerformanceTierId
): PerformanceTier | null {
  return PERFORMANCE_TIERS.find((tier) => tier.id === id) ?? null;
}

export function formatPerformanceLabel(score: number): string {
  const tier = getPerformanceTier(score);
  if (!tier) return score.toFixed(1);
  return `${tier.label} · ${score.toFixed(1)}`;
}

export function countBallotTiers(scores: number[]): {
  great: number;
  aboveAvg: number;
  rated: number;
} {
  let great = 0;
  let aboveAvg = 0;
  let rated = 0;

  for (const score of scores) {
    if (score <= 0) continue;
    rated += 1;
    const tier = getPerformanceTier(score);
    if (!tier) continue;
    if (tier.id === "great") {
      great += 1;
      aboveAvg += 1;
    } else if (tier.id === "good") {
      aboveAvg += 1;
    }
  }

  return { great, aboveAvg, rated };
}

export type BallotLimitResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Проверка лимитов при выборе категории для игрока */
export function canSelectPerformanceTier(
  currentScores: Record<number, number>,
  playerId: number,
  nextScore: number
): BallotLimitResult {
  if (nextScore <= 0) return { ok: true };

  const nextTier = getPerformanceTier(nextScore);
  if (!nextTier) return { ok: true };

  const merged = { ...currentScores, [playerId]: nextScore };
  const counts = countBallotTiers(Object.values(merged));

  if (counts.great > MAX_GREAT_PER_BALLOT) {
    return {
      ok: false,
      reason: `«Отлично» можно максимум ${MAX_GREAT_PER_BALLOT} игрокам — иначе все будут с 9.`,
    };
  }

  if (counts.aboveAvg > MAX_ABOVE_AVG_PER_BALLOT) {
    return {
      ok: false,
      reason: `«Хорошо» и «Отлично» вместе — не больше ${MAX_ABOVE_AVG_PER_BALLOT}. Остальным ставь «Норм» или ниже.`,
    };
  }

  return { ok: true };
}

export function validateBallotLimits(
  scores: number[]
): BallotLimitResult {
  const counts = countBallotTiers(scores);
  if (counts.great > MAX_GREAT_PER_BALLOT) {
    return {
      ok: false,
      reason: `Слишком много «Отлично» (макс. ${MAX_GREAT_PER_BALLOT}).`,
    };
  }
  if (counts.aboveAvg > MAX_ABOVE_AVG_PER_BALLOT) {
    return {
      ok: false,
      reason: `Слишком много оценок выше среднего (макс. ${MAX_ABOVE_AVG_PER_BALLOT}).`,
    };
  }
  return { ok: true };
}

export function performanceTierSelectedClass(tone: PerformanceTier["tone"]) {
  switch (tone) {
    case "amber":
      return "border-amber-300/50 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_12px_rgba(251,191,36,0.35)]";
    case "cyan":
      return "border-cyan-300/45 bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-[0_0_12px_rgba(34,211,238,0.3)]";
    case "violet":
      return "border-violet-300/45 bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-[0_0_12px_rgba(139,92,255,0.3)]";
    case "zinc":
      return "border-slate-300/35 bg-slate-400/25 text-slate-100";
    default:
      return "border-slate-500/40 bg-slate-600/40 text-slate-200";
  }
}
