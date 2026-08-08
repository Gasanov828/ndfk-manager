import type { LineupPosition } from "@/lib/lineup";
import { getLineupPlayers, LINEUP_POSITIONS, type Player } from "@/lib/lineup";
import type { ChampionshipLineupPlayer } from "@/lib/championship/lineup";
import { getFieldPlayers } from "@/lib/championship/lineup";
import type { HomeChampionshipDashboardData } from "@/lib/championship/homeDashboard";
import type { Match } from "@/lib/matches";

export type TacticsFieldPlayer = {
  id: number;
  name: string;
  position: string;
  lineup_slot: LineupPosition;
};

export type TacticsNextMatch = {
  opponent: string;
  date: string;
  time: string;
  location?: string;
} | null;

export function mapClubFieldPlayers(players: Player[]): TacticsFieldPlayer[] {
  return getLineupPlayers(players)
    .filter(
      (player): player is Player & { lineup_position: LineupPosition } =>
        player.lineup_position != null &&
        LINEUP_POSITIONS.includes(player.lineup_position as LineupPosition)
    )
    .map((player) => ({
      id: player.id,
      name: player.name,
      position: player.position,
      lineup_slot: player.lineup_position as LineupPosition,
    }));
}

export function mapChampionshipFieldPlayers(
  squad: ChampionshipLineupPlayer[]
): TacticsFieldPlayer[] {
  return getFieldPlayers(squad)
    .filter((player) => player.lineup_slot != null)
    .map((player) => ({
      id: player.id,
      name: player.name,
      position: player.position,
      lineup_slot: player.lineup_slot as LineupPosition,
    }));
}

export function mapClubNextMatch(match: Match | null): TacticsNextMatch {
  if (!match) return null;
  return {
    opponent: match.opponent,
    date: match.date,
    time: match.time,
    location: match.location,
  };
}

export function mapChampionshipNextMatch(
  nextMatch: HomeChampionshipDashboardData["nextMatch"]
): TacticsNextMatch {
  if (!nextMatch) return null;
  return {
    opponent: nextMatch.opponent,
    date: nextMatch.date,
    time: nextMatch.time,
    location: nextMatch.location,
  };
}
