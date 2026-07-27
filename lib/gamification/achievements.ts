import type { PlayerGamificationStats } from "@/lib/gamification/types";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export type AchievementDefinition = {
  key: string;
  title: string;
  emoji: string;
  description: string;
  tier: AchievementTier;
  /** Deterministic predicate over a player's aggregated history. */
  evaluate: (stats: PlayerGamificationStats) => boolean;
};

/**
 * Achievement catalogue. Add new entries here — the evaluation pipeline and UI
 * pick them up automatically, so the system scales without touching the engine.
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: "debut",
    title: "Дебют",
    emoji: "⭐️",
    description: "Получить оценки в первом матче",
    tier: "bronze",
    evaluate: (s) => s.matchesRated >= 1,
  },
  {
    key: "star_of_match",
    title: "Звезда матча",
    emoji: "🏅",
    description: "Стать лучшим игроком матча (MVP)",
    tier: "silver",
    evaluate: (s) => s.mvpCount >= 1,
  },
  {
    key: "on_fire",
    title: "В огне",
    emoji: "🔥",
    description: "Получить оценку 9.0 или выше за матч",
    tier: "silver",
    evaluate: (s) => s.greatCount >= 1,
  },
  {
    key: "perfect_ten",
    title: "Идеал",
    emoji: "💎",
    description: "Получить максимальную оценку 10.0 за матч",
    tier: "gold",
    evaluate: (s) => s.perfectCount >= 1,
  },
  {
    key: "consistency",
    title: "Стабильность",
    emoji: "📈",
    description: "3 матча подряд с оценкой 7.0 и выше",
    tier: "silver",
    evaluate: (s) => s.goodStreak >= 3,
  },
  {
    key: "team_leader",
    title: "Лидер команды",
    emoji: "👑",
    description: "Стать MVP в 3 матчах",
    tier: "gold",
    evaluate: (s) => s.mvpCount >= 3,
  },
  {
    key: "veteran",
    title: "Ветеран",
    emoji: "🎖️",
    description: "Сыграть 10 оценённых матчей",
    tier: "gold",
    evaluate: (s) => s.matchesRated >= 10,
  },
  {
    key: "sniper",
    title: "Снайпер",
    emoji: "⚽️",
    description: "Забить 5 голов за карьеру",
    tier: "silver",
    evaluate: (s) => s.totalGoals >= 5,
  },
  {
    key: "playmaker",
    title: "Ассистент",
    emoji: "🎯",
    description: "Отдать 5 голевых передач за карьеру",
    tier: "silver",
    evaluate: (s) => s.totalAssists >= 5,
  },
  {
    key: "wall",
    title: "Стена",
    emoji: "🧤",
    description: "Сделать 10 сейвов за карьеру",
    tier: "silver",
    evaluate: (s) => s.totalSaves >= 10,
  },
  {
    key: "season_star",
    title: "Звезда сезона",
    emoji: "🌟",
    description: "Средняя оценка за сезон 8.0 и выше (мин. 3 матча)",
    tier: "platinum",
    evaluate: (s) =>
      s.seasons.some(
        (season) => season.matchesRated >= 3 && season.avgRating >= 8
      ),
  },
];

const ACHIEVEMENTS_BY_KEY = new Map(
  ACHIEVEMENTS.map((achievement) => [achievement.key, achievement])
);

export function getAchievementByKey(
  key: string
): AchievementDefinition | undefined {
  return ACHIEVEMENTS_BY_KEY.get(key);
}

export function evaluateEarnedAchievementKeys(
  stats: PlayerGamificationStats
): string[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.evaluate(stats)).map(
    (achievement) => achievement.key
  );
}
