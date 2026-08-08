import type { LineupPosition } from "@/lib/lineup";
import { LINEUP_POSITIONS, LINEUP_SLOT_LABELS } from "@/lib/lineup";
import {
  DEFAULT_LINEUP_FORMATION_ID,
  getChampionshipFieldSlots,
  preferredGroupForSlot,
} from "@/lib/lineupFormations";
import { getPositionGroup, type PositionGroup } from "@/lib/positionStyles";

export { LINEUP_POSITIONS, LINEUP_SLOT_LABELS, preferredGroupForSlot };
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

/** Default slot layout (1–3–3–1) — use getChampionshipFieldSlots() for active formation */
export const CHAMPIONSHIP_FIELD_SLOTS = getChampionshipFieldSlots(
  DEFAULT_LINEUP_FORMATION_ID
);

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
