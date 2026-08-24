"use client";

import { useEffect, useState } from "react";
import MatchRatingVote from "@/components/MatchRatingVote";
import TrainingRatingVote from "@/components/TrainingRatingVote";

/** Defers heavy vote widgets until after first paint to keep the header stable. */
export default function LazyMobileVoteGrid() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), {
        timeout: 1200,
      });
      return () => window.cancelIdleCallback(id);
    }

    const timer = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <div className="mobile-vote-grid mb-1 grid grid-cols-[minmax(0,1fr)_2.65rem] items-stretch overflow-hidden rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-500/12 via-slate-900/55 to-slate-950/80 shadow-[0_0_14px_rgba(251,191,36,0.08)] md:hidden">
      <MatchRatingVote compact />
      <TrainingRatingVote compact />
    </div>
  );
}
