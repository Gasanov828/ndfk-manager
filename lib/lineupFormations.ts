import type { LineupPosition } from "@/lib/lineup";
import { getPositionGroup, type PositionGroup } from "@/lib/positionStyles";

export type LineupFormationId =
  | "1-3-2-2"
  | "1-3-3-1"
  | "1-2-3-2"
  | "1-4-2-1"
  | "1-2-2-3";

export type LineupFormationRow = {
  slots: LineupPosition[];
  rowClass: "lineup-pitch__row--attack" | "lineup-pitch__row--mid" | "lineup-pitch__row--def" | "lineup-pitch__row--gk";
};

export type LineupFormation = {
  id: LineupFormationId;
  scheme: string;
  style: string;
  icon: string;
  rows: LineupFormationRow[];
  championshipSlots: Array<{
    position: LineupPosition;
    className: string;
    group: PositionGroup;
  }>;
};

const SLOT_GROUP: Record<LineupPosition, PositionGroup> = {
  НАП1: "НАП",
  НАП2: "НАП",
  ЦП1: "ЦП",
  ЦП2: "ЦП",
  ЗАЩ1: "ЗАЩ",
  ЗАЩ2: "ЗАЩ",
  ЗАЩ3: "ЗАЩ",
  ВРТ: "ВРТ",
};

/** Tailwind needs full class strings — fixed coords per formation */
const CHAMPIONSHIP_COORDS: Record<
  LineupFormationId,
  Array<{ position: LineupPosition; className: string }>
> = {
  "1-3-2-2": [
    { position: "НАП1", className: "top-[8%] left-[23%] -translate-x-1/2" },
    { position: "НАП2", className: "top-[8%] left-[77%] -translate-x-1/2" },
    { position: "ЦП1", className: "top-[33%] left-[20%] -translate-x-1/2" },
    { position: "ЦП2", className: "top-[33%] left-[80%] -translate-x-1/2" },
    { position: "ЗАЩ1", className: "top-[57%] left-[11%] -translate-x-1/2" },
    { position: "ЗАЩ2", className: "top-[57%] left-1/2 -translate-x-1/2" },
    { position: "ЗАЩ3", className: "top-[57%] left-[89%] -translate-x-1/2" },
    { position: "ВРТ", className: "top-[81%] left-1/2 -translate-x-1/2" },
  ],
  "1-3-3-1": [
    { position: "НАП1", className: "top-[7%] left-1/2 -translate-x-1/2" },
    { position: "НАП2", className: "top-[27%] left-[18%] -translate-x-1/2" },
    { position: "ЦП1", className: "top-[27%] left-1/2 -translate-x-1/2" },
    { position: "ЦП2", className: "top-[27%] left-[82%] -translate-x-1/2" },
    { position: "ЗАЩ1", className: "top-[52%] left-[14%] -translate-x-1/2" },
    { position: "ЗАЩ2", className: "top-[52%] left-1/2 -translate-x-1/2" },
    { position: "ЗАЩ3", className: "top-[52%] left-[86%] -translate-x-1/2" },
    { position: "ВРТ", className: "top-[78%] left-1/2 -translate-x-1/2" },
  ],
  "1-2-3-2": [
    { position: "НАП1", className: "top-[7%] left-[34%] -translate-x-1/2" },
    { position: "НАП2", className: "top-[7%] left-[66%] -translate-x-1/2" },
    { position: "ЦП1", className: "top-[30%] left-[20%] -translate-x-1/2" },
    { position: "ЦП2", className: "top-[30%] left-1/2 -translate-x-1/2" },
    { position: "ЗАЩ3", className: "top-[30%] left-[80%] -translate-x-1/2" },
    { position: "ЗАЩ1", className: "top-[54%] left-[32%] -translate-x-1/2" },
    { position: "ЗАЩ2", className: "top-[54%] left-[68%] -translate-x-1/2" },
    { position: "ВРТ", className: "top-[78%] left-1/2 -translate-x-1/2" },
  ],
  "1-4-2-1": [
    { position: "НАП1", className: "top-[7%] left-1/2 -translate-x-1/2" },
    { position: "ЦП1", className: "top-[31%] left-[34%] -translate-x-1/2" },
    { position: "ЦП2", className: "top-[31%] left-[66%] -translate-x-1/2" },
    { position: "ЗАЩ1", className: "top-[52%] left-[10%] -translate-x-1/2" },
    { position: "ЗАЩ2", className: "top-[52%] left-[36%] -translate-x-1/2" },
    { position: "ЗАЩ3", className: "top-[52%] left-[64%] -translate-x-1/2" },
    { position: "НАП2", className: "top-[52%] left-[90%] -translate-x-1/2" },
    { position: "ВРТ", className: "top-[78%] left-1/2 -translate-x-1/2" },
  ],
  "1-2-2-3": [
    { position: "НАП1", className: "top-[6%] left-[20%] -translate-x-1/2" },
    { position: "НАП2", className: "top-[6%] left-1/2 -translate-x-1/2" },
    { position: "ЦП1", className: "top-[6%] left-[80%] -translate-x-1/2" },
    { position: "ЦП2", className: "top-[31%] left-[34%] -translate-x-1/2" },
    { position: "ЗАЩ3", className: "top-[31%] left-[66%] -translate-x-1/2" },
    { position: "ЗАЩ1", className: "top-[55%] left-[32%] -translate-x-1/2" },
    { position: "ЗАЩ2", className: "top-[55%] left-[68%] -translate-x-1/2" },
    { position: "ВРТ", className: "top-[78%] left-1/2 -translate-x-1/2" },
  ],
};

