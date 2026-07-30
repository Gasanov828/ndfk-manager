import type {
  AchievementCondition,
  AchievementDefinition,
  AchievementMetric,
  AchievementProgress,
  PlayerAchievementStats,
} from "@/lib/achievements/types";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/achievements/registry";

export function evaluateCondition(
  condition: AchievementCondition,
  stats: PlayerAchievementStats
): boolean {
  switch (condition.type) {
    case "metric":
      return (stats[condition.metric] ?? 0) >= condition.gte;
    case "position":
      return (
        stats.positionGroup != null &&
        condition.groups.includes(stats.positionGroup)
      );
    case "and":
      return condition.of.every((item) => evaluateCondition(item, stats));
    case "or":
      return condition.of.some((item) => evaluateCondition(item, stats));
    default:
      return false;
  }
}

/** Главная метрика условия — для шкалы прогресса в UI */
export function primaryMetricFromCondition(
  condition: AchievementCondition
): { metric: AchievementMetric; target: number } | null {
  if (condition.type === "metric") {
    return { metric: condition.metric, target: condition.gte };
  }
  if (condition.type === "and" || condition.type === "or") {
    for (const child of condition.of) {
      const found = primaryMetricFromCondition(child);
      if (found) return found;
    }
  }
  return null;
}

export function isAchievementEarned(
  definition: AchievementDefinition,
  stats: PlayerAchievementStats
): boolean {
  return evaluateCondition(definition.condition, stats);
}

/** Какие из реестра ещё не получены, но уже выполнены */
export function findNewlyEarnedAchievements(
  stats: PlayerAchievementStats,
  alreadyUnlockedIds: Set<string>
): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter(
    (def) =>
      !alreadyUnlockedIds.has(def.id) && isAchievementEarned(def, stats)
  );
}

export function buildAchievementProgressList(
  stats: PlayerAchievementStats,
  unlocked: Map<string, string>
): AchievementProgress[] {
  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const primary = primaryMetricFromCondition(def.condition);
    const current = primary ? stats[primary.metric] ?? 0 : 0;
    const target = primary?.target ?? 1;
    const earned = unlocked.has(def.id) || isAchievementEarned(def, stats);

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      rarity: def.rarity,
      xp: def.xp,
      unlockedAt: unlocked.get(def.id) ?? "",
      earned,
      current: Math.min(current, target),
      target,
    };
  });
}
