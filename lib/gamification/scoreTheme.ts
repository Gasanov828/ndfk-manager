/**
 * Colour indication for 1–10 ratings (product spec):
 *   1–3  🔴 red    — слабая игра
 *   4–6  🟠 orange — ниже среднего
 *   7–8  🟢 green  — хорошая игра
 *   9–10 🟡 gold   — отличная игра
 *
 * Returns Tailwind class fragments so the same palette drives the score picker,
 * the animated card highlight and the results modal.
 */
export type ScoreBucket = "weak" | "below" | "good" | "great";

export type ScoreTheme = {
  bucket: ScoreBucket;
  emoji: string;
  label: string;
  /** Text colour for the number. */
  text: string;
  /** Solid/gradient fill for the selected chip. */
  chip: string;
  /** Ring around the selected chip. */
  ring: string;
  /** Card border when this score is picked. */
  border: string;
  /** Card background wash when this score is picked. */
  wash: string;
  /** Glow shadow for emphasis. */
  glow: string;
  /** Small status dot colour. */
  dot: string;
};

const THEMES: Record<ScoreBucket, ScoreTheme> = {
  weak: {
    bucket: "weak",
    emoji: "🔴",
    label: "Слабая игра",
    text: "text-red-300",
    chip: "bg-gradient-to-br from-red-500 to-rose-600 text-white",
    ring: "ring-red-400/50",
    border: "border-red-400/50",
    wash: "bg-red-500/10",
    glow: "shadow-[0_0_16px_rgba(248,113,113,0.45)]",
    dot: "bg-red-400",
  },
  below: {
    bucket: "below",
    emoji: "🟠",
    label: "Ниже среднего",
    text: "text-orange-300",
    chip: "bg-gradient-to-br from-orange-400 to-amber-500 text-white",
    ring: "ring-orange-300/50",
    border: "border-orange-400/50",
    wash: "bg-orange-500/10",
    glow: "shadow-[0_0_16px_rgba(251,146,60,0.45)]",
    dot: "bg-orange-400",
  },
  good: {
    bucket: "good",
    emoji: "🟢",
    label: "Хорошая игра",
    text: "text-emerald-300",
    chip: "bg-gradient-to-br from-emerald-400 to-green-500 text-white",
    ring: "ring-emerald-300/50",
    border: "border-emerald-400/50",
    wash: "bg-emerald-500/10",
    glow: "shadow-[0_0_16px_rgba(52,211,153,0.45)]",
    dot: "bg-emerald-400",
  },
  great: {
    bucket: "great",
    emoji: "🟡",
    label: "Отличная игра",
    text: "text-amber-300",
    chip: "bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-900",
    ring: "ring-amber-300/60",
    border: "border-amber-300/60",
    wash: "bg-amber-400/10",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.55)]",
    dot: "bg-amber-300",
  },
};

export function getScoreBucket(score: number): ScoreBucket {
  if (score >= 9) return "great";
  if (score >= 7) return "good";
  if (score >= 4) return "below";
  return "weak";
}

export function getScoreTheme(score: number): ScoreTheme {
  return THEMES[getScoreBucket(score)];
}
