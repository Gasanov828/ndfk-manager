"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getTournamentTabId,
  TOURNAMENT_TABS,
} from "@/lib/tournament/constants";

export default function TournamentHeader() {
  const pathname = usePathname();
  const active = getTournamentTabId(pathname);

  return (
    <header className="tournament-header mb-3 sm:mb-4">
      <div className="tournament-hero relative overflow-hidden rounded-[22px] border border-amber-400/25 px-3 py-3.5 sm:px-5 sm:py-4">
        <div className="pointer-events-none absolute -right-6 -top-8 text-[7rem] opacity-[0.07] sm:text-[9rem]">
          🏆
        </div>
        <div className="relative z-[1] flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/75">
              Режим турнира
            </p>
            <h1 className="mt-0.5 truncate text-xl font-black tracking-tight text-amber-50 sm:text-2xl">
              🏆 Турнир НДФК
            </h1>
            <p className="mt-1 text-[11px] text-amber-100/55 sm:text-xs">
              Таблица · матчи · лидеры · награды
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:border-amber-400/30 hover:text-amber-100"
          >
            ← Клуб
          </Link>
        </div>
      </div>

      <nav
        className="tournament-tabs mt-2.5 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Разделы турнира"
      >
        {TOURNAMENT_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`tournament-tab shrink-0 rounded-xl px-2.5 py-2 text-[11px] font-bold transition sm:px-3 sm:text-xs ${
                isActive
                  ? "tournament-tab--active"
                  : "border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-amber-100"
              }`}
            >
              <span className="mr-1" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
