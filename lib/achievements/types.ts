export type AchievementRarity = "common" | "rare" | "epic" | "legend";

export type AchievementCategory =
  | "matches"
  | "goals"
  | "assists"
  | "defense"
  | "goalkeeper"
  | "rating"
  | "mvp"
  | "ovr"
  | "club"
  | "special";

/** Метрики, которые считает билдер статистики — добавляй сюда новые поля */
export type AchievementMetric =
  | "matchesPlayed"
  | "wins"
  | "losses"
  | "goals"
  | "assists"
  | "mvpCount"
  | "avgMatchRating"
  | "bestMatchRating"
  | "ovr"
  | "tackles"
  | "interceptions"
  | "cleanSheets"
  | "consecutiveMatches"
  | "winStreak"
  | "clubMatches";

export type AchievementCondition =
  | { type: "metric"; metric: AchievementMetric; gte: number }
  | { type: "position"; groups: Array<"ЗАЩ" | "НАП" | "ЦП" | "ВРТ"> }
  | { type: "and"; of: AchievementCondition[] }
  | { type: "or"; of: AchievementCondition[] };

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xp: number;
  condition: AchievementCondition;
};

export type PlayerAchievementStats = Record<AchievementMetric, number> & {
  positionGroup: "ЗАЩ" | "НАП" | "ЦП" | "ВРТ" | null;
};

export type UnlockedAchievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xp: number;
  unlockedAt: string;
};

export type AchievementProgress = UnlockedAchievement & {
  earned: boolean;
  current: number;
  target: number;
};

export const RARITY_LABEL: Record<AchievementRarity, string> = {
  common: "Обычное",
  rare: "Редкое",
  epic: "Эпическое",
  legend: "Легендарное",
};

export const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  matches: "Матчи",
  goals: "Голы",
  assists: "Ассисты",
  defense: "Защита",
  goalkeeper: "Вратари",
  rating: "Средняя оценка",
  mvp: "MVP",
  ovr: "Рейтинг",
  club: "Клуб",
  special: "Особые",
};
