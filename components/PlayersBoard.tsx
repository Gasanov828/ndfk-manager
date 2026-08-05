"use client";

import PlayerCard from "@/components/PlayerCard";
import { useMyPlayerId } from "@/hooks/useMyPlayerId";
import { getAverageLineupRating } from "@/lib/lineup";
import { getPositionGroup, type PositionGroup } from "@/lib/positionStyles";
import { useCallback, useMemo, useState } from "react";

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
};

type PositionFilter = "all" | PositionGroup;
type SortOption = "role" | "rating" | "goals" | "assists" | "name";

const POSITION_ORDER: PositionGroup[] = ["НАП", "ЦП", "ЗАЩ", "ВРТ"];

const POSITION_TABS: { id: PositionFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "НАП", label: "Нап" },
  { id: "ЦП", label: "ЦП" },
  { id: "ЗАЩ", label: "Защ" },
  { id: "ВРТ", label: "Врт" },
];

const GROUP_TITLES: Record<PositionGroup, string> = {
  НАП: "Нападающие",
  ЦП: "Полузащита",
  ЗАЩ: "Защита",
  ВРТ: "Вратари",
};

function getGoalRankMap(players: PlayerRow[]): Record<number, number> {
  const sorted = [...players].sort(
    (a, b) => b.goals - a.goals || b.assists - a.assists
  );
  const map: Record<number, number> = {};

  sorted.forEach((player, index) => {
    if (player.goals > 0 && index < 3) {
      map[player.id] = index + 1;
    }
  });

  return map;
}

function comparePlayers(a: PlayerRow, b: PlayerRow, sortBy: SortOption) {
  if (sortBy === "name") return a.name.localeCompare(b.name, "ru");
  if (sortBy === "goals") {
    return b.goals - a.goals || b.assists - a.assists || b.rating - a.rating;
  }
  if (sortBy === "assists") {
    return b.assists - a.assists || b.goals - a.goals || b.rating - a.rating;
  }
  if (sortBy === "role") {
    const groupA = getPositionGroup(a.lineup_position, a.position);
    const groupB = getPositionGroup(b.lineup_position, b.position);
    const order =
      POSITION_ORDER.indexOf(groupA) - POSITION_ORDER.indexOf(groupB);
    if (order !== 0) return order;
    return b.rating - a.rating || b.goals - a.goals;
  }
  return b.rating - a.rating || b.goals - a.goals;
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
}: PlayersBoardProps) {
  const { playerId: myPlayerId } = useMyPlayerId();
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("role");
  const [search, setSearch] = useState("");

  const goalRanks = useMemo(() => getGoalRankMap(players), [players]);
  const averageRating = useMemo(
    () => getAverageLineupRating(players).toFixed(1),
    [players]
  );
  const topScorer = useMemo(
    () => [...players].sort((a, b) => b.goals - a.goals)[0],
    [players]
  );

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
      .sort((a, b) => comparePlayers(a, b, sortBy));
  }, [players, positionFilter, search, sortBy]);

  const mePlayer = useMemo(() => {
    if (!myPlayerId) return null;
    return filteredPlayers.find((player) => player.id === myPlayerId) ?? null;
  }, [filteredPlayers, myPlayerId]);

  const listWithoutMe = useMemo(() => {
    if (!mePlayer) return filteredPlayers;
    return filteredPlayers.filter((player) => player.id !== mePlayer.id);
  }, [filteredPlayers, mePlayer]);

  const grouped = useMemo(
    () =>
      sortBy === "role" && positionFilter === "all"
        ? POSITION_ORDER.map((group) => ({
            group,
            players: listWithoutMe.filter(
              (player) =>
                getPositionGroup(player.lineup_position, player.position) ===
                group
            ),
          })).filter((section) => section.players.length > 0)
        : null,
    [listWithoutMe, positionFilter, sortBy]
  );

  const renderCard = useCallback(
    (player: PlayerRow) => (
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
        isMe={player.id === myPlayerId}
      />
    ),
    [goalRanks, myPlayerId, ratingDeltas]
  );
  return (
    <>
      <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
        <div className="grid grid-cols-3 divide-x divide-white/10">
          <MiniStat label="Игроков" value={players.length} />
          <MiniStat
            label="Средний ★"
            value={averageRating}
          />
          <MiniStat
            label="Топ голы"
            value={
              topScorer
                ? `${topScorer.name.split(" ")[0]} ${topScorer.goals}`
                : "—"
            }
          />
        </div>
      </div>

      <div className="mb-2 space-y-1.5 rounded-xl border border-white/8 bg-white/[0.03] p-2">
        <div className="flex gap-1.5">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Найти игрока..."
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none sm:text-sm"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="w-[38%] shrink-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white focus:border-cyan-400/40 focus:outline-none sm:w-auto sm:text-sm"
            aria-label="Сортировка"
          >
            <option value="role">По роли</option>
            <option value="rating">По ★</option>
            <option value="goals">По голам</option>
            <option value="assists">По пасам</option>
            <option value="name">По имени</option>
          </select>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
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
          <span className="ml-auto shrink-0 self-center pr-0.5 text-[10px] text-slate-500">
            {filteredPlayers.length}/{players.length}
          </span>
        </div>
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="rounded-xl border border-white/8 py-10 text-center text-sm text-slate-400">
          Никого не нашли по этим фильтрам
        </div>
      ) : (
        <div className="space-y-2">
          {mePlayer && (
            <div className="overflow-hidden rounded-xl border border-cyan-400/30">
              <p className="border-b border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-cyan-200/90">
                Ваш профиль
              </p>
              {renderCard(mePlayer)}
            </div>
          )}

          {grouped ? (
            grouped.map((section) => (
              <div
                key={section.group}
                className="overflow-hidden rounded-xl border border-white/10"
              >
                <p className="border-b border-white/8 bg-white/[0.03] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                  {GROUP_TITLES[section.group]} · {section.players.length}
                </p>
                <div className="divide-y divide-white/8">
                  {section.players.map((player) => renderCard(player))}
                </div>
              </div>
            ))
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10 divide-y divide-white/8">
              {listWithoutMe.map((player) => renderCard(player))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
