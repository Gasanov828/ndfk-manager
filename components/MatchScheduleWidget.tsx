"use client";

import MatchCountdown from "@/components/MatchCountdown";
import { getNextScheduledMatch } from "@/lib/matchCountdown";
import {
  getLiveMatch,
  isMatchInProgress,
  isMatchKickoffPassed,
  notifyMatchFinished,
  notifyMatchStarted,
  type MatchWithLive,
} from "@/lib/matchStatus";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import { openRatingVotingEndsAt } from "@/lib/matchRatings";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type MatchScheduleWidgetProps = {
  initialMatches: MatchWithLive[];
  embedded?: boolean;
};

export default function MatchScheduleWidget({
  initialMatches,
  embedded = true,
}: MatchScheduleWidgetProps) {
  const router = useRouter();
  const [matches, setMatches] = useState(initialMatches);
  const [saving, setSaving] = useState(false);

  const refreshMatches = useCallback(async () => {
    const { data } = await supabase.from("matches").select("*");
    if (data) setMatches(data as MatchWithLive[]);
  }, []);

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  useEffect(() => {
    const interval = setInterval(refreshMatches, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshMatches();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshMatches]);

  const liveMatch = getLiveMatch(matches);
  const upcomingMatch = getNextScheduledMatch(
    matches.filter((match) => !match.is_played && !isMatchInProgress(match))
  );

  async function handleStartMatch(matchId: number) {
    setSaving(true);
    const { error } = await supabase
      .from("matches")
      .update({ is_live: true })
      .eq("id", matchId);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    notifyMatchStarted();
    await refreshMatches();
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

    setSaving(true);

    const targetMatch = matches.find((item) => item.id === matchId);

    const { error } = await supabase
      .from("matches")
      .update({
        is_played: true,
        is_live: false,
        rating_voting_ends_at: openRatingVotingEndsAt(targetMatch),
      })
      .eq("id", matchId);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    notifyMatchFinished();
    await refreshMatches();
    router.refresh();
  }

  if (liveMatch) {
    return (
      <div className="block w-full">
        <div className="rounded-2xl border border-red-400/40 bg-gradient-to-br from-red-500/20 via-orange-500/10 to-transparent p-4 ring-1 ring-red-400/25">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-200 sm:text-xs">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9)]" />
                Идёт матч
              </p>
              <p className="mt-1 text-base font-extrabold text-white sm:text-lg">
                vs {liveMatch.opponent}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                {formatMatchDate(liveMatch.date)} · {formatMatchTime(liveMatch.time)}
              </p>
              {liveMatch.location && (
                <p className="text-xs text-slate-500">📍 {liveMatch.location}</p>
              )}
              {(liveMatch.ndfk_goals != null ||
                liveMatch.opponent_goals != null) && (
                <p className="mt-2 font-mono text-2xl font-black tabular-nums text-white">
                  {liveMatch.ndfk_goals ?? 0}:{liveMatch.opponent_goals ?? 0}
                </p>
              )}
            </div>
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-200 ring-1 ring-red-400/30">
              LIVE
            </span>
          </div>

          <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
            <Link
              href="/admin/matches?tab=result"
              className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2.5 text-center text-sm font-bold text-cyan-100 transition hover:bg-cyan-500/25"
            >
              Внести счёт и статистику
            </Link>
            <button
              type="button"
              onClick={() => handleFinishMatch(liveMatch.id)}
              disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:from-emerald-500 hover:to-green-500 disabled:opacity-50"
            >
              {saving ? "..." : "🏁 Завершить матч"}
            </button>
            <p className="text-center text-[10px] text-slate-400">
              Счёт можно менять во время LIVE. Голосование откроется только после завершения (12 ч).
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (upcomingMatch) {
    const canStartEarly =
      !isMatchKickoffPassed(upcomingMatch) && !upcomingMatch.is_live;

    return (
      <div className="w-full space-y-3">
        <MatchCountdown match={upcomingMatch} embedded={embedded} />
        {canStartEarly && (
          <button
            type="button"
            onClick={() => handleStartMatch(upcomingMatch.id)}
            disabled={saving}
            className="w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            {saving ? "..." : "▶ Начать матч раньше времени"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col justify-center py-2 text-center">
      <p className="text-sm font-semibold text-slate-300">
        Ближайший матч не назначен
      </p>
      <Link
        href="/admin/matches"
        className="mt-2 text-xs text-cyan-400 hover:underline"
      >
        Создать в админке →
      </Link>
    </div>
  );
}
