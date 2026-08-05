import type { LineupPosition } from "@/lib/lineup";
import { LINEUP_POSITIONS, LINEUP_SLOT_LABELS } from "@/lib/lineup";
import { getPositionGroup, type PositionGroup } from "@/lib/positionStyles";

export { LINEUP_POSITIONS, LINEUP_SLOT_LABELS };
export type { LineupPosition };

/** 8 в основе + до 5 в запасе = 13 */
export const CHAMPIONSHIP_FIELD_SIZE = 8;
export const CHAMPIONSHIP_BENCH_SIZE = 5;

export type ChampionshipLineupPlayer = {
  id: number;
  name: string;
  position: string;
  rating: number;
  photo_url: string | null;
  lineup_slot: LineupPosition | null;
};

/** Слоты как в клубном составе: НАП сверху, ВРТ снизу */
export const CHAMPIONSHIP_FIELD_SLOTS: Array<{
  position: LineupPosition;
  className: string;
  group: PositionGroup;
}> = [
  {
    position: "НАП1",
    className: "top-[8%] left-[23%] -translate-x-1/2",
    group: "НАП",
  },
  {
    position: "НАП2",
    className: "top-[8%] left-[77%] -translate-x-1/2",
    group: "НАП",
  },
  {
    position: "ЦП1",
    className: "top-[33%] left-[20%] -translate-x-1/2",
    group: "ЦП",
  },
  {
    position: "ЦП2",
    className: "top-[33%] left-[80%] -translate-x-1/2",
    group: "ЦП",
  },
  {
    position: "ЗАЩ1",
    className: "top-[57%] left-[11%] -translate-x-1/2",
    group: "ЗАЩ",
  },
  {
    position: "ЗАЩ2",
    className: "top-[57%] left-1/2 -translate-x-1/2",
    group: "ЗАЩ",
  },
  {
    position: "ЗАЩ3",
    className: "top-[57%] left-[89%] -translate-x-1/2",
    group: "ЗАЩ",
  },
  {
    position: "ВРТ",
    className: "top-[81%] left-1/2 -translate-x-1/2",
    group: "ВРТ",
  },
];

export function getPlayerInSlot(
  squad: ChampionshipLineupPlayer[],
  slot: LineupPosition
): ChampionshipLineupPlayer | undefined {
  return squad.find((player) => player.lineup_slot === slot);
}

export function getFieldPlayers(
  squad: ChampionshipLineupPlayer[]
): ChampionshipLineupPlayer[] {
  return LINEUP_POSITIONS.map((slot) => getPlayerInSlot(squad, slot)).filter(
    (player): player is ChampionshipLineupPlayer => Boolean(player)
  );
}

export function getBenchPlayers(
  squad: ChampionshipLineupPlayer[]
): ChampionshipLineupPlayer[] {
  return squad
    .filter((player) => !player.lineup_slot)
    .sort((a, b) => {
      const byPos = a.position.localeCompare(b.position, "ru");
      return byPos !== 0 ? byPos : b.rating - a.rating;
    });
}

export function preferredGroupForSlot(slot: LineupPosition): PositionGroup {
  return (
    CHAMPIONSHIP_FIELD_SLOTS.find((item) => item.position === slot)?.group ??
    getPositionGroup(slot, slot)
  );
}

export function sortCandidatesForSlot(
  players: ChampionshipLineupPlayer[],
  slot: LineupPosition
): ChampionshipLineupPlayer[] {
  const preferred = preferredGroupForSlot(slot);
  return [...players].sort((a, b) => {
    const aMatch =
      getPositionGroup(null, a.position) === preferred ? 0 : 1;
    const bMatch =
      getPositionGroup(null, b.position) === preferred ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return b.rating - a.rating;
  });
}
