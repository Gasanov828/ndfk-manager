"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type LeaderPlayer = {
  id: number;
  name: string;
  goals: number;
  assists: number;
};

const RANK_STYLES = [
  {
    medal: "🥇",
    name: "text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]",
    value: "text-yellow-300 font-extrabold",
    row: "border-yellow-400/25 bg-yellow-500/10",
  },
  {
    medal: "🥈",
    name: "text-slate-100 drop-shadow-[0_0_6px_rgba(203,213,225,0.3)]",
    value: "text-slate-200 font-extrabold",
    row: "border-slate-400/20 bg-slate-400/10",
  },
  {
    medal: "🥉",
    name: "text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.35)]",
    value: "text-orange-400 font-extrabold",
    row: "border-orange-500/25 bg-orange-600/10",
  },
];

function LeaderRow({
  player,
  rank,
  value,
}: {
  player: LeaderPlayer;
  rank: number;
  value: number;
}) {
  const style = RANK_STYLES[rank] ?? RANK_STYLES[2];

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${style.row}`}
    >
      <span className="text-base leading-none">{style.medal}</span>
      <span
        className={`max-w-[88px] truncate text-sm font-bold sm:max-w-[110px] sm:text-base ${style.name}`}
      >
        {player.name}
      </span>
      <span className={`ml-auto text-base sm:text-lg ${style.value}`}>
        {value}
      </span>
    </div>
  );
}

function LeaderColumn({
  title,
  players,
  getValue,
}: {
  title: string;
  players: LeaderPlayer[];
  getValue: (player: LeaderPlayer) => number;
}) {
  return (
    <div className="min-w-[160px] flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 sm:min-w-[190px]">
      <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-white sm:text-base">
        {title}
      </p>
      <div className="space-y-1.5">
        {players.map((player, index) => (
          <LeaderRow
            key={player.id}
            player={player}
            rank={index}
            value={getValue(player)}
          />
        ))}
      </div>
    </div>
  );
}

export default function NavbarLeaders({
  className = "hidden items-stretch gap-3 xl:flex",
}: {
  className?: string;
}) {
  const [scorers, setScorers] = useState<LeaderPlayer[]>([]);
  const [assisters, setAssisters] = useState<LeaderPlayer[]>([]);

  useEffect(() => {
    async function loadLeaders() {
      const { data } = await supabase
        .from("players")
        .select("id, name, goals, assists");

      if (!data) return;

      setScorers(
        [...data]
          .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
          .slice(0, 3)
      );
      setAssisters(
        [...data]
          .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
          .slice(0, 3)
      );
    }

    loadLeaders();
  }, []);

  if (scorers.length === 0 && assisters.length === 0) return null;

  return (
    <div className={className}>
      <LeaderColumn title="Бомбардиры" players={scorers} getValue={(p) => p.goals} />
      <LeaderColumn
        title="Ассисты"
        players={assisters}
        getValue={(p) => p.assists}
      />
    </div>
  );
}
