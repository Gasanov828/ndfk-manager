"use client";

import { useEffect, useState } from "react";
import {
  formatVotingCountdown,
  getVotingTimeRemainingMs,
  isVotingDeadlinePassed,
  type RatingVotingMatch,
} from "@/lib/matchRatings";

type MobileVotingTimerProps = {
  match: RatingVotingMatch;
  className?: string;
};

export default function MobileVotingTimer({
  match,
  className = "",
}: MobileVotingTimerProps) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemainingMs(getVotingTimeRemainingMs(match));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [match]);

  if (remainingMs == null) return null;

  const passed = isVotingDeadlinePassed(match) || remainingMs <= 0;
  const countdown = formatVotingCountdown(remainingMs);

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wide text-lime-300">
        {passed ? "Закрыто" : "Голосование открыто"}
      </span>
      {!passed && (
        <div className="flex items-center gap-1.5">
          <ClockIcon />
          <span className="font-mono text-sm font-extrabold tabular-nums text-lime-300">
            {countdown}
          </span>
        </div>
      )}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 text-amber-300"
      fill="none"
      aria-hidden
    >
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6v4.2l2.6 1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
