import {
  POSITION_ATTRIBUTE_WEIGHTS,
  POSITION_RATING_ATTRIBUTES,
} from "@/lib/ratingEpisode";
import { getPositionGroup, type PositionGroup } from "@/lib/positionStyles";

/** Рейтинг при создании игрока: пол — 70, потолок — 90 */
export const CREATE_OVR_MIN = 70;
export const CREATE_OVR_MAX = 90;

export const CREATE_POSITION_OPTIONS: Array<{
  group: PositionGroup;
  label: string;
  hint: string;
}> = [
  { group: "НАП", label: "Нападающий", hint: "Удар, дриблинг, скорость" },
  { group: "ЦП", label: "Полузащита", hint: "Пас, отбор, физика" },
  { group: "ЗАЩ", label: "Защитник", hint: "Отбор, голова, физика" },
  { group: "ВРТ", label: "Вратарь", hint: "Реакция, руки, позиция" },
];

/** Оценка 1–10 → стат карточки в диапазоне 70–90 */
export function attributeScore10ToCreateStat(score10: number): number {
  const clamped = Math.min(10, Math.max(1, score10));
  return Math.round(
    CREATE_OVR_MIN + ((clamped - 1) / 9) * (CREATE_OVR_MAX - CREATE_OVR_MIN)
  );
}

export function defaultCreateAttrs(position: string): Record<string, number> {
  const group = getPositionGroup(null, position);
  const attrs: Record<string, number> = {};
  for (const attribute of POSITION_RATING_ATTRIBUTES[group]) {
    attrs[attribute.key] = 5;
  }
  return attrs;
}

export function areCreateAttrsComplete(
  attrs: Record<string, number>,
  position: string
): boolean {
  const group = getPositionGroup(null, position);
  return POSITION_RATING_ATTRIBUTES[group].every((attribute) => {
    const value = attrs[attribute.key];
    return typeof value === "number" && value >= 1 && value <= 10;
  });
}

/**
 * OVR из характеристик 1–10 по весам позиции.
 * Всегда в диапазоне 70–90 (90 — край).
 */
export function computeCreateOverall(
  attrs: Record<string, number>,
  position: string
): number {
  const group = getPositionGroup(null, position);
  const weights = POSITION_ATTRIBUTE_WEIGHTS[group];
  const attributeDefs = POSITION_RATING_ATTRIBUTES[group];

  let weightedSum = 0;
  let weightTotal = 0;

  for (const attribute of attributeDefs) {
    const score10 = attrs[attribute.key];
    if (!score10 || score10 <= 0) continue;
    const weight = weights[attribute.key] ?? 0;
    if (weight <= 0) continue;
    weightedSum += attributeScore10ToCreateStat(score10) * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return CREATE_OVR_MIN;

  const ovr = weightedSum / weightTotal;
  return Math.min(
    CREATE_OVR_MAX,
    Math.max(CREATE_OVR_MIN, Math.round(ovr * 10) / 10)
  );
}

export type AddPlayerAttributesPayload = {
  name: string;
  position: PositionGroup;
  rating: number;
  attrs: Record<string, number>;
};

export function formatCreateOverall(rating: number): string {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}
