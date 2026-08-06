"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CHAMPIONSHIP_TABS,
  getChampionshipTabId,
} from "@/lib/championship/types";

/** Вкладки чемпионата слева */
export default function ChampionshipSideNav() {
  const pathname = usePathname();
  const active = getChampionshipTabId(pathname);

  return (
    <nav
      className="tournament-side-nav sticky top-2 flex max-h-[calc(100dvh-5.5rem)] w-[4.75rem] shrink-0 flex-col gap-1 overflow-y-auto overscroll-contain sm:w-[8.5rem] sm:gap-1.5"
      aria-label="Разделы чемпионата"
    >
      {CHAMPIONSHIP_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`tournament-tab flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-center transition sm:flex-row sm:items-center sm:gap-1.5 sm:px-2 sm:py-2 sm:text-left ${
              isActive
                ? "tournament-tab--active"
                : "text-slate-500 hover:bg-white/[0.04] hover:text-amber-100"
            }`}
          >
            <span className="text-[14px] leading-none sm:text-[13px]" aria-hidden>
              {tab.icon}
            </span>
            <span className="max-w-full truncate text-[9px] font-bold leading-tight sm:text-[11px]">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
