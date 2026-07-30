/** Константы турнирного режима — без новой БД, поверх существующих матчей. */

export const TOURNAMENT_HOME_TEAM_ID = "ndfk";

export const TOURNAMENT_HOME_TEAM = {
  id: TOURNAMENT_HOME_TEAM_ID,
  name: "ФК Н-Дженгутай",
  shortName: "НДФК",
} as const;

export const TOURNAMENT_TABS = [
  { id: "table", href: "/tournament", label: "Таблица", icon: "🏆" },
  { id: "matches", href: "/tournament/matches", label: "Матчи", icon: "📅" },
  { id: "scorers", href: "/tournament/scorers", label: "Бомбардиры", icon: "⚽" },
  { id: "assists", href: "/tournament/assists", label: "Ассистенты", icon: "🎯" },
  { id: "mvp", href: "/tournament/mvp", label: "MVP", icon: "⭐" },
  { id: "stats", href: "/tournament/stats", label: "Статистика", icon: "📊" },
  { id: "awards", href: "/tournament/awards", label: "Награды", icon: "🏅" },
] as const;

export type TournamentTabId = (typeof TOURNAMENT_TABS)[number]["id"];

export function getTournamentTabId(pathname: string): TournamentTabId {
  if (pathname.startsWith("/tournament/matches")) return "matches";
  if (pathname.startsWith("/tournament/scorers")) return "scorers";
  if (pathname.startsWith("/tournament/assists")) return "assists";
  if (pathname.startsWith("/tournament/mvp")) return "mvp";
  if (pathname.startsWith("/tournament/stats")) return "stats";
  if (pathname.startsWith("/tournament/awards")) return "awards";
  return "table";
}