export const LINEUP_FORMATIONS: LineupFormation[] = [
  {
    id: "1-3-2-2",
    scheme: "1–3–2–2",
    style: "Основная",
    icon: "🏠",
    rows: [
      { slots: ["НАП1", "НАП2"], rowClass: "lineup-pitch__row--attack" },
      { slots: ["ЦП1", "ЦП2"], rowClass: "lineup-pitch__row--mid" },
      { slots: ["ЗАЩ1", "ЗАЩ2", "ЗАЩ3"], rowClass: "lineup-pitch__row--def" },
      { slots: ["ВРТ"], rowClass: "lineup-pitch__row--gk" },
    ],
    championshipSlots: CHAMPIONSHIP_COORDS["1-3-2-2"].map(({ position, className }) => ({
      position,
      className,
      group: SLOT_GROUP[position],
    })),
  },
  {
    id: "1-3-3-1",
    scheme: "1–3–3–1",
    style: "Универсальная",
    icon: "⚖️",
    rows: [
      { slots: ["НАП1"], rowClass: "lineup-pitch__row--attack" },
      { slots: ["НАП2", "ЦП1", "ЦП2"], rowClass: "lineup-pitch__row--mid" },
      { slots: ["ЗАЩ1", "ЗАЩ2", "ЗАЩ3"], rowClass: "lineup-pitch__row--def" },
      { slots: ["ВРТ"], rowClass: "lineup-pitch__row--gk" },
    ],
    championshipSlots: CHAMPIONSHIP_COORDS["1-3-3-1"].map(({ position, className }) => ({
      position,
      className,
      group: SLOT_GROUP[position],
    })),
  },
  {
    id: "1-2-3-2",
    scheme: "1–2–3–2",
    style: "Атакующая",
    icon: "⚔️",
    rows: [
      { slots: ["НАП1", "НАП2"], rowClass: "lineup-pitch__row--attack" },
      { slots: ["ЦП1", "ЦП2", "ЗАЩ3"], rowClass: "lineup-pitch__row--mid" },
      { slots: ["ЗАЩ1", "ЗАЩ2"], rowClass: "lineup-pitch__row--def" },
      { slots: ["ВРТ"], rowClass: "lineup-pitch__row--gk" },
    ],
    championshipSlots: CHAMPIONSHIP_COORDS["1-2-3-2"].map(({ position, className }) => ({
      position,
      className,
      group: SLOT_GROUP[position],
    })),
  },
  {
    id: "1-4-2-1",
    scheme: "1–4–2–1",
    style: "Оборонительная",
    icon: "🧱",
    rows: [
      { slots: ["НАП1"], rowClass: "lineup-pitch__row--attack" },
      { slots: ["ЦП1", "ЦП2"], rowClass: "lineup-pitch__row--mid" },
      { slots: ["ЗАЩ1", "ЗАЩ2", "ЗАЩ3", "НАП2"], rowClass: "lineup-pitch__row--def" },
      { slots: ["ВРТ"], rowClass: "lineup-pitch__row--gk" },
    ],
    championshipSlots: CHAMPIONSHIP_COORDS["1-4-2-1"].map(({ position, className }) => ({
      position,
      className,
      group: SLOT_GROUP[position],
    })),
  },
  {
    id: "1-2-2-3",
    scheme: "1–2–2–3",
    style: "Все в атаку",
    icon: "🔥",
    rows: [
      { slots: ["НАП1", "НАП2", "ЦП1"], rowClass: "lineup-pitch__row--attack" },
      { slots: ["ЦП2", "ЗАЩ3"], rowClass: "lineup-pitch__row--mid" },
      { slots: ["ЗАЩ1", "ЗАЩ2"], rowClass: "lineup-pitch__row--def" },
      { slots: ["ВРТ"], rowClass: "lineup-pitch__row--gk" },
    ],
    championshipSlots: CHAMPIONSHIP_COORDS["1-2-2-3"].map(({ position, className }) => ({
      position,
      className,
      group: SLOT_GROUP[position],
    })),
  },
];

export const DEFAULT_LINEUP_FORMATION_ID: LineupFormationId = "1-3-2-2";

export const LINEUP_FORMATION_STORAGE_KEY = "ndfk-lineup-formation";
export const CHAMPIONSHIP_LINEUP_FORMATION_STORAGE_KEY =
  "ndfk-championship-lineup-formation";

export function getLineupFormation(id: LineupFormationId): LineupFormation {
  return (
    LINEUP_FORMATIONS.find((formation) => formation.id === id) ??
    LINEUP_FORMATIONS[0]
  );
}

export function parseLineupFormationId(value: string | null): LineupFormationId {
  if (value && LINEUP_FORMATIONS.some((formation) => formation.id === value)) {
    return value as LineupFormationId;
  }
  return DEFAULT_LINEUP_FORMATION_ID;
}

export function getChampionshipFieldSlots(formationId: LineupFormationId) {
  return getLineupFormation(formationId).championshipSlots;
}

export function preferredGroupForSlot(slot: LineupPosition): PositionGroup {
  return SLOT_GROUP[slot] ?? getPositionGroup(slot, slot);
}
