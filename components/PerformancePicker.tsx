"use client";

import {
  PERFORMANCE_TIERS,
  canSelectPerformanceTier,
  getPerformanceTier,
  performanceTierSelectedClass,
} from "@/lib/performanceTiers";

type PerformancePickerProps = {
  value: number;
  onChange?: (score: number) => void;
  disabled?: boolean;
  /** Все текущие оценки бюллетеня — для лимита «Хорошо/Отлично» */
  ballotScores?: Record<number, number>;
  playerId?: number;
};

export default function PerformancePicker({
  value,
  onChange,
  disabled = false,
  ballotScores,
  playerId,
}: PerformancePickerProps) {
  const interactive = Boolean(onChange) && !disabled;
  const selected = getPerformanceTier(value);
  const selectedId = selected?.id ?? null;

  return (
    <div className="w-full min-w-0">
      <div
        className="grid grid-cols-5 gap-1"
        role="radiogroup"
        aria-label="Оценка игры"
      >
        {PERFORMANCE_TIERS.map((tier) => {
          const isSelected = selectedId === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!interactive}
              title={tier.phrase}
              onClick={(event) => {
                event.stopPropagation();
                if (!interactive) return;
                if (isSelected) {
                  onChange?.(0);
                  return;
                }

                if (
                  ballotScores &&
                  playerId != null &&
                  (tier.id === "good" || tier.id === "great")
                ) {
                  const check = canSelectPerformanceTier(
                    ballotScores,
                    playerId,
                    tier.score
                  );
                  if (!check.ok) {
                    alert(check.reason);
                    return;
                  }
                }

                onChange?.(tier.score);
              }}
              className={`rounded-lg border px-0.5 py-1.5 text-center transition active:scale-[0.97] disabled:opacity-45 sm:rounded-xl sm:py-2 ${
                isSelected
                  ? performanceTierSelectedClass(tier.tone)
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:bg-white/[0.07] hover:text-slate-200"
              }`}
            >
              <span className="block text-[9px] font-extrabold leading-tight sm:text-[10px]">
                {tier.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
