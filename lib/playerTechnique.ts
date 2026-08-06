import {
  computeOverallFromAttributes,
  getAttributesForPosition,
  type RatingAttribute,
} from "@/lib/ratingEpisode";

/** Черновик характеристик 1–10 для позиции */
export function buildTechniqueDraft(
  position: string,
  existing?: Record<string, number> | null,
  fallbackScore = 5
): Record<string, number> {
  const defs = getAttributesForPosition(position);
  const draft: Record<string, number> = {};

  for (const attribute of defs) {
    const value = existing?.[attribute.key];
    draft[attribute.key] =
      value != null && Number.isFinite(value) && value > 0
        ? Math.min(10, Math.max(1, Math.round(value * 10) / 10))
        : fallbackScore;
  }

  return draft;
}

export function getTechniqueAttributes(position: string): RatingAttribute[] {
  return getAttributesForPosition(position);
}

export function previewOverallFromTechnique(
  attrs: Record<string, number>,
  position: string
): number {
  return computeOverallFromAttributes(attrs, position);
}

export function clampTechniqueScore(value: number): number {
  if (!Number.isFinite(value)) return 5;
  return Math.min(10, Math.max(1, Math.round(value)));
}
