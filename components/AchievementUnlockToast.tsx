"use client";

import { useEffect, useState } from "react";
import { RARITY_LABEL, type AchievementRarity } from "@/lib/achievements/types";

type UnseenAchievement = {
  eventId: number;
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  xp: number;
};

const rarityShell: Record<AchievementRarity, string> = {
  common:
    "border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 via-[#0b1224] to-[#0b1224]",
  rare: "border-cyan-400/40 bg-gradient-to-br from-cyan-500/20 via-[#0b1224] to-[#0b1224]",
  epic: "border-violet-400/45 bg-gradient-to-br from-violet-500/25 via-[#0b1224] to-[#0b1224]",
  legend:
    "border-amber-300/50 bg-gradient-to-br from-amber-500/25 via-orange-500/10 to-[#0b1224]",
};

/**
 * Показывает очередь новых достижений после голосования.
 * Монтируй в layout или на карьере / главной.
 */
export default function AchievementUnlockToast() {
  const [queue, setQueue] = useState<UnseenAchievement[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/achievements/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { unseen?: UnseenAchievement[] }) => {
        if (cancelled) return;
        const unseen = data.unseen ?? [];
        if (unseen.length === 0) return;
        setQueue(unseen);
        setVisible(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const current = queue[0] ?? null;

  async function dismiss() {
    if (!current) return;
    const eventId = current.eventId;
    setVisible(false);

    await fetch("/api/achievements/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventIds: [eventId] }),
    }).catch(() => {});

    setTimeout(() => {
      setQueue((prev) => prev.slice(1));
      setVisible(true);
    }, 280);
  }

  if (!current || !visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[5.5rem] z-[80] flex justify-center px-3 sm:bottom-8">
      <div
        className={`achievement-unlock-toast pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)] ${rarityShell[current.rarity]}`}
        role="status"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/85">
          🏆 Новое достижение
        </p>
        <div className="mt-2 flex items-start gap-3">
          <span className="text-3xl leading-none" aria-hidden>
            {current.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold text-white">
              {current.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
              {current.description}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-300 ring-1 ring-white/10">
                {RARITY_LABEL[current.rarity]}
              </span>
              <span className="text-[12px] font-extrabold text-amber-200">
                +{current.xp} XP
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2 text-[12px] font-bold text-white"
        >
          Круто!
        </button>
      </div>
    </div>
  );
}
