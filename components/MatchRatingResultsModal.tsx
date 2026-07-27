"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getScoreTheme } from "@/lib/gamification/scoreTheme";
import { formatSeasonLabel } from "@/lib/gamification/season";
import { formatXpDelta } from "@/lib/gamification/career";
import type { PlayerMatchGamification } from "@/lib/server/matchGamification";

type Props = {
  open: boolean;
  onClose: () => void;
  playerName: string;
  photoUrl?: string | null;
  opponent: string;
  data: PlayerMatchGamification;
  /** Голосование ещё идёт — показываем предварительные итоги. */
  preliminary?: boolean;
};

const TIER_RING: Record<string, string> = {
  bronze: "ring-amber-700/50 bg-amber-900/20",
  silver: "ring-slate-300/40 bg-slate-400/10",
  gold: "ring-amber-300/50 bg-amber-400/10",
  platinum: "ring-cyan-300/50 bg-cyan-400/10",
};

export default function MatchRatingResultsModal({
  open,
  onClose,
  playerName,
  photoUrl,
  opponent,
  data,
  preliminary = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [fillProgress, setFillProgress] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setFillProgress(false);
      return;
    }
    const raf = requestAnimationFrame(() => setFillProgress(true));
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const theme = data.matchRating != null ? getScoreTheme(data.matchRating) : null;
  const progressPct = Math.round(data.progress * 100);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="animate-results-overlay absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="glass-panel-strong animate-results-pop relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-amber-400/25 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:m-4 sm:max-w-md sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-base font-bold text-white transition hover:bg-white/20 active:scale-95"
          aria-label="Закрыть"
        >
          ✕
        </button>

        <div className="text-center">
          <p className="text-3xl">🏆</p>
          <h2 className="mt-1 text-lg font-extrabold text-white">
            {preliminary ? "Предварительные итоги" : "Голосование завершено"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {playerName} · vs {opponent}
          </p>
        </div>

        {/* Итоговая оценка */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={playerName}
              className={`h-14 w-14 shrink-0 rounded-full object-cover ring-2 ${
                theme ? theme.ring : "ring-white/15"
              }`}
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-black text-white ring-2 ring-white/15">
              {playerName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              ⭐️ Итоговая оценка
            </p>
            {data.hasVotes && data.matchRating != null && theme ? (
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black tabular-nums ${theme.text}`}>
                  {data.matchRating.toFixed(1)}
                </span>
                <span className="text-sm text-slate-500">/ 10</span>
                <span className="text-lg">{theme.emoji}</span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-400">
                Нет оценок за этот матч
              </p>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {data.isMvp && (
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-200 ring-1 ring-amber-300/40">
                  🏅 MVP матча
                </span>
              )}
              {data.hasVotes && (
                <span className="text-[10px] text-slate-500">
                  {data.voteCount}{" "}
                  {data.voteCount === 1 ? "оценка" : "оценок"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Новые достижения */}
        {data.newAchievements.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              🏅 {data.newAchievements.length === 1 ? "Новое достижение" : "Новые достижения"}
            </p>
            <div className="space-y-2">
              {data.newAchievements.map((achievement, index) => (
                <div
                  key={achievement.key}
                  className={`animate-achievement-rise flex items-center gap-3 rounded-2xl border border-white/10 p-2.5 ring-1 ${
                    TIER_RING[achievement.tier] ?? "ring-white/10"
                  }`}
                  style={{ animationDelay: `${index * 0.12}s` }}
                >
                  <span className="text-2xl">{achievement.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">
                      {achievement.title}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Карьерный прогресс */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              ⬆️ Карьерный прогресс
            </p>
            {data.xpGained > 0 && (
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] font-bold text-violet-200 ring-1 ring-violet-300/40">
                {formatXpDelta(data.xpGained)}
              </span>
            )}
          </div>

          {data.leveledUp && (
            <p className="mt-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-center text-xs font-bold text-amber-200">
              🎉 Новый уровень {data.level} — «{data.title}»!
            </p>
          )}

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-bold text-white">
              Ур. {data.level} · {data.title}
            </span>
            <span className="tabular-nums text-slate-400">
              {data.xpIntoLevel}/{data.xpForNext} XP
            </span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="animate-xp-fill h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400"
              style={{ width: fillProgress ? `${progressPct}%` : "0%" }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Сезон {formatSeasonLabel(data.season)}: ср.{" "}
              <span className="font-bold text-slate-200">
                {data.seasonAvg > 0 ? data.seasonAvg.toFixed(2) : "—"}
              </span>
            </span>
            <span>
              Матчей: <span className="font-bold text-slate-200">{data.matchesRated}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-white transition hover:from-amber-400 hover:to-orange-400 active:scale-[0.99]"
        >
          Отлично!
        </button>
      </div>
    </div>,
    document.body
  );
}
