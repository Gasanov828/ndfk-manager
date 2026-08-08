import type { LineupPosition } from "@/lib/lineup";
import {
  getLineupPlayers,
  LINEUP_POSITIONS,
  LINEUP_SLOT_LABELS,
  type Player,
} from "@/lib/lineup";
import type { ChampionshipLineupPlayer } from "@/lib/championship/lineup";
import { getFieldPlayers } from "@/lib/championship/lineup";
import type { HomeChampionshipDashboardData } from "@/lib/championship/homeDashboard";
import type { Match } from "@/lib/matches";
import { getFirstName } from "@/lib/playerStats";
import type { SlotTactics } from "@/lib/championship/tacticsContent";
import { getLineupFormation, type LineupFormationId } from "@/lib/lineupFormations";

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

export type SlotNameMap = Partial<Record<LineupPosition, string>>;

const SLOT_REPLACE_ORDER: LineupPosition[] = [
  "ЗАЩ1",
  "ЗАЩ2",
  "ЗАЩ3",
  "НАП1",
  "НАП2",
  "ЦП1",
  "ЦП2",
  "ВРТ",
];

const ROLE_SLOT_GROUPS: Record<string, LineupPosition[]> = {
  ВРТ: ["ВРТ"],
  ЗАЩ: ["ЗАЩ1", "ЗАЩ2", "ЗАЩ3"],
  ЦП: ["ЦП1", "ЦП2"],
  НАП: ["НАП1", "НАП2"],
  НАП1: ["НАП1"],
};

export function buildSlotNameMap(
  fieldPlayers: TacticsFieldPlayer[]
): SlotNameMap {
  const map: SlotNameMap = {};
  for (const player of fieldPlayers) {
    map[player.lineup_slot] = getFirstName(player.name);
  }
  return map;
}

export function personalizeTacticsLine(
  line: string,
  slotNames: SlotNameMap
): string {
  let result = line;

  for (const slot of SLOT_REPLACE_ORDER) {
    const name = slotNames[slot];
    if (!name) continue;
    result = result.replaceAll(slot, name);
    result = result.replaceAll(LINEUP_SLOT_LABELS[slot], name);
  }

  return result;
}

export function personalizeTacticsItems(
  items: string[],
  slotNames: SlotNameMap
): string[] {
  return items.map((item) => personalizeTacticsLine(item, slotNames));
}

export function personalizeSlotTactics(
  tactics: SlotTactics,
  slotNames: SlotNameMap
): SlotTactics {
  return {
    ...tactics,
    positioning: personalizeTacticsItems(tactics.positioning, slotNames),
    attack: personalizeTacticsItems(tactics.attack, slotNames),
    defense: personalizeTacticsItems(tactics.defense, slotNames),
    onLoss: personalizeTacticsItems(tactics.onLoss, slotNames),
  };
}

export function formatLineupNamesLine(fieldPlayers: TacticsFieldPlayer[]): string {
  return LINEUP_POSITIONS.map((slot) => {
    const player = fieldPlayers.find((item) => item.lineup_slot === slot);
    return player ? getFirstName(player.name) : null;
  })
    .filter((name): name is string => Boolean(name))
    .join(" · ");
}

export function formatRoleLabelWithNames(
  roleLabel: string,
  formationId: LineupFormationId,
  slotNames: SlotNameMap
): string {
  const formation = getLineupFormation(formationId);

  if (roleLabel === "ПЗ") {
    const midSlots =
      formation.rows.find((row) => row.rowClass === "lineup-pitch__row--mid")
        ?.slots ?? [];
    const names = midSlots
      .map((slot) => slotNames[slot])
      .filter((name): name is string => Boolean(name));
    if (names.length > 0) return names.join(", ");
  }

  if (roleLabel === "ЗАЩ") {
    const defSlots =
      formation.rows.find((row) => row.rowClass === "lineup-pitch__row--def")
        ?.slots ?? [];
    const names = defSlots
      .map((slot) => slotNames[slot])
      .filter((name): name is string => Boolean(name));
    if (names.length > 0) return names.join(", ");
  }

  if (roleLabel === "НАП") {
    const attackSlots =
      formation.rows.find((row) => row.rowClass === "lineup-pitch__row--attack")
        ?.slots ?? [];
    const names = attackSlots
      .map((slot) => slotNames[slot])
      .filter((name): name is string => Boolean(name));
    if (names.length > 0) return names.join(", ");
  }

  const slots = ROLE_SLOT_GROUPS[roleLabel];
  if (slots) {
    const names = slots
      .map((slot) => slotNames[slot])
      .filter((name): name is string => Boolean(name));
    if (names.length > 0) return names.join(", ");
  }

  return roleLabel;
}

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
