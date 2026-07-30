export type {
  AchievementCategory,
  AchievementDefinition,
  AchievementProgress,
  AchievementRarity,
  PlayerAchievementStats,
  UnlockedAchievement,
} from "@/lib/achievements/types";

export {
  CATEGORY_LABEL,
  RARITY_LABEL,
} from "@/lib/achievements/types";

export {
  ACHIEVEMENT_DEFINITIONS,
  getAchievementDefinition,
} from "@/lib/achievements/registry";

export {
  buildAchievementProgressList,
  findNewlyEarnedAchievements,
  isAchievementEarned,
} from "@/lib/achievements/evaluate";

export { buildPlayerAchievementStats } from "@/lib/achievements/stats";

export {
  awardPlayerAchievements,
  syncAchievementsForMatch,
  syncPendingMatchAchievements,
} from "@/lib/achievements/sync";
