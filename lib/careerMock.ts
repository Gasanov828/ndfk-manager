import type { PositionGroup } from "@/lib/positionStyles";

export type CareerTitleStatus = "earned" | "current" | "progress" | "locked";

export type CareerTitle = {
  id: string;
  level: number;
  icon: string;
  title: string;
  description: string;
  current: number;
  target: number;
  status: CareerTitleStatus;
  rarity: "common" | "rare" | "epic" | "legend";
};

export type AchievementScope = "personal" | "team";

export type CommonAchievementStatus = "earned" | "progress" | "locked";

export type CommonAchievement = {
  id: string;
  scope: AchievementScope;
  icon: string;
  title: string;
  description: string;
  current: number;
  target: number;
  status: CommonAchievementStatus;
  /** Only for team achievements */
  track?: string;
  trackLabel?: string;
};

export type CareerPathMeta = {
  group: PositionGroup;
  pathTitle: string;
  pathIcon: string;
};

export const CAREER_PATH_META: Record<PositionGroup, CareerPathMeta> = {
  ЗАЩ: {
    group: "ЗАЩ",
    pathTitle: "Карьера защитника",
    pathIcon: "🛡",
  },
  НАП: {
    group: "НАП",
    pathTitle: "Карьера нападающего",
    pathIcon: "⚽",
  },
  ЦП: {
    group: "ЦП",
    pathTitle: "Карьера полузащитника",
    pathIcon: "🎯",
  },
  ВРТ: {
    group: "ВРТ",
    pathTitle: "Карьера вратаря",
    pathIcon: "🧤",
  },
};

