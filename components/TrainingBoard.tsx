"use client";

import Link from "next/link";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import StatCard from "@/components/StatCard";
import {
  AWAY_MATCH_RATING,
  HOME_TRAINING_RATING,
} from "@/lib/ratingVoteBranding";
import {
  formatVoteScore,
  getRatingDelta,
} from "@/lib/trainingRatings";
import {
  formatTrainingHeader,
  getLatestOpenTrainingForVoting,
  sortTrainingsByDate,
  type TrainingSession,
} from "@/lib/trainingSessions";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

type TrainingSummaryRow = {
  player_id: number;
  training_rating: number;
  vote_count: number;
  rating_before: number | null;
  rating_after: number | null;
  player?: { id: number; name: string; position: string };
};

export default function TrainingBoard() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [summariesByTraining, setSummariesByTraining] = useState<
    Record<number, TrainingSummaryRow[]>
  >({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: sessionData, error: sessionError } = await supabase
      .from("training_sessions")
      .select("*");

    if (sessionError?.message.includes("training_sessions")) {
      setSchemaError("Выполните SQL из supabase/training.sql в Supabase");
      setLoading(false);
      return;
    }

    const sorted = sortTrainingsByDate((sessionData ?? []) as TrainingSession[]);
    setSessions(sorted);
    setExpandedId(sorted.find((s) => s.is_completed)?.id ?? sorted[0]?.id ?? null);

    if (sorted.length === 0) {
      setLoading(false);
      return;
    }

    const completedIds = sorted.filter((s) => s.is_completed).map((s) => s.id);

    if (completedIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data: summaryData } = await supabase
      .from("training_rating_summary")
      .select(
        "training_id, player_id, training_rating, vote_count, rating_before, rating_after, player:players(id, name, position)"
      )
      .in("training_id", completedIds)
      .order("training_rating", { ascending: false });

    const map: Record<number, TrainingSummaryRow[]> = {};
    for (const row of summaryData ?? []) {
      const trainingId = row.training_id as number;
      const list = map[trainingId] ?? [];
      const playerRaw = row.player as
        | { id: number; name: string; position: string }
        | { id: number; name: string; position: string }[]
        | null;
      list.push({
        player_id: row.player_id as number,
        training_rating: Number(row.training_rating),
        vote_count: row.vote_count as number,
        rating_before:
          row.rating_before != null ? Number(row.rating_before) : null,
        rating_after:
          row.rating_after != null ? Number(row.rating_after) : null,
        player: Array.isArray(playerRaw) ? playerRaw[0] : playerRaw ?? undefined,
      });
      map[trainingId] = list;
    }

    setSummariesByTraining(map);
    setLoading(false);
  }

  const completedCount = sessions.filter((s) => s.is_completed).length;
  const activeVoting = getLatestOpenTrainingForVoting(sessions);

  if (schemaError) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-amber-200">
        <p>{schemaError}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-10 text-center text-slate-400">
        Загрузка…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <>
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Тренировок" value={0} icon="🏠" accent="purple" />
          <StatCard
            label="Бонус ★ дома"
            value={HOME_TRAINING_RATING.deltaLabel}
            icon="⭐"
            accent="blue"
          />
        </div>
        <div className="glass-panel rounded-2xl p-10 text-center">
          <p className="text-slate-400">Тренировок пока нет</p>
          <p className="mt-2 text-sm text-slate-500">
            Админ добавит тренировку и отметит её завершённой — откроется
            голосование
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Тренировок"
          value={sessions.length}
          icon="🏠"
          accent="purple"
        />
        <StatCard
          label="Завершено"
          value={completedCount}
          icon="✅"
          accent="blue"
        />
        <StatCard
          label="Бонус ★ дома"
          value={HOME_TRAINING_RATING.deltaLabel}
          icon="⭐"
          accent="purple"
        />
      </div>

      {activeVoting && (
        <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4">
          <p className="font-semibold text-emerald-100">
            {HOME_TRAINING_RATING.icon} Голосование дома: {activeVoting.title}
          </p>
          <p className="mt-1 text-sm text-emerald-200/80">
            Оцените игроков в шапке — кнопка «{HOME_TRAINING_RATING.navShort}» (
            {HOME_TRAINING_RATING.deltaLabel}). Матч в гостях даёт больше —{" "}
            {AWAY_MATCH_RATING.deltaLabel}.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {sessions.map((session) => {
          const isOpen = expandedId === session.id;
          const summaries = summariesByTraining[session.id] ?? [];
          const votingDone = summaries.length > 0;

          return (
            <div
              key={session.id}
              className="glass-panel-strong overflow-hidden rounded-2xl"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : session.id)}
                className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-white/5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-xl">
                  {HOME_TRAINING_RATING.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-white">{session.title}</p>
                  <p className="text-sm text-slate-400">
                    {formatTrainingHeader(session)}
                  </p>
                  {session.location && (
                    <p className="text-sm text-slate-500">📍 {session.location}</p>
                  )}
                </div>
                <div className="hidden text-right text-sm sm:block">
                  {session.is_completed ? (
                    votingDone ? (
                      <span className="text-emerald-300">Итоги подведены</span>
                    ) : (
                      <span className="text-amber-300">Голосование</span>
                    )
                  ) : (
                    <span className="text-slate-500">Запланирована</span>
                  )}
                </div>
                <span className="text-slate-500">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-white/5 p-5">
                  {session.notes && (
                    <p className="mb-4 text-sm text-slate-300">{session.notes}</p>
                  )}

                  {!session.is_completed && (
                    <p className="text-sm text-slate-500">
                      Тренировка ещё не завершена — голосование откроется после
                      завершения в админке.
                    </p>
                  )}

                  {session.is_completed && !votingDone && (
                    <p className="text-sm text-amber-200">
                      Голосование открыто — оцените команду через кнопку{" "}
                      {HOME_TRAINING_RATING.icon} «{HOME_TRAINING_RATING.navShort}»
                      в шапке.
                    </p>
                  )}

                  {votingDone && (
                    <>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                        {HOME_TRAINING_RATING.icon} Оценки дома
                      </h3>
                      <div className="space-y-2">
                        {summaries.map((row) => {
                          const group = getPositionGroup(
                            null,
                            row.player?.position ?? ""
                          );
                          const style = getPositionStyle(group);

                          return (
                            <div
                              key={row.player_id}
                              className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5"
                            >
                              <span
                                className={`flex h-7 min-w-[32px] items-center justify-center rounded-md text-[10px] font-bold text-white ${style.badge}`}
                              >
                                {group}
                              </span>
                              <span className="min-w-0 flex-1 truncate font-medium text-white">
                                {row.player?.name ?? "Игрок"}
                              </span>
                              <span className="text-sm text-emerald-300">
                                {formatVoteScore(Number(row.training_rating))}
                              </span>
                              <RatingChangeBadge
                                delta={getRatingDelta(
                                  row.rating_before,
                                  row.rating_after
                                )}
                                size="sm"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        {HOME_TRAINING_RATING.icon} Дома — {HOME_TRAINING_RATING.deltaLabel}.{" "}
        {AWAY_MATCH_RATING.icon} {AWAY_MATCH_RATING.navShort} — {AWAY_MATCH_RATING.deltaLabel}.{" "}
        <Link href="/matches#history" className="text-cyan-400 hover:underline">
          История матчей
        </Link>
      </p>
    </>
  );
}
