import { getPositionGroup, type PositionGroup } from "@/lib/positionStyles";

export type LineupPosition =
  | "НАП1"
  | "НАП2"
  | "ЦП1"
  | "ЦП2"
  | "ЗАЩ1"
  | "ЗАЩ2"
  | "ЗАЩ3"
  | "ВРТ";

export const LINEUP_POSITIONS: LineupPosition[] = [
  "НАП1",
  "НАП2",
  "ЦП1",
  "ЦП2",
  "ЗАЩ1",
  "ЗАЩ2",
  "ЗАЩ3",
  "ВРТ",
];

export const LINEUP_SLOT_LABELS: Record<LineupPosition, string> = {
  НАП1: "Нап 1",
  НАП2: "Нап 2",
  ЦП1: "ЦП 1",
  ЦП2: "ЦП 2",
  ЗАЩ1: "Защ 1",
  ЗАЩ2: "Защ 2",
  ЗАЩ3: "Защ 3",
  ВРТ: "Вратарь",
};

export type Player = {
  id: number;
  name: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  status: string;
  lineup_position: string | null;
  photo_url?: string | null;
};

export function getLineupPlayers(players: Player[]): Player[] {
  return LINEUP_POSITIONS.map((slot) =>
    players.find((player) => player.lineup_position === slot)
  ).filter((player): player is Player => Boolean(player));
}

export function getFieldPlayerIds(players: Player[]): Set<number> {
  return new Set(getLineupPlayers(players).map((player) => player.id));
}

export function isOnField(player: Player, players: Player[]): boolean {
  return getFieldPlayerIds(players).has(player.id);
}

export function getBenchPlayers(players: Player[]): Player[] {
  const fieldIds = getFieldPlayerIds(players);

  return players
    .filter((player) => !fieldIds.has(player.id))
    .sort((a, b) => b.rating - a.rating);
}

export function getDuplicateLineupPlayers(players: Player[]): Player[] {
  const fieldIds = getFieldPlayerIds(players);

  return players.filter(
    (player) =>
      player.lineup_position &&
      LINEUP_POSITIONS.includes(player.lineup_position as LineupPosition) &&
      !fieldIds.has(player.id)
  );
}

export function getAverageLineupRating(players: Player[]): number {
  const lineup = getLineupPlayers(players);
  if (lineup.length === 0) return 0;
  return lineup.reduce((sum, player) => sum + player.rating, 0) / lineup.length;
}

export function getPlayerByLineupSlot(
  players: Player[],
  slot: LineupPosition
): Player | undefined {
  return players.find((player) => player.lineup_position === slot);
}

export function getEmptyLineupSlots(players: Player[]): LineupPosition[] {
  return LINEUP_POSITIONS.filter((slot) => !getPlayerByLineupSlot(players, slot));
}

export function countLineupByStatus(players: Player[], status: string): number {
  return getLineupPlayers(players).filter((player) => player.status === status)
    .length;
}

export function getLineGroupAverage(
  players: Player[],
  group: PositionGroup
): number | null {
  const groupPlayers = getLineupPlayers(players).filter(
    (player) =>
      getPositionGroup(player.lineup_position, player.position) === group
  );

  if (groupPlayers.length === 0) return null;

  const total = groupPlayers.reduce((sum, player) => sum + player.rating, 0);
  return Math.round((total / groupPlayers.length) * 10) / 10;
}

export function getSuggestedPlayerForSlot(
  players: Player[],
  slot: LineupPosition
): Player | null {
  const slotGroup = getPositionGroup(slot, slot.slice(0, 3));
  const bench = getBenchPlayers(players);

  const sameGroup = bench.filter(
    (player) => getPositionGroup(null, player.position) === slotGroup
  );

  const pool = sameGroup.length > 0 ? sameGroup : bench;
  return pool[0] ?? null;
}
