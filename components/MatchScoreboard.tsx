import ClubLogo from "@/components/ClubLogo";
import OpponentCrest from "@/components/OpponentCrest";
import {
  getMatchResultLabel,
  getResultColor,
  type MatchWithResult,
} from "@/lib/matchHistory";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";

type MatchScoreboardProps = {
  match: Pick<
    MatchWithResult,
    "opponent" | "ndfk_goals" | "opponent_goals" | "date" | "time" | "is_played"
  >;
  /** compact = last-match strip; roomy = summary / history */
  density?: "compact" | "roomy";
  showMeta?: boolean;
  className?: string;
};

const HOME_CLUB_NAME = "Н-ДЖЕНГУТАЙ";

export default function MatchScoreboard({
  match,
  density = "compact",
  showMeta = true,
  className = "",
}: MatchScoreboardProps) {
  const home = match.ndfk_goals;
  const away = match.opponent_goals;
  const resultLabel = getMatchResultLabel(match as MatchWithResult);
  const resultColor = getResultColor(match as MatchWithResult);
  const roomy = density === "roomy";

  return (
    <div className={`min-w-0 ${className}`}>
      {showMeta && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-violet-300/80">
            Последний матч
          </p>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${resultColor} bg-black/25`}
          >
            {resultLabel}
          </span>
          <span className="text-[10px] text-slate-500">
            {formatMatchDate(match.date)}
            {match.time ? ` · ${formatMatchTime(match.time)}` : ""}
          </span>
        </div>
      )}

      <div
        className={`grid items-center ${
          roomy
            ? "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2.5 sm:gap-3.5"
            : "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2"
        }`}
      >
        {/* Home */}
        <div className="flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
          <ClubLogo size={roomy ? "md" : "sm"} />
          <p
            className={`max-w-full truncate text-center font-extrabold leading-tight text-white sm:text-right ${
              roomy ? "text-[11px] sm:text-sm" : "text-[10px] sm:text-[11px]"
            }`}
          >
            {HOME_CLUB_NAME}
          </p>
        </div>

        {/* Score */}
        <div
          className={`shrink-0 rounded-xl border border-white/10 bg-black/35 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
            roomy
              ? "min-w-[5.25rem] px-3 py-2.5 sm:min-w-[6rem] sm:py-3"
              : "min-w-[4.5rem] px-2.5 py-2"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <span
              className={`font-black tabular-nums leading-none text-white ${
                roomy ? "text-3xl sm:text-4xl" : "text-2xl"
              }`}
            >
              {home}
            </span>
            <span
              className={`font-black leading-none text-slate-500 ${
                roomy ? "text-xl" : "text-base"
              }`}
            >
              :
            </span>
            <span
              className={`font-black tabular-nums leading-none text-white ${
                roomy ? "text-3xl sm:text-4xl" : "text-2xl"
              }`}
            >
              {away}
            </span>
          </div>
        </div>

        {/* Away */}
        <div className="flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:items-center sm:justify-start sm:gap-2">
          <OpponentCrest name={match.opponent} size={roomy ? "md" : "sm"} />
          <p
            className={`max-w-full truncate text-center font-extrabold leading-tight text-white sm:text-left ${
              roomy ? "text-[11px] sm:text-sm" : "text-[10px] sm:text-[11px]"
            }`}
          >
            {match.opponent}
          </p>
        </div>
      </div>
    </div>
  );
}
