"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import MatchScoreboard from "@/components/MatchScoreboard";
import { useMyPlayerId } from "@/hooks/useMyPlayerId";
import {
  getCountdownParts,
  getMatchDateTime,
  padTime,
} from "@/lib/matchCountdown";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import {
  getLatestPlayedMatch,
  getMatchAssisters,
  getMatchGoalScorers,
  type MatchPlayerStat,
  type MatchWithResult,
} from "@/lib/matchHistory";
import { openRatingVotingEndsAt } from "@/lib/matchRatings";
import {
  getLiveMatch,
  getNextUpcomingMatch,
  isMatchKickoffPassed,
  MATCH_FINISHED_EVENT,
  MATCH_STARTED_EVENT,
  notifyMatchFinished,
  notifyMatchStarted,
  type MatchWithLive,
} from "@/lib/matchStatus";
import { supabase } from "@/lib/supabase";

type UpcomingMatchPollCardProps = {
  initialMatches: MatchWithLive[];
};

type MatchInfo = {
  id: number;
  opponent: string;
  date: string;
  time: string;
  location: string;
};

function CountdownGrid({ match }: { match: MatchInfo }) {
  const target = getMatchDateTime(match);
  const [countdown, setCountdown] = useState(() =>
    target ? getCountdownParts(target) : null
  );

  useEffect(() => {
    if (!target) return;
    const tick = () => setCountdown(getCountdownParts(target));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target?.getTime()]);

  if (!target || !countdown) {
    return (
      <p className="text-xs text-slate-400">Проверьте дату матча в админке</p>
    );
  }

  if (countdown.expired) {
    return (
      <p className="text-xs font-semibold text-amber-300">
        Время матча наступило — ждём старта
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5 text-center">
      {[
        { label: "дн", value: countdown.days },
        { label: "ч", value: countdown.hours },
        { label: "мин", value: countdown.minutes },
        { label: "сек", value: countdown.seconds, highlight: true },
      ].map(({ label, value, highlight }) => (
        <div
          key={label}
          className={`rounded-lg border px-1 py-1 ${
            highlight
              ? "border-violet-400/35 bg-violet-500/12"
              : "border-violet-500/10 bg-black/35"
          }`}
        >
          <p
            className={`font-mono text-sm font-extrabold sm:text-lg ${
              highlight ? "text-violet-300" : "text-white"
            }`}
          >
            {padTime(value)}
          </p>
          <p className="text-[9px] font-medium uppercase text-slate-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

function PastMatchStatColumn({
  title,
  items,
  valueClassName,
}: {
  title: string;
  items: { id: number; name: string; value: number }[];
  valueClassName: string;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 whitespace-nowrap text-[9px] font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <ul className="max-h-[7.5rem] space-y-0 overflow-y-auto overscroll-contain pr-0.5 sm:max-h-none">
        {items.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-[minmax(0,1fr)_12px] items-center gap-1 text-[10px] leading-tight sm:text-xs"
          >
            <span className="truncate font-medium text-slate-200">{item.name}</span>
            <span
              className={`text-right text-[10px] font-bold tabular-nums sm:text-xs ${valueClassName}`}
            >
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PastMatchCard({ match }: { match: MatchWithResult }) {
  const [stats, setStats] = useState<MatchPlayerStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setStatsLoading(true);
      const { data, error } = await supabase
        .from("match_player_stats")
        .select("*, player:players(id, name, position, rating)")
        .eq("match_id", match.id)
        .order("goals", { ascending: false });

      if (cancelled) return;

      setStats(error ? [] : ((data ?? []) as MatchPlayerStat[]));
      setStatsLoading(false);
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [match.id]);

  const scorers = getMatchGoalScorers(stats);
  const assisters = getMatchAssisters(stats);
  const hasStats = scorers.length > 0 || assisters.length > 0;

  return (
    <div className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3">
      <div className="flex items-start gap-2 sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <MatchScoreboard match={match} density="compact" />
          <p className="mt-1.5 text-[10px] text-slate-500">
            <Link
              href="/matches#history"
              className="font-semibold text-cyan-300/80 hover:underline"
            >
              История →
            </Link>
          </p>
        </div>

        <div className="min-w-[7.25rem] shrink-0 border-l border-white/8 pl-2 sm:min-w-[8.5rem] sm:pl-3">
          {statsLoading ? (
            <p className="text-[10px] text-slate-500">...</p>
          ) : hasStats ? (
            <div className="grid grid-cols-2 gap-x-2">
              <PastMatchStatColumn
                title="⚽ Голы"
                valueClassName="text-lime-400"
                items={scorers.map((stat) => ({
                  id: stat.id,
                  name: stat.player?.name?.split(/\s+/)[0] ?? "Игрок",
                  value: stat.goals,
                }))}
              />
              {assisters.length > 0 ? (
                <PastMatchStatColumn
                  title="🎯 Асс."
                  valueClassName="text-violet-300"
                  items={assisters.map((stat) => ({
                    id: stat.id,
                    name: stat.player?.name?.split(/\s+/)[0] ?? "Игрок",
                    value: stat.assists,
                  }))}
                />
              ) : (
                <div aria-hidden className="min-w-0" />
              )}
            </div>
          ) : (
            <p className="text-[9px] leading-snug text-slate-500">Нет статы</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UpcomingMatchPollCard({
  initialMatches,
}: UpcomingMatchPollCardProps) {
  const router = useRouter();
  const { isAdmin } = useMyPlayerId();
  const [matches, setMatches] = useState(initialMatches);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [liveMatch, setLiveMatch] = useState<MatchWithLive | null>(null);
  const [matchActionSaving, setMatchActionSaving] = useState(false);

  const latestPlayed = useMemo(
    () => getLatestPlayedMatch(matches as MatchWithResult[]),
    [matches]
  );

  const loadData = useCallback(async () => {
    const { data } = await supabase.from("matches").select("*");
    const matchRows = (data ?? initialMatches) as MatchWithLive[];
    setMatches(matchRows);

    const live = getLiveMatch(matchRows);
    setLiveMatch(live);

    if (live) {
      setMatch(null);
      return;
    }

    const upcoming = getNextUpcomingMatch(matchRows);
    if (!upcoming) {
      setMatch(null);
      return;
    }

    setMatch({
      id: upcoming.id,
      opponent: upcoming.opponent,
      date: upcoming.date,
      time: upcoming.time,
      location: upcoming.location ?? "",
    });
  }, [initialMatches]);

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    const refresh = () => loadData();

    window.addEventListener(MATCH_FINISHED_EVENT, refresh);
    window.addEventListener(MATCH_STARTED_EVENT, refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener(MATCH_FINISHED_EVENT, refresh);
      window.removeEventListener(MATCH_STARTED_EVENT, refresh);
    };
  }, [loadData]);

  async function handleStartMatch(matchId: number) {
    setMatchActionSaving(true);
    const { error } = await supabase
      .from("matches")
      .update({ is_live: true })
      .eq("id", matchId);

    setMatchActionSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    notifyMatchStarted();
    await loadData();
    router.refresh();
  }

  async function handleFinishMatch(matchId: number) {
    if (
      !confirm(
        "Завершить матч? Откроется голосование за оценки игроков на 12 часов."
      )
    ) {
      return;
    }

    setMatchActionSaving(true);

    const targetMatch =
      matches.find((item) => item.id === matchId) ?? liveMatch;

    const { error } = await supabase
      .from("matches")
      .update({
        is_played: true,
        is_live: false,
        rating_voting_ends_at: openRatingVotingEndsAt(targetMatch),
      })
      .eq("id", matchId);

    setMatchActionSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    notifyMatchFinished();
    await loadData();
    router.refresh();
  }

  if (liveMatch) {
    return (
      <div className="w-full rounded-2xl border border-red-400/35 bg-gradient-to-br from-red-500/15 to-orange-500/5 p-3 sm:p-4">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-200">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-400" />
          Идёт матч
        </p>
        <p className="mt-1 text-lg font-extrabold text-white">
          vs {liveMatch.opponent}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {formatMatchDate(liveMatch.date)} · {formatMatchTime(liveMatch.time)}
        </p>
        {liveMatch.location && (
          <p className="text-[11px] text-slate-500">📍 {liveMatch.location}</p>
        )}

        {(liveMatch.ndfk_goals != null || liveMatch.opponent_goals != null) && (
          <p className="mt-2 font-mono text-2xl font-black tabular-nums text-white">
            {liveMatch.ndfk_goals ?? 0}:{liveMatch.opponent_goals ?? 0}
          </p>
        )}

        {isAdmin && (
          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
            <Link
              href="/admin/matches?tab=result"
              className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2.5 text-center text-sm font-bold text-cyan-100 transition hover:bg-cyan-500/25"
            >
              Внести счёт и статистику
            </Link>
            <button
              type="button"
              onClick={() => handleFinishMatch(liveMatch.id)}
              disabled={matchActionSaving}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:from-emerald-500 hover:to-green-500 disabled:opacity-50"
            >
              {matchActionSaving ? "..." : "🏁 Завершить матч"}
            </button>
            <p className="text-center text-[10px] text-slate-400">
              Счёт можно менять во время LIVE. Голосование — после завершения (12 ч).
            </p>
          </div>
        )}

        {!isAdmin && (
          <Link
            href="/matches"
            className="mt-3 inline-block text-xs font-semibold text-cyan-400 hover:underline"
          >
            Подробнее о матче →
          </Link>
        )}
      </div>
    );
  }

  if (!match) {
    if (latestPlayed) {
      return <PastMatchCard match={latestPlayed} />;
    }

    return (
      <div className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-4 text-center sm:px-4">
        <p className="text-sm font-semibold text-slate-300">
          Ближайший матч не назначен
        </p>
        <Link
          href="/matches"
          className="mt-2 inline-block text-xs text-cyan-400 hover:underline"
        >
          Расписание →
        </Link>
      </div>
    );
  }

  const upcomingMatchRow = matches.find((row) => row.id === match.id);
  const canStartEarly = Boolean(
    isAdmin &&
      upcomingMatchRow &&
      !isMatchKickoffPassed(upcomingMatchRow) &&
      !upcomingMatchRow.is_live
  );

  return (
    <div className="premium-card w-full overflow-hidden rounded-[20px]">
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-violet-300/90">
              Ближайший матч
            </p>
            <p className="mt-0.5 text-base font-extrabold text-white sm:text-xl">
              vs {match.opponent}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-300 sm:text-sm">
              {formatMatchDate(match.date)} · {formatMatchTime(match.time)}
            </p>
            {match.location && (
              <p className="text-[11px] text-slate-500 sm:text-xs">
                📍 {match.location}
              </p>
            )}
          </div>
          <Link
            href="/matches"
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/10"
          >
            Ещё →
          </Link>
        </div>

        <div className="mt-3 border-t border-white/8 pt-3 sm:mt-3 sm:pt-3">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            До начала
          </p>
          <CountdownGrid match={match} />
        </div>

        {canStartEarly && (
          <button
            type="button"
            onClick={() => handleStartMatch(match.id)}
            disabled={matchActionSaving}
            className="mt-3 w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            {matchActionSaving ? "..." : "▶ Начать матч раньше времени"}
          </button>
        )}
      </div>
    </div>
  );
}

