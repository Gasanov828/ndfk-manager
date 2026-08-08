import type { LineupPosition } from "@/lib/lineup";
import type { LineupFormationId } from "@/lib/lineupFormations";
import type { SlotTactics } from "@/lib/championship/tacticsContent";
import { TACTICS_1322 } from "@/lib/championship/formationTactics/t1322";
import { TACTICS_1331 } from "@/lib/championship/formationTactics/t1331";
import { TACTICS_1232 } from "@/lib/championship/formationTactics/t1232";
import { TACTICS_1421 } from "@/lib/championship/formationTactics/t1421";
import { TACTICS_1223 } from "@/lib/championship/formationTactics/t1223";

export type FormationTeamPlan = {
  roles: Array<{ icon: string; label: string; text: string }>;
  lossInstruction: string;
  hint: string;
};

const FORMATION_TACTICS: Record<
  LineupFormationId,
  Record<LineupPosition, SlotTactics>
> = {
  "1-3-2-2": TACTICS_1322,
  "1-3-3-1": TACTICS_1331,
  "1-2-3-2": TACTICS_1232,
  "1-4-2-1": TACTICS_1421,
  "1-2-2-3": TACTICS_1223,
};

const FORMATION_TEAM_PLANS: Record<LineupFormationId, FormationTeamPlan> = {
  "1-3-2-2": {
    hint: "Два нападающих растягивают оборону, два ЦП держат центр.",
    roles: [
      { icon: "🧤", label: "ВРТ", text: "короткая игра через ЦП2, команда линии защиты." },
      { icon: "🛡️", label: "ЗАЩ", text: "тройка: левый, центр, правый — без одновременного выхода." },
      { icon: "⚙️", label: "ЦП", text: "ЦП1 — связка слева, ЦП2 — опорный якорь." },
      { icon: "⚡", label: "НАП", text: "левый и правый форвард — разные каналы атаки." },
    ],
    lossInstruction:
      "3 секунды давления → откат в блок 1–3–2–2, закрываем центр.",
  },
  "1-3-3-1": {
    hint: "Один форвард, тройка полузащиты контролирует центр.",
    roles: [
      { icon: "🧤", label: "ВРТ", text: "запуск через крайних защитников и ЦП." },
      { icon: "🛡️", label: "ЗАЩ", text: "компактная тройка, не выпускать между линиями." },
      { icon: "⚙️", label: "ПЗ", text: "НАП2 слева, ЦП1 центр, ЦП2 справа — ротация и страховка." },
      { icon: "⚡", label: "НАП1", text: "единственная «девятка» — отрывы за спину и завершение." },
    ],
    lossInstruction:
      "3 секунды прессинга тройкой полузащиты → сжимаемся к центру в 1–3–3–1.",
  },
  "1-2-3-2": {
    hint: "Два защитника глубоко, три игрока в середине, два форварда.",
    roles: [
      { icon: "🧤", label: "ВРТ", text: "быстрый старт атаки — ищи ЦП2 или ЗАЩ3." },
      { icon: "🛡️", label: "ЗАЩ", text: "пара центральных — последняя линия, без рывков." },
      { icon: "⚙️", label: "ПЗ", text: "ЦП1, ЦП2 и ЗАЩ3 (региста) — контроль и подключение." },
      { icon: "⚡", label: "НАП", text: "два нападающих — постоянное давление на центр защиты." },
    ],
    lossInstruction:
      "3 секунды высокого прессинга → если не отобрали, двойка защитников глубже.",
  },
  "1-4-2-1": {
    hint: "Четверка обороны, два опорных, один форвард.",
    roles: [
      { icon: "🧤", label: "ВРТ", text: "организует линию из четырёх, не выбивает в центр." },
      { icon: "🛡️", label: "ЗАЩ", text: "четвёрка: ЗАЩ1–3 и НАП2 (правый вингбек) — компактно." },
      { icon: "⚙️", label: "ЦП", text: "два опорных — не оба вперёд одновременно." },
      { icon: "⚡", label: "НАП1", text: "один форвард — удерживает центр, ждёт подачи с флангов." },
    ],
    lossInstruction:
      "2 секунды давления → быстрый откат в низкий блок 1–4–2–1.",
  },
  "1-2-2-3": {
    hint: "Тройка впереди, два в середине, минимум защитников.",
    roles: [
      { icon: "🧤", label: "ВРТ", text: "осторожные передачи — контратака соперника опасна." },
      { icon: "🛡️", label: "ЗАЩ", text: "пара защитников — только задержка и страховка." },
      { icon: "⚙️", label: "ПЗ", text: "ЦП2 и ЗАЩ3 — связь обороны с атакой." },
      { icon: "⚡", label: "НАП", text: "НАП1, НАП2 и ЦП1 — тройка постоянно в штрафной." },
    ],
    lossInstruction:
      "4 секунды прессинга всей тройкой впереди → иначе срочный откат ЗАЩ1–2.",
  },
};

export function getSlotTactics(
  formationId: LineupFormationId,
  slot: LineupPosition
): SlotTactics {
  return FORMATION_TACTICS[formationId][slot];
}

export function getFormationTeamPlan(
  formationId: LineupFormationId
): FormationTeamPlan {
  return FORMATION_TEAM_PLANS[formationId];
}
