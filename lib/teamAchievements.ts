import type { CommonAchievement, CommonAchievementStatus } from "@/lib/careerMock";
import type { Match } from "@/lib/matches";
import { sortMatchesByDate } from "@/lib/matches";

export type TeamAchievementTrack =
  | "goals"
  | "wins"
  | "win_streak"
  | "clean_sheets"
  | "mvp"
  | "season";

export type TeamSeasonStats = {
  goals: number;
  wins: number;
  winStreak: number;
  cleanSheets: number;
  mvpCount: number;
  played: number;
};

export type TeamAchievementDef = {
  id: string;
  track: TeamAchievementTrack;
  trackLabel: string;
  icon: string;
  title: string;
  description: string;
  target: number;
  metric: keyof TeamSeasonStats;
};

/** Цепочки командных достижений — от простого к сложному */
export const TEAM_ACHIEVEMENT_DEFS: TeamAchievementDef[] = [
  // Голы
  {
    id: "team-goals-15",
    track: "goals",
    trackLabel: "Голы клуба",
    icon: "⚽",
    title: "15 голов",
    description: "NDFK забил 15 голов за сезон",
    target: 15,
    metric: "goals",
  },
  {
    id: "team-goals-30",
    track: "goals",
    trackLabel: "Голы клуба",
    icon: "⚽",
    title: "30 голов",
    description: "NDFK забил 30 голов за сезон",
    target: 30,
    metric: "goals",
  },
  {
    id: "team-goals-50",
    track: "goals",
    trackLabel: "Голы клуба",
    icon: "🔥",
    title: "50 голов",
    description: "NDFK забил 50 голов за сезон",
    target: 50,
    metric: "goals",
  },
  {
    id: "team-goals-75",
    track: "goals",
    trackLabel: "Голы клуба",
    icon: "💥",
    title: "75 голов",
    description: "NDFK забил 75 голов за сезон",
    target: 75,
    metric: "goals",
  },
  // Победы
  {
    id: "team-wins-5",
    track: "wins",
    trackLabel: "Победы",
    icon: "💚",
    title: "5 побед",
    description: "Команда одержала 5 побед в сезоне",
    target: 5,
    metric: "wins",
  },
  {
    id: "team-wins-10",
    track: "wins",
    trackLabel: "Победы",
    icon: "🏆",
    title: "10 побед",
    description: "Команда одержала 10 побед в сезоне",
    target: 10,
    metric: "wins",
  },
  // Серия побед
  {
    id: "team-streak-3",
    track: "win_streak",
    trackLabel: "Серия побед",
    icon: "⚡",
    title: "3 подряд",
    description: "Выиграть 3 матча подряд",
    target: 3,
    metric: "winStreak",
  },
  {
    id: "team-streak-5",
    track: "win_streak",
    trackLabel: "Серия побед",
    icon: "🔥",
    title: "5 подряд",
    description: "Выиграть 5 матчей подряд",
    target: 5,
    metric: "winStreak",
  },
  // Сухие
  {
    id: "team-clean-3",
    track: "clean_sheets",
    trackLabel: "Сухие матчи",
    icon: "🧤",
    title: "3 на ноль",
    description: "Сыграть 3 матча без пропущенных голов",
    target: 3,
    metric: "cleanSheets",
  },
  {
    id: "team-clean-5",
    track: "clean_sheets",
    trackLabel: "Сухие матчи",
    icon: "🧱",
    title: "5 на ноль",
    description: "Сыграть 5 матчей без пропущенных голов",
    target: 5,
    metric: "cleanSheets",
  },
  {
    id: "team-clean-10",
    track: "clean_sheets",
    trackLabel: "Сухие матчи",
    icon: "🏰",
    title: "10 на ноль",
    description: "Сыграть 10 матчей без пропущенных голов",
    target: 10,
    metric: "cleanSheets",
  },
  // MVP
  {
    id: "team-mvp-board",
    track: "mvp",
    trackLabel: "MVP клуба",
    icon: "🏅",
    title: "5 MVP",
    description: "Собрать 5 подтверждённых MVP матчей клуба",
    target: 5,
    metric: "mvpCount",
  },
  // Сезон
  {
    id: "team-season-20",
    track: "season",
    trackLabel: "Календарь",
    icon: "📅",
    title: "20 матчей",
    description: "Пройти 20 официальных матчей сезона",
    target: 20,
    metric: "played",
  },
  {
    id: "team-season-30",
    track: "season",
    trackLabel: "Календарь",
    icon: "❤️",
    title: "Полный сезон",
    description: "Пройти полный календарь сезона вместе",
    target: 30,
    metric: "played",
  },
];

