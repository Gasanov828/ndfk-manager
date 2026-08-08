"use client";

import PlayerAvatar from "@/components/PlayerAvatar";
import ReactionEmojiStrip from "@/components/lineup/ReactionEmojiStrip";
import ReactionCountsRow from "@/components/ReactionCountsRow";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import { formatOverallRating } from "@/lib/matchRatings";
import { getPlayerMatchStatusLabel } from "@/lib/playerMatchStatus";
import { getFirstName } from "@/lib/playerStats";
import { getPositionStyle, type PositionGroup } from "@/lib/positionStyles";
import { LINEUP_SLOT_LABELS, type LineupPosition } from "@/lib/lineup";
import type { ReactionCode } from "@/lib/playerReactions";

const STATUS_DOT: Record<string, string> = {
  ready: "bg-emerald-400",
  maybe: "bg-amber-400",
  absent: "bg-rose-500",
};

function shortName(name: string): string {
  const part = name.trim().split(/\s+/)[0] ?? name;
  return part.length > 8 ? `${part.slice(0, 7)}…` : part;
}

type LineupFieldCardProps = {
  variant: "club" | "championship";
  className?: string;
  slot: LineupPosition;
  group: PositionGroup;
  player?: {
    name: string;
    photo_url?: string | null;
    rating: number;
    status?: string;
  };
  isSelected: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  reactionCounts?: Partial<Record<ReactionCode, number>>;
  ratingDelta?: number | null;
  onClick: () => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  onPointerUp?: (event: React.PointerEvent) => void;
  onPointerLeave?: (event: React.PointerEvent) => void;
  onPointerCancel?: (event: React.PointerEvent) => void;
  onOpenReactions?: () => void;
};

export default function LineupFieldCard({
  variant,
  className = "",
  slot,
  group,
  player,
  isSelected,
  disabled = false,
  emptyLabel,
  reactionCounts,
  ratingDelta,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onOpenReactions,
}: LineupFieldCardProps) {
  const style = getPositionStyle(group);
  const isClub = variant === "club";
  const avatarSize = isClub ? "fieldWide" : "fieldChamp";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      className={`lineup-field-card lineup-field-card--${variant} relative shrink-0 transition-all duration-200 ${className} ${
        isSelected ? "z-20 scale-[1.04]" : "z-10 hover:scale-[1.02]"
      }`}
    >
      {player ? (
        <div
          className={`lineup-field-card__body overflow-hidden rounded-lg border text-center backdrop-blur-sm sm:rounded-xl ${style.fieldCard} ${
            isSelected ? "ring-2 ring-cyan-400/50" : ""
          }`}
        >
          <div className="lineup-field-card__photo relative w-full">
            <PlayerAvatar
              name={player.name}
              photoUrl={player.photo_url}
              size={avatarSize}
              className="w-full"
            />
            <span
              className={`absolute left-0.5 top-0.5 z-10 flex items-center justify-center rounded font-black leading-none ${style.fieldBadge} ${
                isClub
                  ? "h-[15px] w-[15px] text-[6px] sm:left-1 sm:top-1 sm:h-[17px] sm:w-[17px] sm:text-[7px]"
                  : "h-3.5 w-3.5 text-[5px] sm:h-4 sm:w-4 sm:text-[6px]"
              }`}
            >
              {group}
            </span>
            {isClub && player.status ? (
              <span
                className={`absolute right-0.5 top-0.5 z-10 h-2 w-2 rounded-full ring-2 ring-black/45 sm:right-1 sm:top-1 ${STATUS_DOT[player.status] ?? "bg-slate-500"}`}
                title={getPlayerMatchStatusLabel(player.status, false)}
              />
            ) : null}
            {isClub ? (
              <ReactionEmojiStrip counts={reactionCounts} />
            ) : null}
          </div>

          <div className="lineup-field-card__meta px-1 py-0.5">
            <p
              className={`truncate font-bold leading-tight text-white ${
                isClub ? "text-[8px] sm:text-[9px]" : "text-[7px] sm:text-[8px]"
              }`}
            >
              {isClub ? getFirstName(player.name) : shortName(player.name)}
            </p>
            <div className="mt-0.5 flex h-[14px] items-center justify-center gap-0.5 leading-none">
              <span
                className={`font-semibold tabular-nums text-amber-200/95 ${
                  isClub ? "text-[8px] sm:text-[9px]" : "text-[7px] sm:text-[8px]"
                }`}
              >
                ★ {isClub ? formatOverallRating(player.rating) : Math.round(player.rating)}
              </span>
              {isClub ? (
                <RatingChangeBadge delta={ratingDelta ?? undefined} size="sm" />
              ) : (
                <ReactionCountsRow
                  counts={reactionCounts}
                  onOpen={onOpenReactions}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`lineup-field-card__body lineup-field-card__body--empty flex flex-col items-center justify-center rounded-lg border border-dashed text-center backdrop-blur-sm sm:rounded-xl ${
            isSelected
              ? "border-cyan-400/40 bg-slate-900/80 ring-2 ring-cyan-400/40"
              : "border-slate-500/35 bg-slate-900/60"
          }`}
        >
          <div className="text-[8px] font-medium text-slate-400 sm:text-[9px]">
            {LINEUP_SLOT_LABELS[slot]}
          </div>
          <div className="mt-0.5 text-[8px] text-slate-500 sm:text-[10px]">
            {emptyLabel ?? "Пусто"}
          </div>
        </div>
      )}
    </button>
  );
}
