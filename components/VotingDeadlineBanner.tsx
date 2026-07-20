"use client";

import { useEffect, useState } from "react";
import {
  formatVotingCountdown,
  formatVotingDeadline,
  formatVotingTimeRemaining,
  getVotingTimeRemainingMs,
  getVotingUrgency,
  isVotingDeadlinePassed,
  type RatingVotingMatch,
} from "@/lib/matchRatings";

const URGENCY_STYLES = {
  normal: {
    shell: "border-amber-400/25 bg-gradient-to-r from-amber-500/15 to-orange-500/10",
    headline: "text-amber-100",
    timer: "text-amber-200",
    hint: "text-amber-100/75",
  },
  soon: {
    shell: "border-orange-400/35 bg-gradient-to-r from-orange-500/20 to-amber-600/15",
    headline: "text-orange-100",
    timer: "text-orange-200",
    hint: "text-orange-100/80",
  },
  urgent: {
    shell: "border-red-400/35 bg-gradient-to-r from-red-500/20 to-orange-600/15 vote-glow",
    headline: "text-red-100",
    timer: "text-red-200",
    hint: "text-red-100/85",
  },
  critical: {
    shell: "border-red-400/50 bg-gradient-to-r from-red-600/25 to-rose-600/20 vote-glow",
    headline: "text-red-50",
    timer: "text-red-100",
    hint: "text-red-50/90",
  },
} as const;

type VotingDeadlineBannerProps = {
  match: RatingVotingMatch;
  compact?: boolean;
  embedded?: boolean;
  className?: string;
};

export default function VotingDeadlineBanner({
  match,
  compact = false,
  embedded = false,
  className = "",
}: VotingDeadlineBannerProps) {
  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    getVotingTimeRemainingMs(match)
  );

  useEffect(() => {
    const update = () => setRemainingMs(getVotingTimeRemainingMs(match));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [match]);

  if (isVotingDeadlinePassed(match) || remainingMs == null || remainingMs <= 0) {
    return null;
  }

  const urgency = getVotingUrgency(remainingMs);
  const styles = URGENCY_STYLES[urgency.level];
  const countdown = formatVotingCountdown(remainingMs);
  const remainingLabel = formatVotingTimeRemaining(remainingMs);
  const deadlineLabel = formatVotingDeadline(match);

  if (embedded) {
    return (
      <div className={`border-t border-violet-400/20 pt-2 sm:pt-3 ${className}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`text-[9px] font-bold uppercase tracking-wide sm:text-[10px] ${styles.headline}`}>
              {(urgency.level === "critical" || urgency.level === "urgent") && (
                <span className="mr-1">⏳</span>
              )}
              {urgency.headline}
            </p>
            <p className={`mt-0.5 text-[11px] leading-snug ${styles.hint}`}>
              {urgency.hint}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Осталось
            </p>
            <p
              className={`font-mono text-base font-extrabold tabular-nums sm:text-xl ${styles.timer}`}
            >
              {countdown}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={`rounded-xl border px-2.5 py-2 ${styles.shell} ${className}`}
      >
        <p className={`text-[10px] font-bold uppercase tracking-wide ${styles.headline}`}>
          {urgency.level === "critical" || urgency.level === "urgent" ? "⏳ " : ""}
          {urgency.headline}
        </p>
        <p className={`mt-0.5 font-mono text-sm font-extrabold tabular-nums ${styles.timer}`}>
          {countdown}
        </p>
        <p className={`mt-0.5 text-[10px] leading-snug ${styles.hint}`}>
          {urgency.hint}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border px-3 py-3 sm:px-4 ${styles.shell} ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${styles.headline}`}
          >
            {(urgency.level === "critical" || urgency.level === "urgent") && (
              <span className="mr-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-red-400 align-middle" />
            )}
            {urgency.headline}
          </p>
          <p className={`mt-1 text-sm font-semibold ${styles.hint}`}>{urgency.hint}</p>
          {deadlineLabel && (
            <p className="mt-1 text-[11px] text-slate-400">
              Закрытие: {deadlineLabel}
              {remainingLabel ? ` · осталось ${remainingLabel}` : ""}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            До конца
          </p>
          <p
            className={`font-mono text-2xl font-extrabold tabular-nums sm:text-3xl ${styles.timer}`}
          >
            {countdown}
          </p>
        </div>
      </div>
    </div>
  );
}
