"use client";

import { useMemo, useState } from "react";
import {
  ACHIEVEMENT_CATEGORIES,
  getAchievementsProgress,
  MOCK_ACHIEVEMENTS,
  type AchievementCategoryId,
  type AchievementItem,
} from "@/lib/achievementsMock";

type CategoryFilter = "all" | AchievementCategoryId;

function ProgressBar({
  current,
  target,
  tone,
}: {
  current: number;
  target: number;
  tone: "earned" | "progress";
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="font-semibold tabular-nums text-slate-300">
          {current}/{target}
        </span>
        <span className="text-slate-500">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-all ${
            tone === "earned"
              ? "bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.35)]"
              : "bg-gradient-to-r from-violet-500 to-blue-400 shadow-[0_0_10px_rgba(139,92,255,0.28)]"
          }`}
          style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function AchievementCard({ item }: { item: AchievementItem }) {
  const earned = item.status === "earned";

  return (
    <article
      className={`rounded-2xl border p-3 sm:p-3.5 ${
        earned
          ? "border-emerald-400/25 bg-gradient-to-br from-emerald-500/12 via-white/[0.03] to-transparent shadow-[0_0_24px_rgba(16,185,129,0.08)]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-extrabold text-white sm:text-[15px]">
            {item.title}
          </h3>
          <p className="mt-1 text-[11px] leading-snug text-slate-400 sm:text-xs">
            {item.description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wide ring-1 ${
            earned
              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30"
              : "bg-violet-500/12 text-violet-200 ring-violet-400/25"
          }`}
        >
          {earned ? "Получено" : "В процессе"}
        </span>
      </div>

      <ProgressBar
        current={item.current}
        target={item.target}
        tone={earned ? "earned" : "progress"}
      />
    </article>
  );
}

export default function AchievementsBoard() {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const progress = useMemo(
    () => getAchievementsProgress(MOCK_ACHIEVEMENTS),
    []
  );

  const visible = useMemo(() => {
    if (filter === "all") return MOCK_ACHIEVEMENTS;
    return MOCK_ACHIEVEMENTS.filter((item) => item.categoryId === filter);
  }, [filter]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, { earned: number; total: number }> = {};
    for (const category of ACHIEVEMENT_CATEGORIES) {
      const items = MOCK_ACHIEVEMENTS.filter(
        (item) => item.categoryId === category.id
      );
      map[category.id] = {
        total: items.length,
        earned: items.filter((item) => item.status === "earned").length,
      };
    }
    return map;
  }, []);

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-3 sm:p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Общий прогресс
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-white sm:text-3xl">
              {progress.earned}
              <span className="text-base font-bold text-slate-500 sm:text-lg">
                /{progress.total}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              достижений получено · {progress.percent}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-[28px] font-black leading-none text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.35)] sm:text-4xl">
              {progress.percent}%
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/35 ring-1 ring-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-400 to-cyan-300 shadow-[0_0_16px_rgba(56,189,248,0.35)]"
            style={{ width: `${Math.max(progress.percent, 3)}%` }}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
        <div className="border-b border-white/8 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Категории
          </p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto p-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
              filter === "all"
                ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/30"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            Все · {progress.total}
          </button>
          {ACHIEVEMENT_CATEGORIES.map((category) => {
            const counts = categoryCounts[category.id];
            const active = filter === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setFilter(category.id)}
                className={`shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
                  active
                    ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/30"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <span className="mr-1" aria-hidden>
                  {category.icon}
                </span>
                {category.label}
                <span className="ml-1 text-[10px] opacity-70">
                  {counts.earned}/{counts.total}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Достижения
          </h2>
          <span className="text-[10px] text-slate-500">{visible.length}</span>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-white/10 py-10 text-center text-sm text-slate-400">
            В этой категории пока нет достижений
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <AchievementCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <p className="px-0.5 text-center text-[10px] text-slate-500">
        Интерфейс-прототип · выдача достижений появится позже
      </p>
    </div>
  );
}
