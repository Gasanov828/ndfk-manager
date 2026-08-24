"use client";

import { useCallback, useRef, useState } from "react";
import { MAX_VOTE_SCORE } from "@/lib/matchRatings";
import {
  getRatingBand,
  ratingBandTextClass,
} from "@/lib/ratingBands";
import { canSelectStarScore } from "@/lib/starBallotLimits";

type SwipeRatingPickerProps = {
  playerName: string;
  value: number;
  onChange: (score: number) => void;
  disabled?: boolean;
  ballotScores?: Record<number, number>;
  playerId: number;
};

export default function SwipeRatingPicker({
  playerName,
  value,
  onChange,
  disabled = false,
  ballotScores,
  playerId,
}: SwipeRatingPickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const activeScore = value > 0 ? value : 5;
  const band = getRatingBand(activeScore);
  const thumbPct =
    ((activeScore - 1) / Math.max(1, MAX_VOTE_SCORE - 1)) * 100;

  const applyScore = useCallback(
    (next: number) => {
      if (disabled) return;
      const score = Math.min(MAX_VOTE_SCORE, Math.max(1, Math.round(next)));
      if (score === value) return;

      if (ballotScores && score >= 8) {
        const check = canSelectStarScore(ballotScores, playerId, score);
        if (!check.ok) {
          alert(check.reason);
          return;
        }
      }

      onChange(score);
    },
    [ballotScores, disabled, onChange, playerId, value]
  );

  const scoreFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return activeScore;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return activeScore;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(pct * (MAX_VOTE_SCORE - 1)) + 1;
  }, [activeScore]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    applyScore(scoreFromClientX(event.clientX));
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || disabled) return;
    applyScore(scoreFromClientX(event.clientX));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  };

  const firstName = playerName.split(/\s+/)[0] ?? playerName;

  return (
    <div className="rounded-xl border border-amber-400/25 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-amber-950/20 px-3 py-2.5">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/80">
        Оценка для {firstName}
      </p>

      <div className="mt-1 flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={disabled || activeScore <= 1}
          onClick={() => applyScore(activeScore - 1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg text-slate-200 transition hover:bg-white/10 disabled:opacity-35"
          aria-label="Меньше"
        >
          −
        </button>

        <div
          className={`min-w-[4.5rem] text-center text-[2rem] font-black tabular-nums leading-none ${
            value > 0 ? ratingBandTextClass(activeScore) : "text-slate-500"
          }`}
        >
          {value > 0 ? activeScore : "—"}
        </div>

        <button
          type="button"
          disabled={disabled || activeScore >= MAX_VOTE_SCORE}
          onClick={() => applyScore(activeScore + 1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg text-slate-200 transition hover:bg-white/10 disabled:opacity-35"
          aria-label="Больше"
        >
          +
        </button>
      </div>

      {band && value > 0 ? (
        <p
          className={`mt-0.5 text-center text-[10px] font-bold ${ratingBandTextClass(activeScore)}`}
        >
          {band.emoji} {band.label}
        </p>
      ) : (
        <p className="mt-0.5 text-center text-[10px] text-slate-500">
          Свайп влево / вправо
        </p>
      )}

      <div className="mt-2.5 px-1">
        <div
          ref={trackRef}
          role="slider"
          aria-valuemin={1}
          aria-valuemax={MAX_VOTE_SCORE}
          aria-valuenow={value > 0 ? activeScore : undefined}
          aria-label={`Оценка для ${playerName}`}
          className={`relative h-10 touch-none select-none rounded-full border border-white/10 bg-white/[0.06] ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          } ${disabled ? "opacity-50" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="absolute inset-x-3 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-400 via-emerald-400 to-amber-300 transition-[width] duration-75"
              style={{ width: `${thumbPct}%` }}
            />
          </div>
          <div
            className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-200/80 bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_0_14px_rgba(251,191,36,0.45)] transition-[left] duration-75"
            style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${thumbPct / 100})` }}
          />
          <div className="pointer-events-none absolute inset-x-3 bottom-1 flex justify-between text-[8px] font-bold text-slate-500">
            <span>1</span>
            <span>{MAX_VOTE_SCORE}</span>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[9px] text-slate-500">
          ← свайп пальцем →
        </p>
      </div>
    </div>
  );
}
