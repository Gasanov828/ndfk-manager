"use client";

import Link from "next/link";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import { groupMatchesByRound } from "@/lib/championship/groupMatchesByRound";
import type { ChampionshipMatch, ChampionshipRound } from "@/lib/championship/types";

function teamName(match: ChampionshipMatch, side: "home" | "away"): string {
  const team = side === "home" ? match.home_team : match.away_team;
  const raw = Array.isArray(team) ? team[0] : team;
  return raw?.name ?? (side === "home" ? "Хозяева" : "Гости");
}

export default function ChampionshipMatchesList({
  matches,
  rounds = [],
}: {
  matches: ChampionshipMatch[];
  rounds?: Pick<ChampionshipRound, "id" | "round_number" | "title">[];
}) {
  if (matches.length === 0) {
    return (
      <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
        Матчей сезона пока нет. Капитан может добавить их в админке чемпионата.
      </p>
    );
  }

  const roundGroups = groupMatchesByRound(matches, rounds);
  const upcomingGroups = roundGroups
    .map((group) => ({
      ...group,
      matches: group.matches.filter((match) => !match.is_played),
    }))
    .filter((group) => group.matches.length > 0);
  const playedGroups = [...roundGroups]
    .reverse()
    .map((group) => ({
      ...group,
      matches: group.matches.filter((match) => match.is_played),
    }))
    .filter((group) => group.matches.length > 0);

  return (
    <div className="space-y-4">
      {upcomingGroups.length > 0 ? (
        <section>
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/60">
            Расписание
          </h2>
          <div className="space-y-3">
            {upcomingGroups.map((group) => (
              <RoundBlock key={`upcoming-${group.roundNumber}`} group={group} />
            ))}
          </div>
        </section>
      ) : null}

      {playedGroups.length > 0 ? (
        <section>
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/60">
            Сыгранные
          </h2>
          <div className="space-y-3">
            {playedGroups.map((group) => (
              <RoundBlock key={`played-${group.roundNumber}`} group={group} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function RoundBlock({
  group,
}: {
  group: {
    title: string;
    playedCount: number;
    totalCount: number;
    matches: ChampionshipMatch[];
  };
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] font-bold text-amber-100/90">{group.title}</p>
        <span className="text-[10px] text-slate-500">
          {group.playedCount}/{group.totalCount}
        </span>
      </div>
      <div className="space-y-1.5">
        {group.matches.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}

function MatchRow({ match }: { match: ChampionshipMatch }) {
  const score =
    match.is_played && match.home_goals != null && match.away_goals != null
      ? `${match.home_goals}:${match.away_goals}`
      : match.is_live
        ? "LIVE"
        : "vs";

  return (
    <Link
      href={`/championship/matches/${match.id}`}
      className="tournament-panel flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:border-amber-400/30 hover:bg-amber-500/[0.06]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-extrabold text-white">
          {teamName(match, "home")} — {teamName(match, "away")}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">
          {formatMatchDate(match.match_date)} · {formatMatchTime(match.match_time)}
          {match.location ? ` · ${match.location}` : ""}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-xl px-2.5 py-1.5 text-sm font-black tabular-nums ${
          match.is_live
            ? "bg-red-500/20 text-red-200"
            : match.is_played
              ? "bg-amber-500/15 text-amber-100"
              : "bg-white/5 text-slate-400"
        }`}
      >
        {score}
      </span>
    </Link>
  );
}
