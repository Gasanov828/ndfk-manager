"use client";

import { MAX_VOTE_SCORE } from "@/lib/matchRatings";
import {
  getRatingBand,
  ratingBandSelectedButtonClass,
} from "@/lib/ratingBands";
import { canSelectStarScore } from "@/lib/starBallotLimits";

type StarRatingPickerProps = {
  value: number;
  onChange?: (score: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  /** Все текущие оценки бюллетеня — для лимита 8+/9+ */
  ballotScores?: Record<number, number>;
  playerId?: number;
};

/**
 * Выбор оценки 1–10 с цветовой индикацией зон.
 * Повторный тап по той же цифре снимает оценку.
 */
export default function StarRatingPicker({
  value,
  onChange,
  disabled = false,
  size = "md",
  ballotScores,
  playerId,
}: StarRatingPickerProps) {
  const interactive = Boolean(onChange) && !disabled;
  const pad =
    size === "sm" ? "py-1.5 text-[11px]" : "py-2 text-[12px] sm:text-[13px]";
  const band = getRatingBand(value);

  return (
    <div className="w-full min-w-0" role="radiogroup" aria-label="Оценка 1–10">
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: MAX_VOTE_SCORE }, (_, index) => {
          const score = index + 1;
          const selected = value === score;

          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${score} из ${MAX_VOTE_SCORE}`}
              disabled={!interactive}
              onClick={(event) => {
                event.stopPropagation();
                if (!interactive) return;
                if (value === score) {
                  onChange?.(0);
                  return;
                }

                if (ballotScores && playerId != null && score >= 8) {
                  const check = canSelectStarScore(
                    ballotScores,
                    playerId,
                    score
                  );
                  if (!check.ok) {
                    alert(check.reason);
                    return;
                  }
                }

                onChange?.(score);
              }}
              className={`rounded-lg border font-extrabold tabular-nums transition duration-200 active:scale-[0.95] disabled:opacity-45 sm:rounded-xl ${pad} ${
                selected
                  ? ratingBandSelectedButtonClass(score)
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:bg-white/[0.07] hover:text-slate-200"
              }`}
            >
              {score}
            </button>
          );
        })}
      </div>
      {value > 0 && band ? (
        <p
          className={`mt-1.5 text-center text-[10px] font-bold tabular-nums transition-colors ${
            selectedBandText(band.id)
          }`}
        >
          {band.emoji} {value}/{MAX_VOTE_SCORE} · {band.label}
        </p>
      ) : null}
    </div>
  );
}

function selectedBandText(
  id: "poor" | "below" | "good" | "elite"
): string {
  switch (id) {
    case "poor":
      return "text-red-300";
    case "below":
      return "text-orange-300";
    case "good":
      return "text-emerald-300";
    case "elite":
      return "text-amber-200";
  }
}
