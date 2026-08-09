"use client";

import PlayerAvatar from "@/components/PlayerAvatar";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";

function benchDisplayName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 11) return trimmed;
  const part = trimmed.split(/\s+/)[0] ?? trimmed;
  return part.length > 10 ? `${part.slice(0, 9)}…` : part;
}

type ChampionshipBenchCardProps = {
  name: string;
  position: string;
  rating: number;
  photoUrl: string | null;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  onPointerUp?: (event: React.PointerEvent) => void;
  onPointerLeave?: (event: React.PointerEvent) => void;
  onPointerCancel?: (event: React.PointerEvent) => void;
};

export default function ChampionshipBenchCard({
  name,
  position,
  rating,
  photoUrl,
  selected,
  disabled = false,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
}: ChampionshipBenchCardProps) {
  const group = getPositionGroup(null, position);
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
      className={`champ-bench-card ${selected ? "champ-bench-card--selected" : ""}`}
    >
      <span
        className={`champ-bench-card__pos ${style.fieldBadge}`}
        aria-hidden
      >
        {group}
      </span>
      <span className="champ-bench-card__avatar">
        <PlayerAvatar name={name} photoUrl={photoUrl} size="bench" />
      </span>
      <span className="champ-bench-card__info">
        <span className="champ-bench-card__name">{benchDisplayName(name)}</span>
        <span className="champ-bench-card__rating">★ {Math.round(rating)}</span>
      </span>
    </button>
  );
}
