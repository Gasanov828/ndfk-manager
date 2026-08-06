import type {
  AchievementDefinition,
  AchievementRarity,
} from "@/lib/achievements/types";

function milestone(
  partial: Omit<AchievementDefinition, "rarity" | "xp"> & {
    rarity?: AchievementRarity;
    xp?: number;
  }
): AchievementDefinition {
  const rarity = partial.rarity ?? "common";
  const xpByRarity: Record<AchievementRarity, number> = {
    common: 25,
    rare: 60,
    epic: 120,
    legend: 250,
  };
  return {
    ...partial,
    rarity,
    xp: partial.xp ?? xpByRarity[rarity],
  };
}

/**
 * Реестр достижений.
 * Чтобы добавить новое — просто допиши объект сюда.
 * Основная логика evaluate/award не меняется.
 */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // —— Матчи ——
  milestone({
    id: "matches-1",
    title: "Первый матч",
    description: "Сыграть первый официальный матч",
    icon: "🏁",
    category: "matches",
    condition: { type: "metric", metric: "matchesPlayed", gte: 1 },
  }),
  milestone({
    id: "matches-10",
    title: "10 матчей",
    description: "Сыграть 10 матчей за клуб",
    icon: "📋",
    category: "matches",
    rarity: "common",
    condition: { type: "metric", metric: "matchesPlayed", gte: 10 },
  }),
  milestone({
    id: "matches-25",
    title: "25 матчей",
    description: "Сыграть 25 матчей за клуб",
    icon: "📘",
    category: "matches",
    rarity: "rare",
    condition: { type: "metric", metric: "matchesPlayed", gte: 25 },
  }),
  milestone({
    id: "matches-50",
    title: "50 матчей",
    description: "Сыграть 50 матчей за клуб",
    icon: "📙",
    category: "matches",
    rarity: "epic",
    condition: { type: "metric", metric: "matchesPlayed", gte: 50 },
  }),
  milestone({
    id: "matches-100",
    title: "100 матчей",
    description: "Сыграть 100 матчей за клуб",
    icon: "📕",
    category: "matches",
    rarity: "legend",
    condition: { type: "metric", metric: "matchesPlayed", gte: 100 },
  }),

  // —— Голы ——
  milestone({
    id: "goals-1",
    title: "Первый гол",
    description: "Забить первый гол за команду",
    icon: "⚽",
    category: "goals",
    condition: { type: "metric", metric: "goals", gte: 1 },
  }),
  milestone({
    id: "goals-10",
    title: "10 голов",
    description: "Забить 10 голов",
    icon: "🎯",
    category: "goals",
    rarity: "common",
    condition: { type: "metric", metric: "goals", gte: 10 },
  }),
  milestone({
    id: "goals-25",
    title: "25 голов",
    description: "Забить 25 голов",
    icon: "🔥",
    category: "goals",
    rarity: "rare",
    condition: { type: "metric", metric: "goals", gte: 25 },
  }),
  milestone({
    id: "goals-50",
    title: "50 голов",
    description: "Забить 50 голов",
    icon: "💥",
    category: "goals",
    rarity: "epic",
    condition: { type: "metric", metric: "goals", gte: 50 },
  }),
  milestone({
    id: "goals-100",
    title: "100 голов",
    description: "Забить 100 голов",
    icon: "👑",
    category: "goals",
    rarity: "legend",
    condition: { type: "metric", metric: "goals", gte: 100 },
  }),

  // —— Ассисты ——
  milestone({
    id: "assists-1",
    title: "Первый ассист",
    description: "Отдать первую голевую передачу",
    icon: "🎁",
    category: "assists",
    condition: { type: "metric", metric: "assists", gte: 1 },
  }),
  milestone({
    id: "assists-20",
    title: "20 ассистов",
    description: "Отдать 20 голевых передач",
    icon: "🎯",
    category: "assists",
    rarity: "rare",
    condition: { type: "metric", metric: "assists", gte: 20 },
  }),
  milestone({
    id: "assists-50",
    title: "50 ассистов",
    description: "Отдать 50 голевых передач",
    icon: "🪄",
    category: "assists",
    rarity: "epic",
    condition: { type: "metric", metric: "assists", gte: 50 },
  }),
  milestone({
    id: "assists-100",
    title: "100 ассистов",
    description: "Отдать 100 голевых передач",
    icon: "💎",
    category: "assists",
    rarity: "legend",
    condition: { type: "metric", metric: "assists", gte: 100 },
  }),

  // —— Защита ——
  milestone({
    id: "def-tackles-50",
    title: "50 отборов",
    description: "Сделать 50 успешных отборов",
    icon: "🛡",
    category: "defense",
    rarity: "rare",
    condition: {
      type: "and",
      of: [
        { type: "position", groups: ["ЗАЩ"] },
        { type: "metric", metric: "tackles", gte: 50 },
      ],
    },
  }),
  milestone({
    id: "def-tackles-100",
    title: "100 отборов",
    description: "Сделать 100 успешных отборов",
    icon: "⛓",
    category: "defense",
    rarity: "epic",
    condition: {
      type: "and",
      of: [
        { type: "position", groups: ["ЗАЩ"] },
        { type: "metric", metric: "tackles", gte: 100 },
      ],
    },
  }),
  milestone({
    id: "def-tackles-250",
    title: "250 отборов",
    description: "Сделать 250 успешных отборов",
    icon: "🧱",
    category: "defense",
    rarity: "epic",
    condition: {
      type: "and",
      of: [
        { type: "position", groups: ["ЗАЩ"] },
        { type: "metric", metric: "tackles", gte: 250 },
      ],
    },
  }),
  milestone({
    id: "def-tackles-500",
    title: "500 отборов",
    description: "Сделать 500 успешных отборов",
    icon: "🏰",
    category: "defense",
    rarity: "legend",
    condition: {
      type: "and",
      of: [
        { type: "position", groups: ["ЗАЩ"] },
        { type: "metric", metric: "tackles", gte: 500 },
      ],
    },
  }),
  milestone({
    id: "def-intercept-100",
    title: "100 перехватов",
    description: "Сделать 100 перехватов",
    icon: "🤚",
    category: "defense",
    rarity: "rare",
    condition: {
      type: "and",
      of: [
        { type: "position", groups: ["ЗАЩ", "ЦП"] },
        { type: "metric", metric: "interceptions", gte: 100 },
      ],
    },
  }),

  // —— Вратари ——
  milestone({
    id: "gk-clean-1",
    title: "Первый сухой",
    description: "Отыграть первый матч на ноль",
    icon: "🧤",
    category: "goalkeeper",
    condition: {
      type: "and",
      of: [
        { type: "position", groups: ["ВРТ"] },
        { type: "metric", metric: "cleanSheets", gte: 1 },
      ],
    },
  }),
  milestone({
    id: "gk-clean-5",
    title: "5 сухих",
    description: "5 матчей без пропущенных голов",
    icon: "🧱",
    category: "goalkeeper",
    rarity: "rare",
    condition: {
      type: "and",
      of: [
        { type: "position", groups: ["ВРТ"] },
        { type: "metric", metric: "cleanSheets", gte: 5 },
      ],
    },
  }),
  milestone({
    id: "gk-clean-20",
    title: "20 сухих",
    description: "20 матчей на ноль",
    icon: "🏰",
    category: "goalkeeper",
    rarity: "epic",
    condition: {
      type: "and",
      of: [
        { type: "position", groups: ["ВРТ"] },
        { type: "metric", metric: "cleanSheets", gte: 20 },
      ],
    },
  }),
  milestone({
    id: "gk-clean-50",
    title: "50 сухих",
    description: "50 матчей на ноль",
    icon: "💎",
    category: "goalkeeper",
    rarity: "legend",
    condition: {
      type: "and",
      of: [
        { type: "position", groups: ["ВРТ"] },
        { type: "metric", metric: "cleanSheets", gte: 50 },
      ],
    },
  }),

  // —— Оценка матча (1–10) ——
  milestone({
    id: "match-stars-3-5",
    title: "Надёжный игрок",
    description: "Получить среднюю оценку матча 7.0 и выше",
    icon: "⭐",
    category: "rating",
    rarity: "common",
    condition: { type: "metric", metric: "bestMatchRating", gte: 7 },
  }),
  milestone({
    id: "match-stars-4-0",
    title: "Звезда матча",
    description: "Получить среднюю оценку матча 8.0 и выше",
    icon: "🌟",
    category: "rating",
    rarity: "rare",
    condition: { type: "metric", metric: "bestMatchRating", gte: 8 },
  }),
  milestone({
    id: "match-stars-4-5",
    title: "Лучший на поле",
    description: "Получить среднюю оценку матча 9.0 и выше",
    icon: "💫",
    category: "rating",
    rarity: "epic",
    condition: { type: "metric", metric: "bestMatchRating", gte: 9 },
  }),
  milestone({
    id: "match-stars-5-0",
    title: "Легендарное выступление",
    description: "Получить среднюю оценку матча 10.0",
    icon: "👑",
    category: "rating",
    rarity: "legend",
    condition: { type: "metric", metric: "bestMatchRating", gte: 10 },
  }),

  // —— Средняя оценка сезона (1–10) ——
  milestone({
    id: "avg-rating-7",
    title: "Средняя 7+",
    description: "Средняя оценка за сезон 7.0 и выше",
    icon: "📈",
    category: "rating",
    rarity: "rare",
    condition: { type: "metric", metric: "avgMatchRating", gte: 7 },
  }),
  milestone({
    id: "avg-rating-8",
    title: "Средняя 8+",
    description: "Средняя оценка за сезон 8.0 и выше",
    icon: "🌟",
    category: "rating",
    rarity: "epic",
    condition: { type: "metric", metric: "avgMatchRating", gte: 8 },
  }),
  milestone({
    id: "avg-rating-9",
    title: "Средняя 9+",
    description: "Средняя оценка за сезон 9.0 и выше",
    icon: "💫",
    category: "rating",
    rarity: "legend",
    condition: { type: "metric", metric: "avgMatchRating", gte: 9 },
  }),

  // —— MVP ——
  milestone({
    id: "mvp-1",
    title: "Первый MVP",
    description: "Стать MVP матча",
    icon: "⭐",
    category: "mvp",
    rarity: "rare",
    condition: { type: "metric", metric: "mvpCount", gte: 1 },
  }),
  milestone({
    id: "mvp-5",
    title: "5 MVP",
    description: "Стать MVP в 5 матчах",
    icon: "🏅",
    category: "mvp",
    rarity: "epic",
    condition: { type: "metric", metric: "mvpCount", gte: 5 },
  }),
  milestone({
    id: "mvp-10",
    title: "10 MVP",
    description: "Стать MVP в 10 матчах",
    icon: "🏆",
    category: "mvp",
    rarity: "epic",
    condition: { type: "metric", metric: "mvpCount", gte: 10 },
  }),
  milestone({
    id: "mvp-25",
    title: "25 MVP",
    description: "Стать MVP в 25 матчах",
    icon: "👑",
    category: "mvp",
    rarity: "legend",
    condition: { type: "metric", metric: "mvpCount", gte: 25 },
  }),

  // —— OVR ——
  milestone({
    id: "ovr-80",
    title: "OVR 80",
    description: "Достичь рейтинга 80",
    icon: "📊",
    category: "ovr",
    rarity: "rare",
    condition: { type: "metric", metric: "ovr", gte: 80 },
  }),
  milestone({
    id: "ovr-85",
    title: "OVR 85",
    description: "Достичь рейтинга 85",
    icon: "📶",
    category: "ovr",
    rarity: "epic",
    condition: { type: "metric", metric: "ovr", gte: 85 },
  }),
  milestone({
    id: "ovr-90",
    title: "OVR 90",
    description: "Достичь рейтинга 90",
    icon: "🚀",
    category: "ovr",
    rarity: "epic",
    condition: { type: "metric", metric: "ovr", gte: 90 },
  }),
  milestone({
    id: "ovr-95",
    title: "OVR 95",
    description: "Достичь рейтинга 95",
    icon: "💎",
    category: "ovr",
    rarity: "legend",
    condition: { type: "metric", metric: "ovr", gte: 95 },
  }),

  // —— Клуб / серии ——
  milestone({
    id: "club-streak-10",
    title: "10 подряд",
    description: "Сыграть 10 матчей подряд без пропусков",
    icon: "🔥",
    category: "club",
    rarity: "rare",
    condition: { type: "metric", metric: "consecutiveMatches", gte: 10 },
  }),
  milestone({
    id: "club-streak-25",
    title: "25 подряд",
    description: "Сыграть 25 матчей подряд без пропусков",
    icon: "⚡",
    category: "club",
    rarity: "epic",
    condition: { type: "metric", metric: "consecutiveMatches", gte: 25 },
  }),
  milestone({
    id: "club-matches-50",
    title: "50 за клуб",
    description: "50 матчей в составе клуба",
    icon: "❤️",
    category: "club",
    rarity: "epic",
    condition: { type: "metric", metric: "clubMatches", gte: 50 },
  }),
  milestone({
    id: "club-matches-100",
    title: "100 за клуб",
    description: "100 матчей в составе клуба",
    icon: "🏆",
    category: "club",
    rarity: "legend",
    condition: { type: "metric", metric: "clubMatches", gte: 100 },
  }),
  milestone({
    id: "win-streak-5",
    title: "5 побед подряд",
    description: "Личная серия из 5 побед подряд",
    icon: "💚",
    category: "club",
    rarity: "rare",
    condition: { type: "metric", metric: "winStreak", gte: 5 },
  }),

  // —— Репутация (реакции команды) ——
  milestone({
    id: "reaction-form-100",
    title: "Любимец команды",
    description: "Получить 100 реакций «Отличная форма»",
    icon: "🔥",
    category: "reputation",
    rarity: "epic",
    condition: { type: "metric", metric: "reactionForm", gte: 100 },
  }),
  milestone({
    id: "reaction-wall-100",
    title: "Стена команды",
    description: "Получить 100 реакций «Стена»",
    icon: "🛡",
    category: "reputation",
    rarity: "epic",
    condition: { type: "metric", metric: "reactionWall", gte: 100 },
  }),
  milestone({
    id: "reaction-soul-100",
    title: "Душа команды",
    description: "Получить 100 реакций «Душа команды»",
    icon: "❤️",
    category: "reputation",
    rarity: "epic",
    condition: { type: "metric", metric: "reactionSoul", gte: 100 },
  }),
  milestone({
    id: "reaction-accurate-100",
    title: "Снайпер",
    description: "Получить 100 реакций «Точный»",
    icon: "🎯",
    category: "reputation",
    rarity: "epic",
    condition: { type: "metric", metric: "reactionAccurate", gte: 100 },
  }),
  milestone({
    id: "reaction-machine-100",
    title: "Машина",
    description: "Получить 100 реакций «Машина»",
    icon: "💪",
    category: "reputation",
    rarity: "epic",
    condition: { type: "metric", metric: "reactionMachine", gte: 100 },
  }),
];

export const ACHIEVEMENT_BY_ID = new Map(
  ACHIEVEMENT_DEFINITIONS.map((item) => [item.id, item])
);

export function getAchievementDefinition(
  id: string
): AchievementDefinition | null {
  return ACHIEVEMENT_BY_ID.get(id) ?? null;
}
