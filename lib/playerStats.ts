import { LINEUP_SLOT_LABELS, type LineupPosition } from "@/lib/lineup";
import { getPositionGroup } from "@/lib/positionStyles";

export type PlayerStatsRow = {
  id: number;
  name: string;
  rating: number;
  goals: number;
  assists: number;
  position: string;
  lineup_position: string | null;
  photo_url?: string | null;
  status: string;
};

export type PlayerWelcomeData = {
  id: number;
  name: string;
  firstName: string;
  rating: number;
  rank: number;
  totalPlayers: number;
  ratingDelta: number | null;
  /** Средняя оценка 1–10 после матча (если уже голосовали) */
  matchVoteScore: number | null;
  goals: number;
  assists: number;
  position: string;
  positionGroup: string;
  lineupLabel: string | null;
  photoUrl: string | null;
  status: string;
  lastMatchLabel: string | null;
};

export function getTimeGreeting(): string {
  return "Добро пожаловать";
}

export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function getRatingRank(
  players: { id: number; rating: number }[],
  playerId: number
): { rank: number; total: number } {
  const sorted = [...players].sort(
    (a, b) => b.rating - a.rating || a.id - b.id
  );
  const index = sorted.findIndex((player) => player.id === playerId);

  return {
    rank: index >= 0 ? index + 1 : sorted.length,
    total: sorted.length,
  };
}

export function getRankLabel(rank: number, total: number): string {
  if (rank === 1) return "🥇 1-е место в команде";
  if (rank === 2) return "🥈 2-е место в команде";
  if (rank === 3) return "🥉 3-е место в команде";
  return `${rank}-е место из ${total}`;
}

export function buildPlayerWelcomeData(
  player: PlayerStatsRow,
  allPlayers: PlayerStatsRow[],
  ratingDelta: number | null | undefined,
  lastMatchLabel: string | null,
  matchVoteScore: number | null | undefined = null
): PlayerWelcomeData {
  const { rank, total } = getRatingRank(allPlayers, player.id);
  const group = getPositionGroup(player.lineup_position, player.position);
  const lineupLabel = player.lineup_position
    ? LINEUP_SLOT_LABELS[player.lineup_position as LineupPosition] ??
      player.lineup_position
    : null;

  return {
    id: player.id,
    name: player.name,
    firstName: getFirstName(player.name),
    rating: player.rating,
    rank,
    totalPlayers: total,
    ratingDelta: ratingDelta ?? null,
    matchVoteScore:
      matchVoteScore != null && Number.isFinite(matchVoteScore)
        ? matchVoteScore
        : null,
    goals: player.goals,
    assists: player.assists,
    position: player.position,
    positionGroup: group,
    lineupLabel,
    photoUrl: player.photo_url ?? null,
    status: player.status,
    lastMatchLabel,
  };
}

export function getStatusLabel(status: string): string {
  if (status === "ready") return "🟢 Готов к игре";
  if (status === "maybe") return "🟡 Под вопросом";
  if (status === "absent") return "🔴 Не придёт";
  return "Статус не указан";
}
