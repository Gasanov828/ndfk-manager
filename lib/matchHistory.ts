import { formatMatchDate, formatMatchTime, sortMatchesByDate, type Match } from "@/lib/matches";

export type MatchWithResult = Match & {
  ndfk_goals: number;
  opponent_goals: number;
  is_played: boolean;
};

export type MatchPlayerStat = {
  id: number;
  match_id: number;
  player_id: number;
  goals: number;
  assists: number;
  saves: number;
  player?: {
    id: number;
    name: string;
    position: string;
    rating: number;
  };
};

export type MatchHistoryEntry = MatchWithResult & {
  stats: MatchPlayerStat[];
};

export function getPlayedMatches(matches: MatchWithResult[]): MatchWithResult[] {
  return sortMatchesByDate(
    matches.filter((match) => match.is_played)
  ) as MatchWithResult[];
}

export function getLatestPlayedMatch(
  matches: MatchWithResult[]
): MatchWithResult | null {
  return getPlayedMatches(matches)[0] ?? null;
}

export function getMatchScoreLabel(match: MatchWithResult): string {
  return `${match.ndfk_goals} : ${match.opponent_goals}`;
}

export function getMatchResultLabel(match: MatchWithResult): string {
  if (match.ndfk_goals > match.opponent_goals) return "Победа";
  if (match.ndfk_goals < match.opponent_goals) return "Поражение";
  return "Ничья";
}

export function getResultColor(match: MatchWithResult): string {
  if (match.ndfk_goals > match.opponent_goals) return "text-lime-400";
  if (match.ndfk_goals < match.opponent_goals) return "text-red-300";
  return "text-violet-300";
}

export function getTotalGoalsFromStats(stats: MatchPlayerStat[]): number {
  return stats.reduce((sum, stat) => sum + stat.goals, 0);
}

export function getTotalAssistsFromStats(stats: MatchPlayerStat[]): number {
  return stats.reduce((sum, stat) => sum + stat.assists, 0);
}

export function getTopScorers(stats: MatchPlayerStat[], limit = 3): MatchPlayerStat[] {
  return [...stats]
    .filter((stat) => stat.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, limit);
}

export function getMatchGoalScorers(stats: MatchPlayerStat[]): MatchPlayerStat[] {
  return [...stats]
    .filter((stat) => stat.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists);
}

export function getMatchAssisters(stats: MatchPlayerStat[]): MatchPlayerStat[] {
  return [...stats]
    .filter((stat) => stat.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals);
}

export function formatMatchHeader(match: MatchWithResult): string {
  return `${formatMatchDate(match.date)} · ${formatMatchTime(match.time)} · vs ${match.opponent}`;
}

export function buildPlayerStatMap(
  stats: MatchPlayerStat[]
): Record<number, { goals: number; assists: number; saves: number }> {
  return stats.reduce<
    Record<number, { goals: number; assists: number; saves: number }>
  >((acc, stat) => {
    acc[stat.player_id] = {
      goals: stat.goals,
      assists: stat.assists,
      saves: stat.saves ?? 0,
    };
    return acc;
  }, {});
}

export function hasMatchPlayerStatActivity(stat: {
  goals: number;
  assists: number;
  saves?: number;
}): boolean {
  return stat.goals > 0 || stat.assists > 0 || (stat.saves ?? 0) > 0;
}
