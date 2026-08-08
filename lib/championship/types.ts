export type ChampionshipStatus = "draft" | "active" | "finished";

export type Championship = {
  id: number;
  name: string;
  season: string;
  starts_at: string | null;
  ends_at: string | null;
  status: ChampionshipStatus;
};

export type ChampionshipTeam = {
  id: number;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
};

export type ChampionshipMatch = {
  id: number;
  championship_id: number;
  home_team_id: number;
  away_team_id: number;
  match_date: string;
  match_time: string;
  location: string;
  home_goals: number | null;
  away_goals: number | null;
  is_played: boolean;
  is_live: boolean;
  round_id?: number | null;
  home_team?: ChampionshipTeam | null;
  away_team?: ChampionshipTeam | null;
};

export type ChampionshipSeasonPlayerStat = {
  id: number;
  championship_id: number;
  player_id: number;
  team_id: number;
  matches_played: number;
  goals: number;
  assists: number;
  mvp_count: number;
  rating_sum: number;
  rating_count: number;
  lineup_slot?: string | null;
  player?: {
    id: number;
    name: string;
    position: string;
    photo_url?: string | null;
    rating?: number;
  } | null;
  team?: ChampionshipTeam | null;
};

export type ChampionshipStandingRow = {
  teamId: number;
  teamName: string;
  primaryColor: string;
  isHomeClub: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  positionChange?: number;
};

export const CHAMPIONSHIP_TABS = [
  { id: "table", href: "/championship", label: "Таблица", icon: "🏆" },
  { id: "matches", href: "/championship/matches", label: "Матчи", icon: "📅" },
  { id: "players", href: "/championship/players", label: "Игроки", icon: "👤" },
  { id: "lineup", href: "/championship/lineup", label: "Состав", icon: "👥" },
  { id: "progress", href: "/championship/progress", label: "Прогресс", icon: "⭐" },
  { id: "leaders", href: "/championship/leaders", label: "Лидеры", icon: "📊" },
  { id: "awards", href: "/championship/awards", label: "Призы", icon: "🏅" },
  { id: "tactics", href: "/championship/tactics", label: "Тактика", icon: "⚽" },
  { id: "academy", href: "/championship/academy", label: "\u0423\u0440\u043E\u043A\u0438", icon: "\uD83E\uDDE0" },
] as const;

export type ChampionshipTabId = (typeof CHAMPIONSHIP_TABS)[number]["id"];

export function getChampionshipTabId(pathname: string): ChampionshipTabId {
  if (pathname.startsWith("/championship/matches")) return "matches";
  if (pathname.startsWith("/championship/players")) return "players";
  if (pathname.startsWith("/championship/lineup")) return "lineup";
  if (pathname.startsWith("/championship/progress")) return "progress";
  if (pathname.startsWith("/championship/leaders")) return "leaders";
  if (pathname.startsWith("/championship/scorers")) return "leaders";
  if (pathname.startsWith("/championship/assists")) return "leaders";
  if (pathname.startsWith("/championship/mvp")) return "leaders";
  if (pathname.startsWith("/championship/academy")) return "academy";
  if (pathname.startsWith("/championship/awards")) return "awards";
  if (pathname.startsWith("/championship/stats")) return "awards";
  if (pathname.startsWith("/championship/cards")) return "awards";
  if (pathname.startsWith("/championship/tactics")) return "tactics";
  return "table";
}

export type ChampionshipPlayerProgress = {
  id: number;
  championship_id: number;
  player_id: number;
  team_id: number;
  season_xp: number;
  season_level: number;
  season_rating: number;
  season_cards: number;
  season_rewards: number;
  player?: {
    id: number;
    name: string;
    position: string;
    photo_url?: string | null;
  } | null;
  team?: ChampionshipTeam | null;
};

export type ChampionshipSeasonCard = {
  id: number;
  championship_id: number;
  player_id: number;
  card_code: string;
  card_title: string;
  rarity: string;
  earned_at: string;
};

export type ChampionshipSeasonReward = {
  id: number;
  championship_id: number;
  player_id: number | null;
  team_id: number | null;
  reward_code: string;
  reward_title: string;
  earned_at: string;
};

export type ChampionshipRound = {
  id: number;
  championship_id: number;
  round_number: number;
  title: string | null;
  status: "upcoming" | "active" | "finished";
};

export function avgSeasonRating(stat: ChampionshipSeasonPlayerStat): number {
  if (!stat.rating_count) return 0;
  return Math.round((Number(stat.rating_sum) / stat.rating_count) * 10) / 10;
}
