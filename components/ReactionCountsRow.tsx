"use client";

import { memo, useMemo } from "react";
import {
  PLAYER_REACTIONS,
  type ReactionCode,
} from "@/lib/playerReactions";

type ReactionCountsRowProps = {
  counts?: Partial<Record<ReactionCode, number>>;
  onOpen?: () => void;
};

function ReactionCountsRow({
  counts,
  onOpen,
}: ReactionCountsRowProps) {
  const items = useMemo(
    () =>
      counts
        ? PLAYER_REACTIONS.map((def) => ({
            ...def,
            count: counts[def.code] ?? 0,
          })).filter((item) => item.count > 0)
        : [],
    [counts]
  );

  if (items.length === 0) return null;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen?.();
      }}
      className="mt-0.5 flex max-w-full flex-wrap justify-center gap-0.5"
      title="Р РµР°РєС†РёРё"
    >
      {items.map((item) => (
        <span
          key={item.code}
          className="inline-flex items-center gap-0.5 rounded bg-black/35 px-1 py-px text-[7px] font-bold text-slate-200"
        >
          <span aria-hidden>{item.emoji}</span>
          <span className="tabular-nums">×{item.count}</span>
        </span>
      ))}
    </button>
  );
}

export default memo(ReactionCountsRow);