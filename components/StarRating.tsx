"use client";

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  max?: number;
  showValue?: boolean;
  compact?: boolean;
};

export default function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md",
  max = 5,
  showValue = false,
  compact = false,
}: StarRatingProps) {
  const starSize = compact
    ? "text-[10px] sm:text-xs"
    : max > 5
      ? size === "sm"
        ? "text-[11px] sm:text-xs"
        : "text-sm"
      : size === "sm"
        ? "text-base"
        : "text-xl";

  return (
    <div
      className={`flex flex-wrap items-center ${compact ? "gap-0" : "gap-0.5"}`}
      role="group"
      aria-label="Оценка звёздами"
    >
      {Array.from({ length: max }, (_, index) => index + 1).map((star) => {
        const active = star <= value;

        if (!onChange || disabled) {
          return (
            <span
              key={star}
              className={`${starSize} ${active ? "text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" : "text-slate-600"}`}
            >
              ★
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            className={`${starSize} px-0.5 transition hover:scale-110 ${
              active
                ? "text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                : "text-slate-600 hover:text-yellow-200"
            }`}
            aria-label={`${star} из ${max}`}
          >
            ★
          </button>
        );
      })}
      {showValue && value > 0 && (
        <span className="ml-1 shrink-0 text-[10px] font-bold text-yellow-200 sm:text-xs">
          {value}/{max}
        </span>
      )}
    </div>
  );
}
