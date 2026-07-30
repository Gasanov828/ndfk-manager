export type AchievementCategoryId =
  | "defender"
  | "forward"
  | "midfielder"
  | "goalkeeper"
  | "team"
  | "special";

export type AchievementStatus = "earned" | "progress";

export type AchievementItem = {
  id: string;
  categoryId: AchievementCategoryId;
  title: string;
  description: string;
  current: number;
  target: number;
  status: AchievementStatus;
};

export type AchievementCategory = {
  id: AchievementCategoryId;
  label: string;
  icon: string;
};

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  { id: "defender", label: "Защитник", icon: "🛡️" },
  { id: "forward", label: "Нападающий", icon: "⚽" },
  { id: "midfielder", label: "Полузащитник", icon: "🎯" },
  { id: "goalkeeper", label: "Вратарь", icon: "🧤" },
  { id: "team", label: "Командные", icon: "👥" },
  { id: "special", label: "Особые", icon: "✨" },
];

/** Mock UI data only — no DB / auto-award yet */
export const MOCK_ACHIEVEMENTS: AchievementItem[] = [
  {
    id: "def-1",
    categoryId: "defender",
    title: "Стена",
    description: "Сыграть 5 матчей в защите без пропущенных голов",
    current: 5,
    target: 5,
    status: "earned",
  },
  {
    id: "def-2",
    categoryId: "defender",
    title: "Первый отбор",
    description: "Сделать 10 успешных отборов за сезон",
    current: 6,
    target: 10,
    status: "progress",
  },
  {
    id: "def-3",
    categoryId: "defender",
    title: "Железная линия",
    description: "3 матча подряд в старте на позиции защитника",
    current: 2,
    target: 3,
    status: "progress",
  },
  {
    id: "fwd-1",
    categoryId: "forward",
    title: "Первый гол",
    description: "Забить первый гол за команду",
    current: 1,
    target: 1,
    status: "earned",
  },
  {
    id: "fwd-2",
    categoryId: "forward",
    title: "Снайпер",
    description: "Забить 10 голов за сезон",
    current: 4,
    target: 10,
    status: "progress",
  },
  {
    id: "fwd-3",
    categoryId: "forward",
    title: "Дубль",
    description: "Забить 2 гола в одном матче",
    current: 0,
    target: 1,
    status: "progress",
  },
  {
    id: "mid-1",
    categoryId: "midfielder",
    title: "Ассистент",
    description: "Отдать 5 голевых передач",
    current: 5,
    target: 5,
    status: "earned",
  },
  {
    id: "mid-2",
    categoryId: "midfielder",
    title: "Дирижёр",
    description: "Отдать 15 передач за сезон",
    current: 8,
    target: 15,
    status: "progress",
  },
  {
    id: "mid-3",
    categoryId: "midfielder",
    title: "Гол + пас",
    description: "Голевая + ассист в одном матче",
    current: 0,
    target: 1,
    status: "progress",
  },
  {
    id: "gk-1",
    categoryId: "goalkeeper",
    title: "Сухой матч",
    description: "Отыграть матч на ноль",
    current: 1,
    target: 1,
    status: "earned",
  },
  {
    id: "gk-2",
    categoryId: "goalkeeper",
    title: "Сейвер",
    description: "Сделать 20 сейвов за сезон",
    current: 11,
    target: 20,
    status: "progress",
  },
  {
    id: "gk-3",
    categoryId: "goalkeeper",
    title: "Стена ворот",
    description: "3 сухих матча подряд",
    current: 1,
    target: 3,
    status: "progress",
  },
  {
    id: "team-1",
    categoryId: "team",
    title: "Командный дух",
    description: "Принять участие в 10 матчах команды",
    current: 10,
    target: 10,
    status: "earned",
  },
  {
    id: "team-2",
    categoryId: "team",
    title: "Победа",
    description: "Выиграть 5 матчей в составе",
    current: 3,
    target: 5,
    status: "progress",
  },
  {
    id: "team-3",
    categoryId: "team",
    title: "На поле",
    description: "Быть в стартовом составе 8 раз",
    current: 5,
    target: 8,
    status: "progress",
  },
  {
    id: "spec-1",
    categoryId: "special",
    title: "MVP матча",
    description: "Стать игроком матча по итогам голосования",
    current: 0,
    target: 1,
    status: "progress",
  },
  {
    id: "spec-2",
    categoryId: "special",
    title: "Оценка 9+",
    description: "Получить среднюю оценку 9.0 и выше",
    current: 0,
    target: 1,
    status: "progress",
  },
  {
    id: "spec-3",
    categoryId: "special",
    title: "Легенда клуба",
    description: "Собрать 15 достижений",
    current: 6,
    target: 15,
    status: "progress",
  },
];

export function getAchievementsProgress(items: AchievementItem[]) {
  const total = items.length;
  const earned = items.filter((item) => item.status === "earned").length;
  const percent = total > 0 ? Math.round((earned / total) * 100) : 0;
  return { total, earned, percent };
}