export const TEAM_TRACK_ORDER: TeamAchievementTrack[] = [
  "goals",
  "wins",
  "win_streak",
  "clean_sheets",
  "mvp",
  "season",
];

function isWin(match: Match): boolean {
  return (
    match.ndfk_goals != null &&
    match.opponent_goals != null &&
    match.ndfk_goals > match.opponent_goals
  );
}

function isCleanSheet(match: Match): boolean {
  return match.opponent_goals === 0;
}

export function getCurrentWinStreak(matches: Match[]): number {
  const played = sortMatchesByDate(matches).filter(
    (match) =>
      match.is_played &&
      match.ndfk_goals != null &&
      match.opponent_goals != null
  );

  let streak = 0;
  for (const match of played) {
    if (isWin(match)) streak += 1;
    else break;
  }
  return streak;
}

export function buildTeamSeasonStats(
  matches: Match[],
  players: { goals: number }[],
  mvpCount: number
): TeamSeasonStats {
  const playedMatches = matches.filter(
    (match) =>
      match.is_played &&
      match.ndfk_goals != null &&
      match.opponent_goals != null
  );

  return {
    goals: players.reduce((sum, player) => sum + (player.goals || 0), 0),
    wins: playedMatches.filter(isWin).length,
    winStreak: getCurrentWinStreak(matches),
    cleanSheets: playedMatches.filter(isCleanSheet).length,
    mvpCount,
    played: playedMatches.length,
  };
}

function statusFor(
  current: number,
  target: number,
  previousEarned: boolean
): CommonAchievementStatus {
  if (current >= target) return "earned";
  if (!previousEarned) return "locked";
  return "progress";
}

export function resolveTeamAchievements(
  stats: TeamSeasonStats
): CommonAchievement[] {
  const byTrack = new Map<TeamAchievementTrack, TeamAchievementDef[]>();
  for (const def of TEAM_ACHIEVEMENT_DEFS) {
    const list = byTrack.get(def.track) ?? [];
    list.push(def);
    byTrack.set(def.track, list);
  }

  const result: CommonAchievement[] = [];

  for (const track of TEAM_TRACK_ORDER) {
    const defs = byTrack.get(track) ?? [];
    let previousEarned = true;

    for (const def of defs) {
      const current = Math.min(stats[def.metric], def.target);
      const raw = stats[def.metric];
      const status = statusFor(raw, def.target, previousEarned);

      result.push({
        id: def.id,
        scope: "team",
        icon: def.icon,
        title: def.title,
        description: def.description,
        current: status === "locked" ? 0 : current,
        target: def.target,
        status,
        track: def.track,
        trackLabel: def.trackLabel,
      });

      previousEarned = raw >= def.target;
    }
  }

  return result;
}

/** Следующие незакрытые цели клуба для главной */
export function getNextTeamAchievements(
  achievements: CommonAchievement[],
  limit = 3
): CommonAchievement[] {
  const inProgress = achievements.filter((item) => item.status === "progress");
  if (inProgress.length >= limit) return inProgress.slice(0, limit);

  const locked = achievements.filter((item) => item.status === "locked");
  return [...inProgress, ...locked].slice(0, limit);
}

export function groupTeamAchievementsByTrack(
  achievements: CommonAchievement[]
): { track: TeamAchievementTrack; label: string; items: CommonAchievement[] }[] {
  const groups: {
    track: TeamAchievementTrack;
    label: string;
    items: CommonAchievement[];
  }[] = [];

  for (const track of TEAM_TRACK_ORDER) {
    const items = achievements.filter((item) => item.track === track);
    if (items.length === 0) continue;
    groups.push({
      track,
      label: items[0].trackLabel ?? track,
      items,
    });
  }

  return groups;
}
