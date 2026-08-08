import Link from "next/link";
import PlayerAvatar from "@/components/PlayerAvatar";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import { formatOverallRating } from "@/lib/matchRatings";
import { getPositionGroup } from "@/lib/positionStyles";

const GOAL_MEDALS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

const POSITION_BORDER: Record<string, string> = {
  НАП: "border-l-red-400/70",
  ЦП: "border-l-blue-400/70",
  ЗАЩ: "border-l-amber-400/70",
  ВРТ: "border-l-violet-400/70",
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
  isMe?: boolean;
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
  isMe = false,
}: PlayerCardProps) {
  const group = getPositionGroup(lineupPosition ?? null, position);
  const borderAccent = POSITION_BORDER[group] ?? "border-l-slate-500/50";

  return (
    <Link
      href={`/players/${id}`}
      className={`group flex items-center gap-2 border-l-[3px] px-2 py-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 sm:gap-2.5 sm:px-3 sm:py-2 ${borderAccent} ${
        isMe
          ? "bg-cyan-500/12 hover:bg-cyan-500/16"
          : "bg-white/[0.02] hover:bg-white/[0.05] active:bg-white/[0.07]"
      }`}
    >
      <PlayerAvatar
        name={name}
        photoUrl={photoUrl}
        size="xs"
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-[13px] font-bold leading-none text-white sm:text-sm">
            {name}
          </h3>
          {isMe && (
            <span className="shrink-0 rounded bg-cyan-400/20 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-cyan-100">
              вы
            </span>
          )}
          {goalRank ? (
            <span className="shrink-0 text-[11px]" title="Топ бомбардир">
              {GOAL_MEDALS[goalRank]}
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex min-w-0 items-center gap-2 text-[10px] leading-none text-slate-400">
          <span className="tabular-nums text-slate-300">⚽ {goals}</span>
          <span className="tabular-nums text-slate-300">◆ {assists}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5 pl-1">
        <span className="rating-lime text-[17px] font-black leading-none sm:text-xl">
          {formatOverallRating(rating)}
        </span>
        <RatingChangeBadge delta={ratingDelta} size="sm" />
      </div>
    </Link>
  );
}
