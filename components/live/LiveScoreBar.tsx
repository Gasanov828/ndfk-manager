"use client";

import { useEffect, useState } from "react";

type LiveScoreBarProps = {
  teamName?: string;
  ndfkGoals: number;
  opponentGoals: number;
  opponent: string;
};

export default function LiveScoreBar({
  teamName = "НДФК",
  ndfkGoals,
  opponentGoals,
  opponent,
}: LiveScoreBarProps) {
  const [bump, setBump] = useState(false);

  useEffect(() => {
    setBump(true);
    const timer = window.setTimeout(() => setBump(false), 700);
    return () => window.clearTimeout(timer);
  }, [ndfkGoals, opponentGoals]);

  return (
    <div className="sticky top-0 z-40 -mx-3 border-b border-red-400/25 bg-[#070b16]/90 px-3 py-2.5 backdrop-blur-xl sm:-mx-0 sm:rounded-2xl sm:border sm:px-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-100 shadow-[0_0_16px_rgba(248,113,113,0.35)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          LIVE
        </span>
        <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-400">
          vs {opponent}
        </p>
      </div>

      <div
        className={`mt-1.5 flex items-end justify-center gap-3 transition duration-300 ${
          bump ? "live-score-bump" : ""
        }`}
      >
        <div className="min-w-0 text-right">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-cyan-200/80">
            {teamName}
          </p>
        </div>
        <p className="font-mono text-[1.85rem] font-black leading-none tabular-nums text-white drop-shadow-[0_0_18px_rgba(251,191,36,0.35)] sm:text-[2.1rem]">
          {ndfkGoals}
          <span className="mx-1.5 text-slate-500">:</span>
          {opponentGoals}
        </p>
        <div className="min-w-0 text-left">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {opponent}
          </p>
        </div>
      </div>
    </div>
  );
}
