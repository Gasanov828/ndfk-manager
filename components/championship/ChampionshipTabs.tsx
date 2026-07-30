"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CHAMPIONSHIP_TABS,
  getChampionshipTabId,
} from "@/lib/championship/types";

/** Горизонтальные вкладки чемпионата с прокруткой */
export default function ChampionshipTabs() {
  const pathname = usePathname();
  const active = getChampionshipTabId(pathname);

  return (
    <nav
      className="championship-tabs mb-2 -mx-1 overflow-x-auto px-1 pb-0.5"
      aria-label="Разделы чемпионата"
    >
      <div className="flex min-w-max items-stretch gap-1">
        {CHAMPIONSHIP_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`championship-tab inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition sm:text-[11px] ${
                isActive
                  ? "championship-tab--active"
                  : "text-slate-500 hover:bg-white/[0.04] hover:text-amber-100"
              }`}
            >
              <span className="text-[12px] leading-none" aria-hidden>
                {tab.icon}
              </span>
              <span className="whitespace-nowrap">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
