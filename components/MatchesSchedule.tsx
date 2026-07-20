import MatchCountdown from "@/components/MatchCountdown";
import {
  formatMatchDate,
  formatMatchTime,
  type Match,
} from "@/lib/matches";
import Link from "next/link";

export type TeamReadiness = {
  ready: number;
  maybe: number;
  absent: number;
  onField: number;
};

type MatchesScheduleProps = {
  liveMatch: Match | null;
  upcomingMatch: Match | null;
  upcomingMatches: Match[];
  readiness: TeamReadiness;
};

function ReadinessStrip({ readiness }: { readiness: TeamReadiness }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px]">
      <span className="text-emerald-300">
        {"\uD83D\uDFE2"} {readiness.ready}
      </span>
      <span className="text-amber-300">
        {"\uD83D\uDFE1"} {readiness.maybe}
      </span>
      <span className="text-red-300">
        {"\uD83D\uDD34"} {readiness.absent}
      </span>
      <span className="text-cyan-300">
        {"\u26BD"} {readiness.onField}/8
      </span>
    </div>
  );
}

function FeaturedMatchCard({
  liveMatch,
  upcomingMatch,
  readiness,
}: {
  liveMatch: Match | null;
  upcomingMatch: Match | null;
  readiness: TeamReadiness;
}) {
  const focusMatch = liveMatch ?? upcomingMatch;

  if (!focusMatch) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center">
        <p className="text-sm font-semibold text-white">
          {"\u041c\u0430\u0442\u0447\u0435\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442"}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          {"\u041a\u043e\u0433\u0434\u0430 \u0434\u043e\u0431\u0430\u0432\u044f\u0442 \u0438\u0433\u0440\u0443 \u2014 \u0437\u0434\u0435\u0441\u044c \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0440\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0435"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-2.5 py-1.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {liveMatch
            ? "\u0421\u0435\u0439\u0447\u0430\u0441 \u0438\u0433\u0440\u0430\u0435\u043c"
            : "\u0411\u043b\u0438\u0436\u0430\u0439\u0448\u0430\u044f"}
        </h2>
        {liveMatch ? (
          <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-200 ring-1 ring-red-400/30">
            LIVE
          </span>
        ) : (
          <span className="rounded-md bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-bold text-orange-200 ring-1 ring-orange-400/30">
            {"\u0421\u043a\u043e\u0440\u043e"}
          </span>
        )}
      </div>

      <div className="px-2.5 py-2">
        {liveMatch ? (
          <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-2.5 py-2">
            <p className="text-base font-extrabold text-white">
              vs {liveMatch.opponent}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-300">
              {formatMatchDate(liveMatch.date)} · {formatMatchTime(liveMatch.time)}
            </p>
            <p className="truncate text-[10px] text-slate-500">
              {"\uD83D\uDCCD"} {liveMatch.location}
            </p>
          </div>
        ) : (
          <MatchCountdown match={upcomingMatch!} embedded compact />
        )}

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/8 pt-2">
          <ReadinessStrip readiness={readiness} />
          <Link
            href="/lineup"
            className="shrink-0 rounded-lg bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold text-cyan-200 ring-1 ring-cyan-400/25"
          >
            {"\u0421\u043e\u0441\u0442\u0430\u0432 \u2192"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function UpcomingList({
  matches,
  highlightId,
}: {
  matches: Match[];
  highlightId?: number;
}) {
  if (matches.length === 0) {
    return (
      <p className="px-2.5 py-3 text-center text-[11px] text-slate-500">
        {"\u041d\u0435\u0442 \u0437\u0430\u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0445 \u0438\u0433\u0440"}
      </p>
    );
  }

  return (
    <div className="divide-y divide-white/8">
      {matches.map((match) => (
        <div
          key={match.id}
          className={`flex items-center gap-2 px-2.5 py-2 ${
            match.id === highlightId ? "bg-orange-500/10" : ""
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[13px] font-semibold text-white">
                vs {match.opponent}
              </p>
              {match.id === highlightId && (
                <span className="shrink-0 text-[9px] font-bold uppercase text-orange-300">
                  {"\u0411\u043b\u0438\u0436."}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">
              {formatMatchDate(match.date)} · {formatMatchTime(match.time)}
              {match.location ? ` · ${match.location}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MatchesSchedule({
  liveMatch,
  upcomingMatch,
  upcomingMatches,
  readiness,
}: MatchesScheduleProps) {
  return (
    <div className="space-y-2">
      <FeaturedMatchCard
        liveMatch={liveMatch}
        upcomingMatch={upcomingMatch}
        readiness={readiness}
      />

      {upcomingMatches.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/8 px-2.5 py-1.5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {"\u0420\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0435"}
            </h2>
            <span className="text-[10px] text-slate-500">
              {upcomingMatches.length}
            </span>
          </div>
          <UpcomingList
            matches={upcomingMatches}
            highlightId={upcomingMatch?.id}
          />
        </section>
      )}
    </div>
  );
}
