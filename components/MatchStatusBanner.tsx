"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  getCountdownParts,
  getMatchDateTime,
  padTime,
} from "@/lib/matchCountdown";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import {
  getLiveMatch,
  getNextUpcomingMatch,
  MATCH_FINISHED_EVENT,
  MATCH_STARTED_EVENT,
  type MatchWithLive,
} from "@/lib/matchStatus";
import { shouldHideBottomNav } from "@/lib/mobileNav";
import { supabase } from "@/lib/supabase";

function sameMatch(
  a: MatchWithLive | null | undefined,
  b: MatchWithLive | null | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.is_live === b.is_live &&
    a.is_played === b.is_played &&
    a.ndfk_goals === b.ndfk_goals &&
    a.opponent_goals === b.opponent_goals
  );
}

function MiniCountdown({ match }: { match: MatchWithLive }) {
  const target = getMatchDateTime(match);
  const [countdown, setCountdown] = useState(() =>
    target ? getCountdownParts(target) : null,
  );

  useEffect(() => {
    if (!target) return;
    const tick = () => setCountdown(getCountdownParts(target));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target?.getTime()]);

  if (!target || !countdown) return null;

  if (countdown.expired) {
    return (
      <span className="text-[10px] font-semibold text-amber-300">
        {"\u0441\u043a\u043e\u0440\u043e \u0441\u0442\u0430\u0440\u0442"}
      </span>
    );
  }

  return (
    <span className="font-mono text-[11px] font-bold tabular-nums text-orange-100">
      {countdown.days > 0 ? `${countdown.days}\u0434 ` : ""}
      {padTime(countdown.hours)}:{padTime(countdown.minutes)}:
      {padTime(countdown.seconds)}
    </span>
  );
}

export default function MatchStatusBanner({
  embedded = false,
  initialLiveMatch = null,
  initialUpcomingMatch = null,
}: {
  embedded?: boolean;
  initialLiveMatch?: MatchWithLive | null;
  initialUpcomingMatch?: MatchWithLive | null;
}) {
  const pathname = usePathname();
  const { isAdmin } = useAuthProfile();
  const [liveMatch, setLiveMatch] = useState<MatchWithLive | null>(
    initialLiveMatch
  );
  const [upcomingMatch, setUpcomingMatch] = useState<MatchWithLive | null>(
    initialUpcomingMatch
  );

  const loadData = useCallback(async () => {
    const { data } = await supabase.from("matches").select("*");
    const rows = (data ?? []) as MatchWithLive[];
    const live = getLiveMatch(rows);
    const upcoming = live ? null : getNextUpcomingMatch(rows);

    setLiveMatch((prev) => (sameMatch(prev, live) ? prev : live));
    setUpcomingMatch((prev) => (sameMatch(prev, upcoming) ? prev : upcoming));
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    const refresh = () => loadData();
    window.addEventListener(MATCH_FINISHED_EVENT, refresh);
    window.addEventListener(MATCH_STARTED_EVENT, refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(MATCH_FINISHED_EVENT, refresh);
      window.removeEventListener(MATCH_STARTED_EVENT, refresh);
    };
  }, [loadData]);

  if (shouldHideBottomNav(pathname) || pathname.startsWith("/live")) return null;

  const match = liveMatch ?? upcomingMatch;
  if (!match) return null;

  const isLive = Boolean(liveMatch);
  const href = isLive ? (isAdmin ? "/live" : "/") : "/matches";

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 overflow-hidden rounded-xl px-2.5 py-1.5 transition active:scale-[0.99] ${
        embedded ? "w-full" : "mb-2 sm:mb-3"
      } ${isLive ? "match-banner-live" : "match-banner-soon"}`}
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
          "\u0421\u043a\u043e\u0440\u043e"
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
          <span className="inline-flex flex-col items-end leading-none">
            <span className="font-mono text-[13px] font-black tabular-nums text-red-100">
              {match.ndfk_goals ?? 0}:{match.opponent_goals ?? 0}
            </span>
            {isAdmin ? (
              <span className="mt-1 rounded-md border border-red-300/25 bg-red-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-red-100">
                Пульт
              </span>
            ) : null}
          </span>
        ) : (
          <MiniCountdown match={match} />
        )}
      </div>
    </Link>
  );
}
