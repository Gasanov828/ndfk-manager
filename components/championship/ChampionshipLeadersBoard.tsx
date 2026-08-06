"use client";

import { useState } from "react";
import {
  ChampionshipMvpBoard,
  ChampionshipScorersBoard,
} from "@/components/championship/ChampionshipLeaderboard";
import type {
  ChampionshipMvpRow,
  ChampionshipPlayerRow,
} from "@/lib/championship/build";

type LeadersTab = "scorers" | "assists" | "mvp";

const TABS: Array<{ id: LeadersTab; label: string; icon: string }> = [
  { id: "scorers", label: "Бомбардиры", icon: "⚽" },
  { id: "assists", label: "Ассисты", icon: "🎯" },
  { id: "mvp", label: "MVP", icon: "👑" },
];

export default function ChampionshipLeadersBoard({
  scorers,
  assisters,
  mvpBoard,
}: {
  scorers: ChampionshipPlayerRow[];
  assisters: ChampionshipPlayerRow[];
  mvpBoard: ChampionshipMvpRow[];
}) {
  const [tab, setTab] = useState<LeadersTab>("scorers");

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-sm font-bold text-amber-50">📊 Лидеры сезона</h2>
        <p className="text-[10px] text-slate-500">
          Голы, пасы и MVP текущего чемпионата
        </p>
      </div>

      <div className="flex gap-1">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition sm:text-[11px] ${
                active
                  ? "tournament-tab--active"
                  : "bg-white/[0.03] text-slate-500 ring-1 ring-white/5 hover:text-amber-100"
              }`}
            >
              {item.icon} {item.label}
            </button>
          );
        })}
      </div>

      {tab === "scorers" ? (
        <ChampionshipScorersBoard rows={scorers} valueLabel="голов" />
      ) : null}
      {tab === "assists" ? (
        <ChampionshipScorersBoard rows={assisters} valueLabel="пасов" />
      ) : null}
      {tab === "mvp" ? <ChampionshipMvpBoard rows={mvpBoard} /> : null}
    </div>
  );
}
