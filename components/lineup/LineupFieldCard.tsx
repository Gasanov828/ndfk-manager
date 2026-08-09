"use client";

import PlayerAvatar from "@/components/PlayerAvatar";
import ReactionCountsRow from "@/components/ReactionCountsRow";
import { getPositionStyle, type PositionGroup } from "@/lib/positionStyles";
import { LINEUP_SLOT_LABELS, type LineupPosition } from "@/lib/lineup";
import type { ReactionCode } from "@/lib/playerReactions";

function fieldDisplayName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 9) return trimmed;
  const part = trimmed.split(/\s+/)[0] ?? trimmed;
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

/** Карточка игрока на поле чемпионата (EA FC / manager style) */
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
      className={`lineup-field-card champ-field-card ${isSelected ? "champ-field-card--selected" : ""} ${className}`}
    >
      {player ? (
        <div
          className={`champ-field-card__body lineup-field-card__body ${style.fieldCard} ${style.glow}`}
        >
          <div className={`champ-field-card__pos-header ${style.fieldBadge}`}>
            {group}
          </div>
          <div className="champ-field-card__photo lineup-field-card__photo">
            <PlayerAvatar
              name={player.name}
              photoUrl={player.photo_url}
              size="fieldChamp"
              className="w-full"
            />
          </div>
          <p className="champ-field-card__name">{fieldDisplayName(player.name)}</p>
          <div className="champ-field-card__stats">
            <span className="champ-field-card__rating">
              ★ {Math.round(player.rating)}
            </span>
            <ReactionCountsRow
              counts={reactionCounts}
              onOpen={onOpenReactions}
            />
          </div>
        </div>
      ) : (
        <div
          className={`champ-field-card__body champ-field-card__body--empty lineup-field-card__body lineup-field-card__body--empty ${
            isSelected ? "champ-field-card__body--selected" : ""
          }`}
        >
          <span className="champ-field-card__empty-slot">
            {LINEUP_SLOT_LABELS[slot]}
          </span>
          <span className="champ-field-card__empty-action">
            {emptyLabel ?? "+"}
          </span>
        </div>
      )}
    </button>
  );
}