/** Mock ladders — personal path by position */
export const CAREER_LADDERS: Record<PositionGroup, CareerTitle[]> = {
  ЗАЩ: [
    {
      id: "def-rookie",
      level: 1,
      icon: "🟢",
      title: "Новобранец",
      description: "Сыграть первый матч в защите",
      current: 1,
      target: 1,
      status: "earned",
      rarity: "common",
    },
    {
      id: "def-anchor",
      level: 2,
      icon: "⚓",
      title: "Якорь",
      description: "3 матча в обороне без крупных ошибок",
      current: 3,
      target: 3,
      status: "earned",
      rarity: "common",
    },
    {
      id: "def-wall",
      level: 3,
      icon: "🛡",
      title: "Стена",
      description: "5 матчей в защите без крупных провалов",
      current: 5,
      target: 5,
      status: "earned",
      rarity: "common",
    },
    {
      id: "def-iron",
      level: 4,
      icon: "⛓",
      title: "Железный защитник",
      description: "100 успешных отборов",
      current: 68,
      target: 100,
      status: "progress",
      rarity: "rare",
    },
    {
      id: "def-stopper",
      level: 5,
      icon: "🛑",
      title: "Стоппер",
      description: "Перехватить 40 передач за сезон",
      current: 0,
      target: 40,
      status: "locked",
      rarity: "rare",
    },
    {
      id: "def-keeper",
      level: 6,
      icon: "👑",
      title: "Хранитель обороны",
      description: "15 сухих матчей в линии защиты",
      current: 0,
      target: 15,
      status: "locked",
      rarity: "epic",
    },
    {
      id: "def-marshal",
      level: 7,
      icon: "🪖",
      title: "Маршал линии",
      description: "Возглавить оборону в 10 матчах подряд",
      current: 0,
      target: 10,
      status: "locked",
      rarity: "epic",
    },
    {
      id: "def-legend",
      level: 8,
      icon: "💎",
      title: "Легенда защиты",
      description: "Стать символом обороны клуба",
      current: 0,
      target: 1,
      status: "locked",
      rarity: "legend",
    },
  ],
  НАП: [
    {
      id: "fwd-rookie",
      level: 1,
      icon: "🟢",
      title: "Новобранец",
      description: "Сыграть первый матч в нападении",
      current: 1,
      target: 1,
      status: "earned",
      rarity: "common",
    },
    {
      id: "fwd-spark",
      level: 2,
      icon: "✨",
      title: "Искра",
      description: "Забить первый гол за команду",
      current: 1,
      target: 1,
      status: "earned",
      rarity: "common",
    },
    {
      id: "fwd-finisher",
      level: 3,
      icon: "⚽",
      title: "Остриё",
      description: "Забить 5 голов за команду",
      current: 5,
      target: 5,
      status: "earned",
      rarity: "common",
    },
    {
      id: "fwd-sniper",
      level: 4,
      icon: "🎯",
      title: "Снайпер",
      description: "Забить 15 голов за сезон",
      current: 9,
      target: 15,
      status: "progress",
      rarity: "rare",
    },
    {
      id: "fwd-hat",
      level: 5,
      icon: "🎩",
      title: "Хет-трик",
      description: "Оформить первый хет-трик",
      current: 0,
      target: 1,
      status: "locked",
      rarity: "rare",
    },
    {
      id: "fwd-king",
      level: 6,
      icon: "👑",
      title: "Король штрафной",
      description: "Сделать 5 дублей",
      current: 0,
      target: 5,
      status: "locked",
      rarity: "epic",
    },
    {
      id: "fwd-hunter",
      level: 7,
      icon: "🏹",
      title: "Охотник",
      description: "Забить в 8 матчах подряд",
      current: 0,
      target: 8,
      status: "locked",
      rarity: "epic",
    },
    {
      id: "fwd-legend",
      level: 8,
      icon: "💎",
      title: "Легенда атаки",
      description: "Стать главным бомбардиром эпохи",
      current: 0,
      target: 1,
      status: "locked",
      rarity: "legend",
    },
  ],
  ЦП: [
    {
      id: "mid-rookie",
      level: 1,
      icon: "🟢",
      title: "Новобранец",
      description: "Сыграть первый матч в центре",
      current: 1,
      target: 1,
      status: "earned",
      rarity: "common",
    },
    {
      id: "mid-link",
      level: 2,
      icon: "🔗",
      title: "Связка",
      description: "Отдать первую голевую передачу",
      current: 1,
      target: 1,
      status: "earned",
      rarity: "common",
    },
    {
      id: "mid-engine",
      level: 3,
      icon: "⚙️",
      title: "Мотор команды",
      description: "Отдать 8 голевых передач",
      current: 8,
      target: 8,
      status: "earned",
      rarity: "common",
    },
    {
      id: "mid-conductor",
      level: 4,
      icon: "🎼",
      title: "Дирижёр",
      description: "Отдать 20 ассистов за сезон",
      current: 12,
      target: 20,
      status: "progress",
      rarity: "rare",
    },
    {
      id: "mid-pulse",
      level: 5,
      icon: "💓",
      title: "Пульс центра",
      description: "Гол или пас в 10 матчах",
      current: 0,
      target: 10,
      status: "locked",
      rarity: "rare",
    },
    {
      id: "mid-maestro",
      level: 6,
      icon: "👑",
      title: "Маэстро",
      description: "Гол + пас в 5 разных матчах",
      current: 0,
      target: 5,
      status: "locked",
      rarity: "epic",
    },
    {
      id: "mid-architect",
      level: 7,
      icon: "🏗",
      title: "Архитектор",
      description: "Ключевые передачи в 12 матчах сезона",
      current: 0,
      target: 12,
      status: "locked",
      rarity: "epic",
    },
    {
      id: "mid-legend",
      level: 8,
      icon: "💎",
      title: "Легенда центра",
      description: "Стать сердцем игровой схемы клуба",
      current: 0,
      target: 1,
      status: "locked",
      rarity: "legend",
    },
  ],
  ВРТ: [
    {
      id: "gk-rookie",
      level: 1,
      icon: "🟢",
      title: "Новобранец",
      description: "Сыграть первый матч в воротах",
      current: 1,
      target: 1,
      status: "earned",
      rarity: "common",
    },
    {
      id: "gk-gloves",
      level: 2,
      icon: "✋",
      title: "Перчатки",
      description: "Сделать 10 сейвов",
      current: 10,
      target: 10,
      status: "earned",
      rarity: "common",
    },
    {
      id: "gk-safe",
      level: 3,
      icon: "🧤",
      title: "Надёжный",
      description: "Отыграть 3 сухих матча",
      current: 3,
      target: 3,
      status: "earned",
      rarity: "common",
    },
    {
      id: "gk-wall",
      level: 4,
      icon: "🧱",
      title: "Стена",
      description: "Сделать 50 сейвов",
      current: 31,
      target: 50,
      status: "progress",
      rarity: "rare",
    },
    {
      id: "gk-reflex",
      level: 5,
      icon: "⚡",
      title: "Рефлекс",
      description: "Спасти 5 пенальти / 1v1 за сезон",
      current: 0,
      target: 5,
      status: "locked",
      rarity: "rare",
    },
    {
      id: "gk-guardian",
      level: 6,
      icon: "👑",
      title: "Страж ворот",
      description: "10 сухих матчей за сезон",
      current: 0,
      target: 10,
      status: "locked",
      rarity: "epic",
    },
    {
      id: "gk-fortress",
      level: 7,
      icon: "🏰",
      title: "Крепость",
      description: "Серия из 4 сухих матчей подряд",
      current: 0,
      target: 4,
      status: "locked",
      rarity: "epic",
    },
    {
      id: "gk-legend",
      level: 8,
      icon: "💎",
      title: "Легенда ворот",
      description: "Стать символом надежности клуба",
      current: 0,
      target: 1,
      status: "locked",
      rarity: "legend",
    },
  ],
};

