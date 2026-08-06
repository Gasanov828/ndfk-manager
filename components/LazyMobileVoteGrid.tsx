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
    <div className="mobile-vote-grid grid grid-cols-[minmax(0,2.6fr)_minmax(5.25rem,0.8fr)] gap-1.5 md:hidden">
      <MatchRatingVote compact />
      <TrainingRatingVote compact />
    </div>
  );
}
