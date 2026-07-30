import type { CommonAchievement, CommonAchievementStatus } from "@/lib/careerMock";

/** Пороги копилки на шкале 1–10 */
export const RATING_SOLID = 6.5;
export const RATING_STRONG = 7;
export const RATING_ELITE = 8;

/**
 * Очки в копилку за закрытый матч:
 * ≥8 → +3, ≥7 → +2, ≥6.5 → +1, ниже → 0
 */
export function ratingBankPoints(matchRating: number): number {
  const score = Number(matchRating);
  if (score >= RATING_ELITE) return 3;
  if (score >= RATING_STRONG) return 2;
  if (score >= RATING_SOLID) return 1;
  return 0;
}

export type PersonalRatingMatch = {
  matchId: number;
  matchRating: number;
  voteCount: number;
  isMvp: boolean;
  opponent: string;
  matchDate: string;
};

export type PersonalRatingStats = {
  matchesRated: number;
  matchesGe65: number;
  matchesGe70: number;
  matchesGe80: number;
  mvpCount: number;
  bestRating: number;
  bankPoints: number;
  recent: PersonalRatingMatch[];
};

export type PersonalAchievementDef = {
  id: string;
  icon: string;
  title: string;
  description: string;
  target: number;
  metric: keyof Omit<PersonalRatingStats, "recent" | "bestRating">;
};

/** Личные цели по оценкам — копилка растёт после матчей */
export const PERSONAL_ACHIEVEMENT_DEFS: PersonalAchievementDef[] = [
  {
    id: "personal-first-rated",
    icon: "🏁",
    title: "Первая оценка",
    description: "Получить оценку матча по итогам голосования",
    target: 1,
    metric: "matchesRated",
  },
  {
    id: "personal-solid-1",
    icon: "✨",
    title: "Достойная игра",
    description: "Оценка 6.5+ в матче",
    target: 1,
    metric: "matchesGe65",
  },
  {
    id: "personal-solid-3",
    icon: "📈",
    title: "Стабильность 6.5+",
    description: "Три матча с оценкой 6.5 и выше",
    target: 3,
    metric: "matchesGe65",
  },
  {
    id: "personal-strong-1",
    icon: "💪",
    title: "Сильный матч",
    description: "Оценка 7.0+ в матче",
    target: 1,
    metric: "matchesGe70",
  },
  {
    id: "personal-strong-5",
    icon: "🔥",
    title: "Пять семёрок",
    description: "Пять матчей с оценкой 7.0 и выше",
    target: 5,
    metric: "matchesGe70",
  },
  {
    id: "personal-elite-1",
    icon: "🌟",
    title: "Оценка 8+",
    description: "Получить среднюю оценку матча 8.0 и выше",
    target: 1,
    metric: "matchesGe80",
  },
  {
    id: "personal-elite-3",
    icon: "💎",
    title: "Три восьмёрки",
    description: "Три матча с оценкой 8.0 и выше",
    target: 3,
    metric: "matchesGe80",
  },
  {
    id: "personal-bank-10",
    icon: "🪙",
    title: "Копилка ×10",
    description: "Набрать 10 очков за оценки (≥6.5 +1, ≥7 +2, ≥8 +3)",
    target: 10,
    metric: "bankPoints",
  },
  {
    id: "personal-bank-25",
    icon: "🏦",
    title: "Копилка ×25",
    description: "Набрать 25 очков за хорошие оценки после матчей",
    target: 25,
    metric: "bankPoints",
  },
  {
    id: "common-mvp-match",
    icon: "⭐",
    title: "Мой MVP матча",
    description: "Стать лучшим игроком матча по голосованию",
    target: 1,
    metric: "mvpCount",
  },
];

export function buildPersonalRatingStats(
  matches: PersonalRatingMatch[]
): PersonalRatingStats {
  let matchesGe65 = 0;
  let matchesGe70 = 0;
  let matchesGe80 = 0;
  let mvpCount = 0;
  let bankPoints = 0;
  let bestRating = 0;

  for (const row of matches) {
    const rating = Number(row.matchRating);
    if (row.voteCount <= 0) continue;

    if (rating > bestRating) bestRating = rating;
    bankPoints += ratingBankPoints(rating);
    if (rating >= RATING_SOLID) matchesGe65 += 1;
    if (rating >= RATING_STRONG) matchesGe70 += 1;
    if (rating >= RATING_ELITE) matchesGe80 += 1;
    if (row.isMvp) mvpCount += 1;
  }

  return {
    matchesRated: matches.filter((row) => row.voteCount > 0).length,
    matchesGe65,
    matchesGe70,
    matchesGe80,
    mvpCount,
    bestRating,
    bankPoints,
    recent: [...matches]
      .filter((row) => row.voteCount > 0)
      .sort((a, b) => {
        const byDate = b.matchDate.localeCompare(a.matchDate);
        if (byDate !== 0) return byDate;
        return b.matchId - a.matchId;
      })
      .slice(0, 5),
  };
}

function statusFor(current: number, target: number): CommonAchievementStatus {
  if (current >= target) return "earned";
  return "progress";
}

export function emptyPersonalRatingStats(): PersonalRatingStats {
  return {
    matchesRated: 0,
    matchesGe65: 0,
    matchesGe70: 0,
    matchesGe80: 0,
    mvpCount: 0,
    bestRating: 0,
    bankPoints: 0,
    recent: [],
  };
}

export function resolvePersonalAchievements(
  stats: PersonalRatingStats
): CommonAchievement[] {
  return PERSONAL_ACHIEVEMENT_DEFS.map((def) => {
    const current = Number(stats[def.metric] ?? 0);
    return {
      id: def.id,
      scope: "personal" as const,
      icon: def.icon,
      title: def.title,
      description: def.description,
      current: Math.min(current, def.target),
      target: def.target,
      status: statusFor(current, def.target),
    };
  });
}

/** @deprecated */
export const buildPersonalAchievements = resolvePersonalAchievements;

