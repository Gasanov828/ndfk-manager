import Link from "next/link";
import PlayerAttributesStrip from "@/components/PlayerAttributesStrip";
import PlayerAvatar from "@/components/PlayerAvatar";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import { formatOverallRating } from "@/lib/matchRatings";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";

const GOAL_MEDALS: Record<number, string> = {
  1: "\uD83E\uDD47",
  2: "\uD83E\uDD48",
  3: "\uD83E\uDD49",
};

const POSITION_BORDER: Record<string, string> = {
  "\u041d\u0410\u041f": "border-l-red-400/70",
  "\u0426\u041f": "border-l-blue-400/70",
  "\u0417\u0410\u0429": "border-l-amber-400/70",
  "\u0412\u0420\u0422": "border-l-violet-400/70",
};

type PlayerCardProps = {
  id: number;
  name: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  lineupPosition?: string | null;
  ratingDelta?: number | null;
  photoUrl?: string | null;
  goalRank?: number;
  attributes?: Record<string, number> | null;
};

export default function PlayerCard({
  id,
  name,
  position,
  rating,
  goals,
  assists,
  lineupPosition,
  ratingDelta,
  photoUrl,
  goalRank,
  attributes,
}: PlayerCardProps) {
  const group = getPositionGroup(lineupPosition ?? null, position);
  const style = getPositionStyle(group);
  const borderAccent = POSITION_BORDER[group] ?? "border-l-slate-500/50";

  return (
    <Link
      href={`/players/${id}`}
      className={`group flex items-center gap-2.5 border-l-[3px] ${borderAccent} bg-white/[0.025] px-2.5 py-2 transition hover:bg-white/[0.05] active:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 sm:gap-3 sm:px-3 sm:py-2.5`}
    >
      <PlayerAvatar
        name={name}
        photoUrl={photoUrl}
        size="xs"
        badge={group}
        badgeClassName={style.badge}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-[13px] font-bold leading-tight text-white sm:text-sm">
            {name}
          </h3>
          {goalRank ? (
            <span className="shrink-0 text-[11px]" title="\u0422\u043e\u043f \u0431\u043e\u043c\u0431\u0430\u0440\u0434\u0438\u0440">
              {GOAL_MEDALS[goalRank]}
            </span>
          ) : null}
        </div>

        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] leading-tight text-slate-400">
          <span className="truncate">{position}</span>
          {lineupPosition ? (
            <span className="truncate text-cyan-300/80">
              {"\u2022"} {lineupPosition}
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-400">
          <span className={goals > 0 ? "font-semibold text-slate-200" : ""}>
            {"\u26BD"} {goals}
          </span>
          <span className={assists > 0 ? "font-semibold text-slate-200" : ""}>
            {"\uD83C\uDFAF"} {assists}
          </span>
          <PlayerAttributesStrip
            position={position}
            attrs={attributes}
            variant="compact"
            className="!gap-x-1.5"
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5 pl-1">
        <span className="rating-lime text-lg font-black leading-none sm:text-xl">
          {formatOverallRating(rating)}
        </span>
        <RatingChangeBadge delta={ratingDelta} size="sm" />
      </div>
    </Link>
  );
}