/** Личные награды — резолвятся из оценок в lib/personalAchievements.ts */
export const PERSONAL_ACHIEVEMENTS: CommonAchievement[] = [];

/** Командные — резолвятся из статистики в lib/teamAchievements.ts */
export const TEAM_ACHIEVEMENTS: CommonAchievement[] = [];

/** @deprecated use resolvePersonalAchievements + resolveTeamAchievements */
export const COMMON_ACHIEVEMENTS: CommonAchievement[] = [];

export function resolveCareerGroup(
  positionGroup: string | null | undefined
): PositionGroup {
  if (
    positionGroup === "НАП" ||
    positionGroup === "ЦП" ||
    positionGroup === "ЗАЩ" ||
    positionGroup === "ВРТ"
  ) {
    return positionGroup;
  }
  return "ЦП";
}

export function getCurrentCareerTitle(ladder: CareerTitle[]): CareerTitle | null {
  const current = ladder.find((item) => item.status === "current");
  if (current) return current;

  const inProgress = ladder.find((item) => item.status === "progress");
  if (inProgress) return inProgress;

  const earned = ladder.filter((item) => item.status === "earned");
  return earned.length > 0 ? earned[earned.length - 1] : ladder[0] ?? null;
}

export function getNextCareerTitle(ladder: CareerTitle[]): CareerTitle | null {
  const current = getCurrentCareerTitle(ladder);
  if (!current) {
    return ladder.find((item) => item.status === "locked") ?? null;
  }

  const currentIndex = ladder.findIndex((item) => item.id === current.id);
  if (currentIndex < 0) return null;

  // If current is still in progress, "next" is the following locked level
  if (current.status === "progress") {
    return (
      ladder.slice(currentIndex + 1).find((item) => item.status === "locked") ??
      ladder[currentIndex + 1] ??
      null
    );
  }

  return (
    ladder
      .slice(currentIndex + 1)
      .find(
        (item) =>
          item.status === "progress" ||
          item.status === "locked" ||
          item.status === "current"
      ) ?? null
  );
}

export function getLadderLevelProgress(ladder: CareerTitle[]): {
  cleared: number;
  total: number;
  activeLevel: number;
  pct: number;
} {
  const cleared = ladder.filter(
    (item) => item.status === "earned" || item.status === "current"
  ).length;
  const active =
    ladder.find((item) => item.status === "progress") ??
    ladder.find((item) => item.status === "locked") ??
    ladder[ladder.length - 1];
  const total = ladder.length;
  const base = cleared;
  const partial =
    active && active.status === "progress" && active.target > 0
      ? Math.min(0.95, active.current / active.target)
      : 0;
  const pct = Math.min(100, Math.round(((base + partial) / total) * 100));

  return {
    cleared,
    total,
    activeLevel: active?.level ?? cleared,
    pct,
  };
}
