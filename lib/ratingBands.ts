/**
 * Цветовые зоны оценки 1–10.
 * Вынесено отдельно, чтобы позже добавить критерии / аналитику без правок UI.
 */
export type RatingBandId = "poor" | "below" | "good" | "elite";

export type RatingBand = {
  id: RatingBandId;
  min: number;
  max: number;
  label: string;
  /** Короткий emoji-маркер для подсказок */
  emoji: string;
};

export const RATING_BANDS: RatingBand[] = [
  { id: "poor", min: 1, max: 3, label: "Слабая игра", emoji: "🔴" },
  { id: "below", min: 4, max: 6, label: "Ниже среднего", emoji: "🟠" },
  { id: "good", min: 7, max: 8, label: "Хорошая игра", emoji: "🟢" },
  { id: "elite", min: 9, max: 10, label: "Отличная игра", emoji: "🟡" },
];

export function getRatingBand(score: number): RatingBand | null {
  if (!Number.isFinite(score) || score <= 0) return null;
  const rounded = Math.round(score);
  return (
    RATING_BANDS.find((band) => rounded >= band.min && rounded <= band.max) ??
    null
  );
}

/** Текст / акцентный цвет оценки */
export function ratingBandTextClass(score: number): string {
  const band = getRatingBand(score);
  switch (band?.id) {
    case "poor":
      return "text-red-300";
    case "below":
      return "text-orange-300";
    case "good":
      return "text-emerald-300";
    case "elite":
      return "text-amber-200";
    default:
      return "text-slate-400";
  }
}

/** Кнопка выбранной оценки в сетке 1–10 */
export function ratingBandSelectedButtonClass(score: number): string {
  const band = getRatingBand(score);
  switch (band?.id) {
    case "poor":
      return "border-red-400/55 bg-red-500/25 text-red-100 shadow-[0_0_14px_rgba(248,113,113,0.4)]";
    case "below":
      return "border-orange-400/55 bg-orange-500/25 text-orange-100 shadow-[0_0_14px_rgba(251,146,60,0.4)]";
    case "good":
      return "border-emerald-400/55 bg-emerald-500/25 text-emerald-50 shadow-[0_0_14px_rgba(52,211,153,0.4)]";
    case "elite":
      return "border-amber-300/60 bg-amber-400/25 text-amber-50 shadow-[0_0_16px_rgba(251,191,36,0.5)]";
    default:
      return "border-white/20 bg-white/10 text-white";
  }
}

/** Подсветка карточки игрока при выбранной оценке */
export function ratingBandCardClass(score: number): string {
  const band = getRatingBand(score);
  switch (band?.id) {
    case "poor":
      return "rating-card-glow border-red-400/35 bg-red-500/[0.12]";
    case "below":
      return "rating-card-glow border-orange-400/35 bg-orange-500/[0.12]";
    case "good":
      return "rating-card-glow border-emerald-400/35 bg-emerald-500/[0.12]";
    case "elite":
      return "rating-card-glow border-amber-300/40 bg-amber-500/[0.14]";
    default:
      return "border-transparent bg-transparent";
  }
}
