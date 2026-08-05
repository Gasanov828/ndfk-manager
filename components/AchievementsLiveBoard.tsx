"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_LABEL,
  type AchievementCategory,
  type AchievementProgress,
  type PlayerAchievementStats,
} from "@/lib/achievements/types";

const CATEGORY_ORDER: AchievementCategory[] = [
  "matches",
  "goals",
  "assists",
  "mvp",
  "rating",
  "ovr",
  "defense",
  "goalkeeper",
  "club",
  "reputation",
  "special",
];

type ViewMode = "next" | "all";

function CompactRow({ item }: { item: AchievementProgress }) {
  const pct =
    item.target > 0
      ? Math.min(100, Math.round((item.current / item.target) * 100))
      : 0;

  return (
    <li
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
        item.earned
          ? "border-emerald-400/20 bg-emerald-500/[0.07]"
          : "border-white/8 bg-white/[0.03]"
      }`}
    >
      <span className="text-sm leading-none" aria-hidden>
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[12px] font-bold text-white">
            {item.title}
          </p>
          {item.earned ? (
            <span className="text-[9px] font-bold text-emerald-300">✓</span>
          ) : (
            <span className="tabular-nums text-[9px] text-slate-500">
              {item.current}/{item.target}
            </span>
          )}
        </div>
        {!item.earned && (
          <div className="mt-1 career-scale h-1">
            <div
              className="career-scale-fill career-scale-fill--cyan"
              style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
            />
          </div>
        )}
      </div>
      <span className="shrink-0 text-[9px] font-bold tabular-nums text-amber-200/80">
        +{item.xp}
      </span>
    </li>
  );
}

export default function AchievementsLiveBoard() {
  const [progress, setProgress] = useState<AchievementProgress[]>([]);
  const [stats, setStats] = useState<PlayerAchievementStats | null>(null);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("next");
  const [openCategory, setOpenCategory] = useState<AchievementCategory | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/achievements/me", { cache: "no-store" })
      .then((response) => response.json())
      .then(
        (data: {
          progress?: AchievementProgress[];
          stats?: PlayerAchievementStats | null;
          totalXp?: number;
        }) => {
          if (cancelled) return;
          setProgress(data.progress ?? []);
          setStats(data.stats ?? null);
          setTotalXp(data.totalXp ?? 0);
        }
      )
      .catch(() => {
        if (!cancelled) {
          setProgress([]);
          setStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const earnedCount = progress.filter((item) => item.earned).length;

  /** Ближайшие незакрытые цели — самые «короткие» до финиша */
  const nextGoals = useMemo(() => {
    return progress
      .filter((item) => !item.earned && item.target > 0)
      .map((item) => ({
        item,
        remain: Math.max(0, item.target - item.current),
        pct: item.current / item.target,
      }))
      .sort((a, b) => b.pct - a.pct || a.remain - b.remain)
      .slice(0, 5)
      .map((entry) => entry.item);
  }, [progress]);

  const recentEarned = useMemo(() => {
    return progress
      .filter((item) => item.earned)
      .slice(0, 3);
  }, [progress]);

  const groups = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      label: CATEGORY_LABEL[category],
      items: progress.filter((item) => item.category === category),
      earned: progress.filter(
        (item) => item.category === category && item.earned
      ).length,
    })).filter((group) => group.items.length > 0);
  }, [progress]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-14 rounded-xl bg-white/5" />
        <div className="h-24 rounded-xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Compact header */}
      <section className="rounded-xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 via-violet-500/6 to-transparent px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-200/80">
              Достижения
            </p>
            <p className="text-[13px] font-extrabold text-white">
              {earnedCount}
              <span className="font-semibold text-slate-500">
                /{progress.length}
              </span>
              <span className="ml-2 text-[11px] font-bold text-amber-200">
                {totalXp} XP
              </span>
            </p>
          </div>
          <div className="flex shrink-0 rounded-lg border border-white/10 bg-black/30 p-0.5">
            <button
              type="button"
              onClick={() => setMode("next")}
              className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                mode === "next"
                  ? "bg-cyan-500/25 text-cyan-100"
                  : "text-slate-500"
              }`}
            >
              Ближайшие
            </button>
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                mode === "all"
                  ? "bg-cyan-500/25 text-cyan-100"
                  : "text-slate-500"
              }`}
            >
              Все
            </button>
          </div>
        </div>

        {stats && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {[
              `Матчи ${stats.matchesPlayed}`,
              `Голы ${stats.goals}`,
              `MVP ${stats.mvpCount}`,
              stats.avgMatchRating > 0
                ? `Ср. ${stats.avgMatchRating}`
                : null,
            ]
              .filter(Boolean)
              .map((label) => (
                <span
                  key={String(label)}
                  className="rounded-md border border-white/8 bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400"
                >
                  {label}
                </span>
              ))}
          </div>
        )}
      </section>

      {mode === "next" ? (
        <div className="space-y-2">
          <div>
            <p className="mb-1 px-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
              Ближайшие цели
            </p>
            {nextGoals.length === 0 ? (
              <p className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-2 text-[11px] text-slate-500">
                Все ближайшие закрыты — открой «Все»
              </p>
            ) : (
              <ul className="space-y-1">
                {nextGoals.map((item) => (
                  <CompactRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </div>

          {recentEarned.length > 0 && (
            <div>
              <p className="mb-1 px-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                Недавно получено
              </p>
              <ul className="space-y-1">
                {recentEarned.map((item) => (
                  <CompactRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {groups.map((group) => {
            const open = openCategory === group.category;
            return (
              <div
                key={group.category}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenCategory(open ? null : group.category)
                  }
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
                >
                  <span className="text-[12px] font-bold text-white">
                    {group.label}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {group.earned}/{group.items.length}
                    <span className="ml-1.5 text-slate-600">
                      {open ? "▲" : "▼"}
                    </span>
                  </span>
                </button>
                {open && (
                  <ul className="space-y-1 border-t border-white/8 px-1.5 pb-1.5 pt-1">
                    {group.items.map((item) => (
                      <CompactRow key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
