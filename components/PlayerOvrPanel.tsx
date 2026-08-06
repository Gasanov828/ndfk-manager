"use client";

import { useEffect, useRef, useState } from "react";
import { formatOverallRating } from "@/lib/matchRatings";

export function getRatingProgress(rating: number) {
  const whole = Math.floor(rating);
  const frac = Math.max(0, Math.min(0.999, rating - whole));
  const next = whole + 1;
  const remaining = Math.round((1 - frac) * 10) / 10 || 1;
  // If already exactly whole (78.0), show full bar toward 79 as 0 progress
  const pct = frac === 0 ? 0 : Math.max(3, Math.round(frac * 100));
  return { currentFloor: whole, next, remaining, pct, frac };
}

function formatDelta(delta: number): string {
  const abs = Math.abs(delta);
  const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return `${delta > 0 ? "+" : "−"}${text}`;
}

type PlayerOvrPanelProps = {
  rating: number;
  delta?: number | null;
  /** compact — шапка навбара; roomy — карточка профиля */
  size?: "compact" | "roomy";
  className?: string;
};

/**
 * Футбольный OVR в духе EA FC / FM / Sofascore:
 * крупное число + прогресс до следующего целого + анимация изменения.
 */
export default function PlayerOvrPanel({
  rating,
  delta = null,
  size = "compact",
  className = "",
}: PlayerOvrPanelProps) {
  const [displayRating, setDisplayRating] = useState(rating);
  const [flashFrom, setFlashFrom] = useState<number | null>(null);
  const [pulse, setPulse] = useState<"up" | "down" | null>(null);
  const prevRef = useRef(rating);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (rating === prevRef.current) return;

    const from = prevRef.current;
    const to = rating;
    prevRef.current = rating;
    setFlashFrom(from);
    setPulse(to > from ? "up" : "down");

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const start = performance.now();
    const duration = 900;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (to - from) * eased;
      setDisplayRating(Math.round(value * 10) / 10);
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayRating(to);
        window.setTimeout(() => {
          setFlashFrom(null);
          setPulse(null);
        }, 1200);
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [rating]);

  const progress = getRatingProgress(displayRating);
  const showDelta = delta != null && delta !== 0;
  const deltaTone =
    delta != null && delta > 0
      ? "player-ovr-panel__delta--up"
      : "player-ovr-panel__delta--down";
  const roomy = size === "roomy";

  return (
    <div
      className={`player-ovr-panel player-ovr-panel--${size} ${
        pulse ? `player-ovr-panel--pulse-${pulse}` : ""
      } ${className}`}
      title="OVR"
    >
      <p className="player-ovr-panel__label">Рейтинг</p>

      <div className="player-ovr-panel__value-row">
        {flashFrom != null ? (
          <p
            className={`player-ovr-panel__value player-ovr-panel__value--anim ${
              pulse === "up"
                ? "player-ovr-panel__value--up"
                : "player-ovr-panel__value--down"
            }`}
            aria-live="polite"
          >
            <span className="player-ovr-panel__from">
              {formatOverallRating(flashFrom)}
            </span>
            <span className="player-ovr-panel__arrow" aria-hidden>
              →
            </span>
            <span className="player-ovr-panel__to">
              {formatOverallRating(displayRating)}
            </span>
          </p>
        ) : (
          <p className="player-ovr-panel__value">
            {formatOverallRating(displayRating)}
          </p>
        )}

        {showDelta ? (
          <span className={`player-ovr-panel__delta ${deltaTone}`}>
            {formatDelta(delta)}
          </span>
        ) : null}
      </div>

      <p className="player-ovr-panel__progress-label">
        До {progress.next} осталось{" "}
        <span className="player-ovr-panel__remaining">
          {progress.remaining}
        </span>
      </p>

      <div
        className="player-ovr-panel__bar"
        role="progressbar"
        aria-valuenow={progress.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Прогресс до рейтинга ${progress.next}`}
      >
        <div
          className="player-ovr-panel__bar-fill"
          style={{ width: `${progress.pct}%` }}
        />
      </div>

      {roomy && showDelta ? (
        <p className="player-ovr-panel__hint">за последний матч</p>
      ) : null}
    </div>
  );
}
