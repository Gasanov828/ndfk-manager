import Link from "next/link";
import ClubHeroBrand from "@/components/server/ClubHeroBrand";
import MatchCountdownTicker from "@/components/MatchCountdownTicker";
import { formatMatchCountdownLabel } from "@/lib/matchCountdown";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import type { MatchBannerData } from "@/lib/server/matchBanner";

export default function MobileTopHeader({
  matchBanner,
}: {
  matchBanner: MatchBannerData;
}) {
  const match = matchBanner.liveMatch ?? matchBanner.upcomingMatch;
  const isLive = Boolean(matchBanner.liveMatch);
  const countdownLabel =
    match && !isLive ? formatMatchCountdownLabel(match) : null;

  return (
    <div className="mobile-top-header mb-1.5 flex flex-col gap-1 md:mb-2">
      <ClubHeroBrand href="/" tag="ФК · главная" fullBleed />

      {match ? (
        <Link
          href={isLive ? "/" : "/matches"}
          className={`match-banner-static flex w-full items-center gap-2 overflow-hidden rounded-xl px-2.5 py-1.5 active:scale-[0.99] md:hidden ${
            isLive ? "match-banner-live" : "match-banner-soon"
          }`}
        >
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
              isLive
                ? "bg-red-500/25 text-red-100 ring-1 ring-red-400/40"
                : "bg-orange-500/20 text-orange-100 ring-1 ring-orange-400/35"
            }`}
          >
            {isLive ? (
              <span className="inline-flex items-center gap-1">
                <span
                  className="match-live-dot h-1.5 w-1.5 rounded-full bg-red-400"
                  aria-hidden
                />
                LIVE
              </span>
            ) : (
              "Скоро"
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold leading-tight text-white">
              vs {match.opponent}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-white/65">
              {formatMatchDate(match.date)} · {formatMatchTime(match.time)}
              {match.location ? ` · ${match.location}` : ""}
            </p>
          </div>

          <div className="shrink-0 text-right">
            {isLive ? (
              <span className="font-mono text-[13px] font-black tabular-nums text-red-100">
                {match.ndfk_goals ?? 0}:{match.opponent_goals ?? 0}
              </span>
            ) : countdownLabel ? (
              <MatchCountdownTicker
                match={match}
                initialLabel={countdownLabel}
              />
            ) : null}
          </div>
        </Link>
      ) : null}
    </div>
  );
}
