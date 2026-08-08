"use client";

import { memo, useMemo } from "react";
import {
  PLAYER_REACTIONS,
  type ReactionCode,
} from "@/lib/playerReactions";

type ReactionEmojiStripProps = {
  counts?: Partial<Record<ReactionCode, number>>;
  max?: number;
  className?: string;
};

function ReactionEmojiStrip({
  counts,
  max = 4,
  className = "",
}: ReactionEmojiStripProps) {
  const items = useMemo(
    () =>
      counts
        ? PLAYER_REACTIONS.map((def) => ({
            ...def,
            count: counts[def.code] ?? 0,
          }))
            .filter((item) => item.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, max)
        : [],
    [counts, max]
  );

  if (items.length === 0) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-px bg-gradient-to-t from-black/85 via-black/50 to-transparent px-0.5 pb-0.5 pt-3 ${className}`}
      aria-hidden
    >
      {items.map((item) => (
        <span
          key={item.code}
          className="text-[8px] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-[9px]"
          title={item.label}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}

export default memo(ReactionEmojiStrip);
