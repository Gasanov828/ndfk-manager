"use client";

import PlayerCard from "@/components/PlayerCard";
import { getAverageLineupRating } from "@/lib/lineup";
import { getPositionGroup, type PositionGroup } from "@/lib/positionStyles";
import { useMemo, useState } from "react";

export type PlayerRow = {
  id: number;
  name: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  status: string;
  lineup_position: string | null;
  photo_url?: string | null;
};

type PlayersBoardProps = {
  players: PlayerRow[];
  ratingDeltas: Record<number, number | null | undefined>;
  playerAttributesMap?: Record<number, Record<string, number>>;
};

type PositionFilter = "all" | PositionGroup;
type SortOption = "rating" | "goals" | "assists" | "name";

const POSITION_TABS: { id: PositionFilter; label: string }[] = [
  { id: "all", label: "\u0412\u0441\u0435" },
  { id: "\u041d\u0410\u041f", label: "\u041d\u0430\u043f" },
  { id: "\u0426\u041f", label: "\u0426\u041f" },
  { id: "\u0417\u0410\u0429", label: "\u0417\u0430\u0449" },
  { id: "\u0412\u0420\u0422", label: "\u0412\u0440\u0442" },
];

function getGoalRankMap(players: PlayerRow[]): Record<number, number> {
  const sorted = [...players].sort(
    (a, b) => b.goals - a.goals || b.assists - a.assists,
  );
  const map: Record<number, number> = {};

  sorted.forEach((player, index) => {
    if (player.goals > 0 && index < 3) {
      map[player.id] = index + 1;
    }
  });

  return map;
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 flex-1 px-2 py-1.5 text-center sm:px-3">
      <p className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-black leading-none text-slate-100 sm:text-base">
        {value}
      </p>
    </div>
  );
}

export default function PlayersBoard({
  players,
  ratingDeltas,
  playerAttributesMap = {},
}: PlayersBoardProps) {
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [search, setSearch] = useState("");

  const goalRanks = useMemo(() => getGoalRankMap(players), [players]);
  const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0];

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...players]
      .filter((player) => {
        const group = getPositionGroup(player.lineup_position, player.position);
        const matchesPosition =
          positionFilter === "all" || group === positionFilter;
        const matchesSearch =
          !query || player.name.toLowerCase().includes(query);

        return matchesPosition && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name, "ru");
        if (sortBy === "goals") {
          return b.goals - a.goals || b.assists - a.assists;
        }
        if (sortBy === "assists") {
          return b.assists - a.assists || b.goals - a.goals;
        }
        return b.rating - a.rating || b.goals - a.goals;
      });
  }, [players, positionFilter, search, sortBy]);

  return (
    <>
      <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] sm:mb-3">
        <div className="grid grid-cols-3 divide-x divide-white/10">
          <MiniStat
            label={"\u0418\u0433\u0440\u043e\u043a\u043e\u0432"}
            value={players.length}
          />
          <MiniStat
            label={"\u0421\u0440\u0435\u0434\u043d\u0438\u0439 \u2605"}
            value={getAverageLineupRating(players).toFixed(1)}
          />
          <MiniStat
            label={"\u0422\u043e\u043f \u0433\u043e\u043b\u044b"}
            value={
              topScorer
                ? `${topScorer.name.split(" ")[0]} ${topScorer.goals}`
                : "\u2014"
            }
          />
        </div>
      </div>

      <div className="glass-panel mb-2 space-y-2 rounded-xl p-2 sm:mb-3 sm:p-3">
        <div className="flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={"\u041d\u0430\u0439\u0442\u0438..."}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none sm:text-sm"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="w-[42%] shrink-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white focus:border-cyan-400/40 focus:outline-none sm:w-auto sm:text-sm"
          >
            <option value="rating">{"\u041f\u043e \u2605"}</option>
            <option value="goals">{"\u041f\u043e \u0433\u043e\u043b\u0430\u043c"}</option>
            <option value="assists">
              {"\u041f\u043e \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0430\u043c"}
            </option>
            <option value="name">{"\u041f\u043e \u0438\u043c\u0435\u043d\u0438"}</option>
          </select>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {POSITION_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPositionFilter(tab.id)}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition sm:text-xs ${
                positionFilter === tab.id
                  ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/30"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto self-center pr-1 text-[10px] text-slate-500">
            {filteredPlayers.length}/{players.length}
          </span>
        </div>
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="glass-panel rounded-xl py-10 text-center text-sm text-slate-400">
          {"\u041d\u0438\u043a\u043e\u0433\u043e \u043d\u0435 \u043d\u0430\u0448\u043b\u0438 \u043f\u043e \u044d\u0442\u0438\u043c \u0444\u0438\u043b\u044c\u0442\u0440\u0430\u043c"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 divide-y divide-white/8">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              id={player.id}
              name={player.name}
              position={player.position}
              rating={player.rating}
              goals={player.goals}
              assists={player.assists}
              lineupPosition={player.lineup_position}
              ratingDelta={ratingDeltas[player.id]}
              photoUrl={player.photo_url}
              goalRank={goalRanks[player.id]}
              attributes={playerAttributesMap[player.id]}
            />
          ))}
        </div>
      )}
    </>
  );
}
