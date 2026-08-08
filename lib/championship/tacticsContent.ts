import type { LineupPosition } from "@/lib/lineup";
import type { LineupFormationId } from "@/lib/lineupFormations";

export type TacticsInstructionGroup = {
  attack: string[];
  defense: string[];
  onLoss: string[];
};

export type SlotTactics = TacticsInstructionGroup & {
  roleTitle: string;
  roleShort: string;
  positioning: string[];
};

export {
  getSlotTactics,
  getFormationTeamPlan,
  type FormationTeamPlan,
} from "@/lib/championship/formationTactics";

export const TEAM_LOSS_INSTRUCTION =
  "3 секунды давления → если мяч не вернули, вся команда возвращается в свои зоны.";

/** @deprecated use getFormationTeamPlan(formationId) */
export const TEAM_ROLE_LINES = [
  { icon: "🧤", label: "ВРТ", text: "начинает атаки и руководит обороной." },
  { icon: "🛡️", label: "ЗАЩ", text: "держат зоны и страхуют друг друга." },
  {
    icon: "⚙️",
    label: "ЦП",
    text: "один может идти вперёд, второй страхует.",
  },
  {
    icon: "⚡",
    label: "НАП",
    text: "открывания, прессинг после потери, завершение.",
  },
] as const;

export type { LineupPosition, LineupFormationId };
