import Link from "next/link";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import { TOURNAMENT_HOME_TEAM } from "@/lib/tournament/constants";
import type { TournamentMatchListItem } from "@/lib/tournament/build";

export default function TournamentMatchesList({
  matches,
}: {
  matches: TournamentMatchListItem[];
}) {
  if (matches.length === 0) {
    return (
      <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
        Матчей пока нет
      </p>
    );
  }

  const upcoming = matches.filter((match) => !match.isPlayed);
  const played = matches.filter((match) => match.isPlayed);

  return (
    <div className="space-y-4">
      {upcoming.length > 0 ? (
        <section>
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/60">
            Расписание
          </h2>
          <div className="space-y-1.5">
            {upcoming.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        </section>
      ) : null}

      {played.length > 0 ? (
        <section>
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/60">
            Сыгранные
          </h2>
          <div className="space-y-1.5">
            {played.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MatchRow({ match }: { match: TournamentMatchListItem }) {
  const score =
    match.isPlayed && match.ndfkGoals != null && match.opponentGoals != null
      ? `${match.ndfkGoals}:${match.opponentGoals}`
      : match.isLive
        ? "LIVE"
        : "vs";

  return (
    <Link
      href={`/tournament/matches/${match.id}`}
      className="tournament-panel flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:border-amber-400/30 hover:bg-amber-500/[0.06]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-extrabold text-white">
          {TOURNAMENT_HOME_TEAM.shortName} — {match.opponent}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">
          {formatMatchDate(match.date)} · {formatMatchTime(match.time)}
          {match.location ? ` · ${match.location}` : ""}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-xl px-2.5 py-1.5 text-sm font-black tabular-nums ${
          match.isLive
            ? "bg-red-500/20 text-red-200"
            : match.isPlayed
              ? "bg-amber-500/15 text-amber-100"
              : "bg-white/5 text-slate-400"
        }`}
      >
        {score}
      </span>
    </Link>
  );
}
