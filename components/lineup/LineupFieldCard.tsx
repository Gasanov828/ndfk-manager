"use client";

import PlayerAvatar from "@/components/PlayerAvatar";
import ReactionCountsRow from "@/components/ReactionCountsRow";
import { getPositionStyle, type PositionGroup } from "@/lib/positionStyles";
import { LINEUP_SLOT_LABELS, type LineupPosition } from "@/lib/lineup";
import type { ReactionCode } from "@/lib/playerReactions";

function shortName(name: string): string {
  const part = name.trim().split(/\s+/)[0] ?? name;
  return part.length > 8 ? `${part.slice(0, 7)}…` : part;
}

type LineupFieldCardProps = {
  className?: string;
  slot: LineupPosition;
  group: PositionGroup;
  player?: {
    name: string;
    photo_url?: string | null;
    rating: number;
  };
  isSelected: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  reactionCounts?: Partial<Record<ReactionCode, number>>;
  onClick: () => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  onPointerUp?: (event: React.PointerEvent) => void;
  onPointerLeave?: (event: React.PointerEvent) => void;
  onPointerCancel?: (event: React.PointerEvent) => void;
  onOpenReactions?: () => void;
};

/** Компактная карточка игрока на поле — только для чемпионата */
export default function LineupFieldCard({
  className = "",
  slot,
  group,
  player,
  isSelected,
  disabled = false,
  emptyLabel,
  reactionCounts,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onOpenReactions,
}: LineupFieldCardProps) {
  const style = getPositionStyle(group);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      className={`lineup-field-card relative shrink-0 transition-all duration-200 ${className} ${
        isSelected ? "z-20 scale-[1.04]" : "z-10 hover:scale-[1.02]"
      }`}
    >
      {player ? (
        <div
          className={`lineup-field-card__body overflow-hidden rounded-lg border text-center backdrop-blur-sm ${style.fieldCard} ${
            isSelected ? "ring-2 ring-cyan-400/50" : ""
          }`}
        >
          <div className="lineup-field-card__photo relative w-full">
            <PlayerAvatar
              name={player.name}
              photoUrl={player.photo_url}
              size="fieldChampCompact"
              className="w-full"
            />
            <span
              className={`absolute left-0.5 top-0.5 z-10 flex h-3 w-3 items-center justify-center rounded text-[5px] font-black leading-none ${style.fieldBadge}`}
            >
              {group}
            </span>
          </div>

          <div className="lineup-field-card__meta px-0.5">
            <p className="truncate text-[6px] font-bold leading-none text-white">
              {shortName(player.name)}
            </p>
            <div className="mt-px flex h-[11px] items-center justify-center gap-0.5 leading-none">
              <span className="text-[6px] font-semibold tabular-nums text-amber-200/95">
                ★ {Math.round(player.rating)}
              </span>
              <ReactionCountsRow
                counts={reactionCounts}
                onOpen={onOpenReactions}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`lineup-field-card__body lineup-field-card__body--empty flex flex-col items-center justify-center rounded-lg border border-dashed text-center backdrop-blur-sm ${
            isSelected
              ? "border-cyan-400/40 bg-slate-900/80 ring-2 ring-cyan-400/40"
              : "border-slate-500/35 bg-slate-900/60"
          }`}
        >
          <div className="text-[7px] font-medium text-slate-400">
            {LINEUP_SLOT_LABELS[slot]}
          </div>
          <div className="mt-0.5 text-[7px] text-slate-500">
            {emptyLabel ?? "+"}
          </div>
        </div>
      )}
    </button>
  );
}
