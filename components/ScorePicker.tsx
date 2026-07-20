"use client";

type ScorePickerProps = {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  max?: number;
  /** Горизонтальный скролл — для узких панелей голосования */
  scrollable?: boolean;
  /** Компактный степпер − / число / + (удобно на телефоне) */
  compact?: boolean;
};

export default function ScorePicker({
  value,
  onChange,
  disabled = false,
  max = 10,
  scrollable = false,
  compact = false,
}: ScorePickerProps) {
  const interactive = Boolean(onChange) && !disabled;

  if (compact) {
    const display = value > 0 ? String(value) : "—";
    const canMinus = interactive && value > 0;
    const canPlus = interactive && value < max;

    return (
      <div
        className="flex shrink-0 items-center justify-end gap-1"
        role="group"
        aria-label="Оценка баллами"
      >
        <button
          type="button"
          disabled={!canMinus}
          onClick={(event) => {
            event.stopPropagation();
            if (!canMinus) return;
            onChange?.(value <= 1 ? 0 : value - 1);
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.07] text-base font-bold text-white transition active:scale-95 disabled:opacity-30 sm:h-9 sm:w-9 sm:rounded-xl sm:text-lg"
          aria-label="Меньше"
        >
          −
        </button>
        <div
          className={`flex h-8 min-w-[2.25rem] items-center justify-center rounded-lg px-1.5 text-sm font-black tabular-nums sm:h-9 sm:min-w-[2.75rem] sm:rounded-xl sm:px-2 sm:text-base ${
            value > 0
              ? "bg-amber-500/25 text-amber-100 ring-1 ring-amber-300/40"
              : "bg-white/[0.04] text-slate-500"
          }`}
        >
          {display}
        </div>
        <button
          type="button"
          disabled={!canPlus}
          onClick={(event) => {
            event.stopPropagation();
            if (!canPlus) return;
            onChange?.(value <= 0 ? 5 : value + 1);
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.07] text-base font-bold text-white transition active:scale-95 disabled:opacity-30 sm:h-9 sm:w-9 sm:rounded-xl sm:text-lg"
          aria-label="Больше"
        >
          +
        </button>
      </div>
    );
  }

  const buttons = Array.from({ length: max }, (_, index) => index + 1).map(
    (score) => {
      const selected = value === score;
      const selectedClass =
        "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_10px_rgba(251,191,36,0.45)] ring-1 ring-amber-300/50";
      const idleClass =
        "border border-white/10 bg-white/5 text-slate-400 hover:border-amber-400/35 hover:bg-amber-500/15 hover:text-white";
      const sizeClass = "h-10 w-10 text-xs font-bold rounded-lg sm:h-11 sm:w-11";

      if (!interactive) {
        return (
          <span
            key={score}
            className={`flex shrink-0 items-center justify-center ${sizeClass} ${
              selected ? selectedClass : "bg-white/5 text-slate-600"
            }`}
          >
            {score}
          </span>
        );
      }

      return (
        <button
          key={score}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onChange?.(score);
          }}
          className={`touch-manipulation select-none flex shrink-0 items-center justify-center transition active:scale-95 ${sizeClass} ${
            selected ? selectedClass : idleClass
          }`}
          aria-label={`Оценка ${score} из ${max}`}
          aria-pressed={selected}
        >
          {score}
        </button>
      );
    }
  );

  return (
    <div
      className={`relative z-10 flex ${
        scrollable ? "w-full" : "flex-col items-end gap-1.5"
      }`}
    >
      <div
        className={
          scrollable
            ? "scrollbar-thin w-full overflow-x-auto pb-0.5"
            : "flex flex-wrap justify-end gap-1.5"
        }
        role="group"
        aria-label="Оценка баллами"
      >
        <div className={scrollable ? "flex min-w-max gap-1.5" : "contents"}>
          {buttons}
        </div>
      </div>
      {value > 0 && (
        <span
          className={`text-[10px] font-semibold text-amber-200/90 sm:text-xs ${
            scrollable ? "text-left" : ""
          }`}
        >
          Выбрано: {value}/{max}
        </span>
      )}
    </div>
  );
}
