"use client";

import Link from "next/link";
import type { Championship } from "@/lib/championship/types";

/** Компактный верхний баннер чемпионата */
export default function ChampionshipHeader({
  championship,
}: {
  championship: Championship | null;
}) {
  return (
    <header className="tournament-header mb-2">
      <div className="tournament-hero relative overflow-hidden rounded-[16px] border border-amber-400/25 px-2.5 py-2 sm:px-3 sm:py-2.5">
        <div className="relative z-[1] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-black tracking-tight text-amber-50 sm:text-base">
              🏆 {championship?.name ?? "Чемпионат"}
            </h1>
            <p className="mt-0.5 text-[10px] text-amber-100/55">
              Сезон {championship?.season ?? "—"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-amber-400/30 hover:text-amber-100"
            >
              Клуб
            </Link>
            <Link
              href="/career"
              className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
            >
              Карьера
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
