"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PlayerAttributesStrip from "@/components/PlayerAttributesStrip";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import { supabase } from "@/lib/supabase";
import {
  countLineupByStatus,
  getAverageLineupRating,
  getBenchPlayers,
  getDuplicateLineupPlayers,
  getEmptyLineupSlots,
  getLineGroupAverage,
  getLineupPlayers,
  getPlayerByLineupSlot,
  getSuggestedPlayerForSlot,
  LINEUP_SLOT_LABELS,
  type LineupPosition,
  type Player,
} from "@/lib/lineup";
import {
  formatOverallRating,
  type PlayerMatchRating,
} from "@/lib/matchRatings";
import {
  getPositionGroup,
  getPositionStyle,
  type PositionGroup,
} from "@/lib/positionStyles";

type FieldSlot = {
  position: LineupPosition;
  className: string;
};

type BenchFilter = "all" | PositionGroup;

const BENCH_FILTERS: { id: BenchFilter; label: string }[] = [
  { id: "all", label: "\u0412\u0441\u0435" },
  { id: "\u041d\u0410\u041f", label: "\u041d\u0430\u043f" },
  { id: "\u0426\u041f", label: "\u0426\u041f" },
  { id: "\u0417\u0410\u0429", label: "\u0417\u0430\u0449" },
  { id: "\u0412\u0420\u0422", label: "\u0412\u0440\u0442" },
];

const STATUS_DOT: Record<string, string> = {
  ready: "bg-emerald-400",
  maybe: "bg-amber-400",
  absent: "bg-red-400",
};

function PlayerStatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[status] ?? "bg-slate-500"}`}
      title={status}
    />
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 flex-1 px-1.5 py-1.5 text-center sm:px-2.5">
      <p className="truncate text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-black leading-none text-slate-100">
        {value}
      </p>
    </div>
  );
}

const FIELD_SLOTS: FieldSlot[] = [
  { position: "НАП1", className: "top-[8%] left-[23%] -translate-x-1/2" },
  { position: "НАП2", className: "top-[8%] left-[77%] -translate-x-1/2" },
  { position: "ЦП1", className: "top-[33%] left-[20%] -translate-x-1/2" },
  { position: "ЦП2", className: "top-[33%] left-[80%] -translate-x-1/2" },
  { position: "ЗАЩ1", className: "top-[57%] left-[11%] -translate-x-1/2" },
  { position: "ЗАЩ2", className: "top-[57%] left-1/2 -translate-x-1/2" },
  { position: "ЗАЩ3", className: "top-[57%] left-[89%] -translate-x-1/2" },
  { position: "ВРТ", className: "top-[81%] left-1/2 -translate-x-1/2" },
];

type LineupBoardProps = {
  initialPlayers: Player[];
  matchRatings?: Record<number, PlayerMatchRating>;
  playerAttributesMap?: Record<number, Record<string, number>>;
  lastMatchLabel?: string | null;
  readOnly?: boolean;
};

function FieldPlayerCard({
  player,
  slot,
  slotClassName,
  isSelected,
  isSaving,
  matchRating,
  onClick,
}: {
  player: Player | undefined;
  slot: LineupPosition;
  slotClassName: string;
  isSelected: boolean;
  isSaving: boolean;
  matchRating?: PlayerMatchRating;
  onClick: () => void;
}) {
  const group = player
    ? getPositionGroup(player.lineup_position, player.position)
    : getPositionGroup(slot, slot.slice(0, 3));
  const style = getPositionStyle(group);

  return (
    <button
      type="button"
      disabled={isSaving}
      onClick={onClick}
      className={`absolute ${slotClassName} w-[62px] max-w-[20vw] transition-all duration-200 sm:w-[76px] sm:max-w-none md:w-[88px] lg:w-[96px] ${
        isSelected ? "z-20 scale-[1.04]" : "z-10 hover:scale-[1.02]"
      }`}
    >
      {player ? (
        <div
          className={`relative rounded-lg border px-1 py-1 text-center backdrop-blur-sm sm:rounded-xl sm:px-1.5 sm:py-1.5 ${style.fieldCard} ${
            isSelected ? "ring-2 ring-cyan-400/50" : ""
          }`}
        >
          <div className="absolute right-0.5 top-0.5 sm:right-1 sm:top-1">
            <PlayerStatusDot status={player.status} />
          </div>
          <div
            className={`mx-auto mb-0.5 flex h-4 w-4 items-center justify-center rounded text-[6px] font-bold sm:mb-1 sm:h-5 sm:w-5 sm:text-[7px] ${style.fieldBadge}`}
          >
            {group}
          </div>
          <div className="flex items-center justify-center gap-0.5">
            <span className="text-[9px] font-semibold text-amber-200/90 sm:text-[10px] lg:text-xs">
              {"\u2605"} {formatOverallRating(player.rating)}
            </span>
            <RatingChangeBadge delta={matchRating?.rating_delta} size="sm" />
          </div>
          <div className="mt-0.5 truncate text-[8px] font-semibold leading-tight text-slate-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] sm:text-[9px] lg:text-[10px]">
            {player.name}
          </div>
          {(player.goals > 0 || player.assists > 0) && (
            <div className="mt-0.5 flex justify-center gap-1 text-[7px] text-slate-300 sm:text-[8px]">
              {player.goals > 0 && <span>{"\u26BD"}{player.goals}</span>}
              {player.assists > 0 && <span>{"\uD83C\uDFAF"}{player.assists}</span>}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`rounded-lg border border-dashed px-1 py-1.5 text-center backdrop-blur-sm sm:rounded-xl sm:px-1.5 sm:py-2 ${
            isSelected
              ? "border-cyan-400/40 bg-slate-900/80 ring-2 ring-cyan-400/40"
              : "border-slate-500/35 bg-slate-900/60"
          }`}
        >
          <div className="text-[8px] font-medium text-slate-400 sm:text-[9px]">
            {LINEUP_SLOT_LABELS[slot]}
          </div>
          <div className="mt-0.5 text-[8px] text-slate-500 sm:text-[10px]">
            {"\u041f\u0443\u0441\u0442\u043e"}
          </div>
        </div>
      )}
    </button>
  );
}

export default function LineupBoard({
  initialPlayers,
  matchRatings = {},
  playerAttributesMap = {},
  lastMatchLabel,
  readOnly = false,
}: LineupBoardProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [selectedSlot, setSelectedSlot] = useState<LineupPosition | null>(null);
  const [selectedBenchId, setSelectedBenchId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [benchSearch, setBenchSearch] = useState("");
  const [benchFilter, setBenchFilter] = useState<BenchFilter>("all");

  const benchPlayers = getBenchPlayers(players);
  const lineupPlayers = getLineupPlayers(players);
  const averageRating = getAverageLineupRating(players);
  const emptySlots = getEmptyLineupSlots(players);
  const readyOnField = countLineupByStatus(players, "ready");
  const maybeOnField = countLineupByStatus(players, "maybe");
  const absentOnField = countLineupByStatus(players, "absent");

  const filteredBench = useMemo(() => {
    const query = benchSearch.trim().toLowerCase();

    return benchPlayers.filter((player) => {
      const group = getPositionGroup(player.lineup_position, player.position);
      const matchesFilter = benchFilter === "all" || group === benchFilter;
      const matchesSearch =
        !query || player.name.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [benchFilter, benchPlayers, benchSearch]);

  const reloadPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("rating", { ascending: false });

    if (!error && data) {
      setPlayers(data);
    }
  }, []);

  useEffect(() => {
    if (readOnly) return;

    const duplicates = getDuplicateLineupPlayers(initialPlayers);
    if (duplicates.length === 0) return;

    async function repairDuplicateSlots() {
      await Promise.all(
        duplicates.map((player) =>
          supabase
            .from("players")
            .update({ lineup_position: null })
            .eq("id", player.id)
        )
      );

      await reloadPlayers();
    }

    repairDuplicateSlots();
  }, [initialPlayers, readOnly, reloadPlayers]);

  const clearSelection = () => {
    setSelectedSlot(null);
    setSelectedBenchId(null);
  };

  const swapWithBench = async (
    fieldPlayer: Player,
    slot: LineupPosition,
    benchPlayer: Player
  ) => {
    setIsSaving(true);

    const { error: benchError } = await supabase
      .from("players")
      .update({ lineup_position: slot })
      .eq("id", benchPlayer.id);

    if (benchError) {
      alert(benchError.message);
      setIsSaving(false);
      return;
    }

    const { error: fieldError } = await supabase
      .from("players")
      .update({ lineup_position: null })
      .eq("id", fieldPlayer.id);

    if (fieldError) {
      alert(fieldError.message);
      setIsSaving(false);
      return;
    }

    clearSelection();
    await reloadPlayers();
    setIsSaving(false);
  };

  const assignBenchToEmptySlot = async (
    slot: LineupPosition,
    benchPlayer: Player
  ) => {
    setIsSaving(true);

    const { error } = await supabase
      .from("players")
      .update({ lineup_position: slot })
      .eq("id", benchPlayer.id);

    if (error) {
      alert(error.message);
      setIsSaving(false);
      return;
    }

    clearSelection();
    await reloadPlayers();
    setIsSaving(false);
  };

  const swapFieldPlayers = async (
    slotA: LineupPosition,
    playerA: Player,
    slotB: LineupPosition,
    playerB: Player
  ) => {
    setIsSaving(true);

    const { error: errorA } = await supabase
      .from("players")
      .update({ lineup_position: slotB })
      .eq("id", playerA.id);

    if (errorA) {
      alert(errorA.message);
      setIsSaving(false);
      return;
    }

    const { error: errorB } = await supabase
      .from("players")
      .update({ lineup_position: slotA })
      .eq("id", playerB.id);

    if (errorB) {
      alert(errorB.message);
      setIsSaving(false);
      return;
    }

    clearSelection();
    await reloadPlayers();
    setIsSaving(false);
  };

  const handleFieldClick = async (slot: LineupPosition) => {
    if (readOnly || isSaving) return;

    const fieldPlayer = getPlayerByLineupSlot(players, slot);
    const benchPlayer = selectedBenchId
      ? benchPlayers.find((player) => player.id === selectedBenchId)
      : null;

    if (benchPlayer) {
      if (fieldPlayer) {
        await swapWithBench(fieldPlayer, slot, benchPlayer);
      } else {
        await assignBenchToEmptySlot(slot, benchPlayer);
      }
      return;
    }

    if (selectedSlot === slot) {
      clearSelection();
      return;
    }

    if (selectedSlot) {
      const selectedPlayer = getPlayerByLineupSlot(players, selectedSlot);
      if (selectedPlayer && fieldPlayer) {
        await swapFieldPlayers(selectedSlot, selectedPlayer, slot, fieldPlayer);
      } else {
        setSelectedSlot(slot);
      }
      return;
    }

    setSelectedSlot(slot);
    setSelectedBenchId(null);
  };

  const handleBenchClick = async (benchPlayer: Player) => {
    if (readOnly || isSaving) return;

    if (selectedSlot) {
      const fieldPlayer = getPlayerByLineupSlot(players, selectedSlot);
      if (fieldPlayer) {
        await swapWithBench(fieldPlayer, selectedSlot, benchPlayer);
      } else {
        await assignBenchToEmptySlot(selectedSlot, benchPlayer);
      }
      return;
    }

    if (selectedBenchId === benchPlayer.id) {
      clearSelection();
      return;
    }

    setSelectedBenchId(benchPlayer.id);
    setSelectedSlot(null);
  };

  const hasRatingChanges = Object.values(matchRatings).some(
    (entry) => entry.rating_delta != null && entry.rating_delta !== 0
  );

  const statsGrid = (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
      <div className="grid grid-cols-4 divide-x divide-white/10">
        <MiniStat
          label={"\u041d\u0430 \u043f\u043e\u043b\u0435"}
          value={`${lineupPlayers.length}/8`}
        />
        <MiniStat
          label={"\u2605 \u0441\u043e\u0441\u0442\u0430\u0432\u0430"}
          value={averageRating.toFixed(1)}
        />
        <MiniStat
          label={"\u0413\u043e\u0442\u043e\u0432\u044b"}
          value={readyOnField}
        />
        <MiniStat
          label={"\u041f\u0443\u0441\u0442\u043e"}
          value={emptySlots.length}
        />
      </div>
    </div>
  );

  function renderBenchPlayer(player: Player, compact: boolean) {
    const group = getPositionGroup(player.lineup_position, player.position);
    const style = getPositionStyle(group);
    const isSelected = selectedBenchId === player.id;
    const benchMatchRating = matchRatings[player.id];
    const selectedClass = isSelected
      ? "border-cyan-400/50 bg-cyan-500/10"
      : "border-transparent bg-white/[0.02] hover:bg-white/[0.05]";

    if (compact) {
      return (
        <button
          key={player.id}
          type="button"
          disabled={isSaving || readOnly}
          onClick={() => handleBenchClick(player)}
          className={`flex items-center gap-1.5 border-l-[3px] px-1.5 py-1 text-left transition ${selectedClass} ${
            readOnly ? "cursor-default opacity-90" : ""
          } ${
            group === "\u041d\u0410\u041f"
              ? "border-l-red-400/70"
              : group === "\u0426\u041f"
                ? "border-l-blue-400/70"
                : group === "\u0417\u0410\u0429"
                  ? "border-l-amber-400/70"
                  : "border-l-violet-400/70"
          }`}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[6px] font-bold text-white ${style.badge}`}
          >
            {group}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <PlayerStatusDot status={player.status} />
              <span className="truncate text-[10px] font-semibold leading-tight text-white">
                {player.name}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[8px] text-slate-400">
              <span className="font-bold text-amber-200/90">
                {"\u2605"} {formatOverallRating(player.rating)}
              </span>
              {(player.goals > 0 || player.assists > 0) && (
                <span>
                  {"\u26BD"}
                  {player.goals} {"\uD83C\uDFAF"}
                  {player.assists}
                </span>
              )}
              <RatingChangeBadge
                delta={benchMatchRating?.rating_delta}
                size="sm"
              />
            </div>
          </div>
        </button>
      );
    }

    return (
      <button
        key={player.id}
        type="button"
        disabled={isSaving}
        onClick={() => handleBenchClick(player)}
        className={`flex w-full items-center gap-2 border-l-[3px] px-2 py-1.5 text-left transition ${selectedClass} ${
          group === "\u041d\u0410\u041f"
            ? "border-l-red-400/70"
            : group === "\u0426\u041f"
              ? "border-l-blue-400/70"
              : group === "\u0417\u0410\u0429"
                ? "border-l-amber-400/70"
                : "border-l-violet-400/70"
        }`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white ${style.badge}`}
        >
          {group}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <PlayerStatusDot status={player.status} />
            <span className="truncate text-[13px] font-medium text-white">
              {player.name}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
            <span>{player.position}</span>
            {(player.goals > 0 || player.assists > 0) && (
              <span>
                {"\u26BD"}
                {player.goals} {"\uD83C\uDFAF"}
                {player.assists}
              </span>
            )}
            <PlayerAttributesStrip
              position={player.position}
              attrs={playerAttributesMap[player.id]}
              variant="compact"
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="rating-lime text-base font-bold leading-none">
            {formatOverallRating(player.rating)}
          </span>
          <RatingChangeBadge delta={benchMatchRating?.rating_delta} size="sm" />
        </div>
      </button>
    );
  }

  const benchCompactPanel = (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
      <div className="flex items-center gap-2 border-b border-white/8 px-2 py-1.5">
        <span className="shrink-0 text-[11px] font-bold text-white">
          {"\u0417\u0430\u043f\u0430\u0441"} · {benchPlayers.length}
        </span>
        <input
          type="search"
          value={benchSearch}
          onChange={(event) => setBenchSearch(event.target.value)}
          placeholder={"\u041f\u043e\u0438\u0441\u043a..."}
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-white/8 px-2 py-1">
        {BENCH_FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setBenchFilter(tab.id)}
            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
              benchFilter === tab.id
                ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/30"
                : "bg-white/5 text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredBench.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-slate-500">
          {benchPlayers.length === 0
            ? "\u041d\u0435\u0442 \u0437\u0430\u043f\u0430\u0441\u043d\u044b\u0445"
            : "\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
        </p>
      ) : (
        <div className="scrollbar-thin grid max-h-[7.5rem] grid-cols-2 divide-x divide-y divide-white/8 overflow-y-auto">
          {filteredBench.map((player) => renderBenchPlayer(player, true))}
        </div>
      )}
    </div>
  );

  const instructionsPanel = (
    <div className="hidden rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 lg:block">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {readOnly
          ? "\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0441\u043e\u0441\u0442\u0430\u0432\u0430"
          : "\u041a\u0430\u043a \u043c\u0435\u043d\u044f\u0442\u044c"}
      </p>
      {readOnly ? (
        <p className="text-xs text-slate-300">
          {"\u041c\u0435\u043d\u044f\u0442\u044c \u043c\u043e\u0433\u0443\u0442 \u0432\u043e\u0448\u0435\u0434\u0448\u0438\u0435 \u0438\u0433\u0440\u043e\u043a\u0438 ("}
          <Link href="/player/login" className="text-cyan-400 hover:underline">
            {"\u0432\u0445\u043e\u0434"}
          </Link>
          {") \u0438 \u0430\u0434\u043c\u0438\u043d."}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
          <p>
            <span className="font-bold text-cyan-200">1.</span>{" "}
            {"\u0437\u0430\u043f\u0430\u0441"}
          </p>
          <p>
            <span className="font-bold text-cyan-200">2.</span>{" "}
            {"\u043f\u043e\u0437\u0438\u0446\u0438\u044f"}
          </p>
          <p>
            <span className="font-bold text-cyan-200">3.</span>{" "}
            {"\u0438\u043b\u0438 \u043d\u0430\u043e\u0431\u043e\u0440\u043e\u0442"}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
            <PlayerStatusDot status="ready" /> {"\u0433\u043e\u0442\u043e\u0432"}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
            <PlayerStatusDot status="maybe" /> {"?"}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
            <PlayerStatusDot status="absent" /> {"\u043d\u0435\u0442"}
          </span>
        </div>
      )}
    </div>
  );

  const alertBlocks = (
    <>
      {emptySlots.length > 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-100">
          <p className="font-semibold">
            {"\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 "}
            {emptySlots.length}
            {": "}
            {emptySlots.map((slot) => LINEUP_SLOT_LABELS[slot]).join(" · ")}
          </p>
          <div className="mt-1 space-y-0.5">
            {emptySlots.slice(0, 2).map((slot) => {
              const suggestion = getSuggestedPlayerForSlot(players, slot);
              if (!suggestion) return null;

              return (
                <p key={slot} className="text-[10px] text-amber-100/90">
                  {LINEUP_SLOT_LABELS[slot]}:{" "}
                  <span className="font-semibold text-white">
                    {suggestion.name}
                  </span>{" "}
                  ({"\u2605"} {formatOverallRating(suggestion.rating)})
                </p>
              );
            })}
          </div>
        </div>
      )}

      {(maybeOnField > 0 || absentOnField > 0) && (
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-2.5 py-1.5 text-xs text-violet-100">
          {"\u041d\u0430 \u043f\u043e\u043b\u0435: "}
          {maybeOnField > 0 && (
            <span className="font-semibold">
              {"\uD83D\uDFE1"} {maybeOnField} {"?"}
            </span>
          )}
          {maybeOnField > 0 && absentOnField > 0 && " · "}
          {absentOnField > 0 && (
            <span className="font-semibold">
              {"\uD83D\uDD34"} {absentOnField}{" "}
              {"\u043d\u0435 \u043f\u0440\u0438\u0434\u0443\u0442"}
            </span>
          )}
        </div>
      )}

      {!readOnly && (selectedSlot || selectedBenchId) && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-200">
          {selectedSlot &&
            "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0437\u0430\u043f\u0430\u0441\u043d\u043e\u0433\u043e \u0438\u043b\u0438 \u0434\u0440\u0443\u0433\u0443\u044e \u043f\u043e\u0437\u0438\u0446\u0438\u044e."}
          {selectedBenchId &&
            !selectedSlot &&
            "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u0437\u0438\u0446\u0438\u044e \u043d\u0430 \u043f\u043e\u043b\u0435."}{" "}
          <button
            type="button"
            onClick={clearSelection}
            className="font-medium underline hover:text-white"
          >
            {"\u041e\u0442\u043c\u0435\u043d\u0430"}
          </button>
        </div>
      )}
    </>
  );

  const fieldPanel = (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-2 sm:p-3">
      <div className="pitch-surface relative mx-auto aspect-[10/13] max-h-[min(62vh,480px)] w-full max-w-[560px] overflow-hidden rounded-xl border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.3)] sm:aspect-[4/5] sm:max-h-[640px]">
        <div className="absolute inset-2 rounded-lg border border-white/10 sm:inset-3" />
        <div className="absolute top-1/2 left-3 right-3 h-px bg-white/12" />
        <div className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12 sm:h-20 sm:w-20" />
        <div className="absolute top-3 left-1/2 h-12 w-28 -translate-x-1/2 border border-b-0 border-white/10" />
        <div className="absolute bottom-3 left-1/2 h-12 w-28 -translate-x-1/2 border border-t-0 border-white/10" />

        {FIELD_SLOTS.map(({ position, className }) => {
          const fieldPlayer = getPlayerByLineupSlot(players, position);

          return (
            <FieldPlayerCard
              key={position}
              player={fieldPlayer}
              slot={position}
              slotClassName={className}
              isSelected={selectedSlot === position}
              isSaving={isSaving}
              matchRating={
                fieldPlayer ? matchRatings[fieldPlayer.id] : undefined
              }
              onClick={() => handleFieldClick(position)}
            />
          );
        })}
      </div>

      <div className="mt-2 lg:hidden">{statsGrid}</div>

      <div className="mt-2 grid grid-cols-4 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-black/20">
        {(["\u041d\u0410\u041f", "\u0426\u041f", "\u0417\u0410\u0429", "\u0412\u0420\u0422"] as PositionGroup[]).map(
          (group) => {
            const avg = getLineGroupAverage(players, group);
            const colors = {
              "\u041d\u0410\u041f": "text-red-400/90",
              "\u0426\u041f": "text-blue-400/90",
              "\u0417\u0410\u0429": "text-amber-400/90",
              "\u0412\u0420\u0422": "text-violet-400/90",
            };

            return (
              <div key={group} className="px-1.5 py-1.5 text-center">
                <p
                  className={`text-[8px] font-semibold uppercase tracking-wide ${colors[group]}`}
                >
                  {group}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-200">
                  {avg != null ? `\u2605 ${avg.toFixed(1)}` : "\u2014"}
                </p>
              </div>
            );
          },
        )}
      </div>
    </div>
  );

  const benchPanel = (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2">
        <div>
          <h2 className="text-sm font-bold text-white">
            {"\u0417\u0430\u043f\u0430\u0441\u043d\u044b\u0435"}
          </h2>
          <p className="text-[10px] text-slate-500">
            {benchPlayers.length} {"\u0432\u043d\u0435 \u043f\u043e\u043b\u044f"}
          </p>
        </div>
        <Link
          href="/players"
          className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-white/5"
        >
          {"\u0412\u0441\u0435 \u2192"}
        </Link>
      </div>

      <div className="space-y-1.5 border-b border-white/8 px-2 py-2">
        <input
          type="search"
          value={benchSearch}
          onChange={(event) => setBenchSearch(event.target.value)}
          placeholder={"\u041d\u0430\u0439\u0442\u0438..."}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
        />
        <div className="flex gap-1 overflow-x-auto">
          {BENCH_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setBenchFilter(tab.id)}
              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                benchFilter === tab.id
                  ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-thin max-h-[min(55vh,480px)] divide-y divide-white/8 overflow-y-auto">
        {filteredBench.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            {benchPlayers.length === 0
              ? "\u041d\u0435\u0442 \u0437\u0430\u043f\u0430\u0441\u043d\u044b\u0445"
              : "\u041d\u0438\u043a\u043e\u0433\u043e \u043d\u0435 \u043d\u0430\u0448\u043b\u0438"}
          </p>
        ) : (
          filteredBench.map((player) => renderBenchPlayer(player, false))
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-1.5 lg:grid lg:grid-cols-[300px_1fr] lg:gap-3">
        <div className="order-1 lg:hidden">{benchCompactPanel}</div>
        <div className="order-2 lg:order-2">{fieldPanel}</div>
        <div className="order-3 space-y-1 lg:hidden">{alertBlocks}</div>
        <div className="order-4 hidden space-y-1.5 lg:order-1 lg:block">
          {statsGrid}
          {instructionsPanel}
          {alertBlocks}
          {benchPanel}
        </div>
      </div>

      {lastMatchLabel && hasRatingChanges && (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 lg:hidden">
          <span className="font-semibold text-white">
            {"\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0440\u0435\u0439\u0442\u0438\u043d\u0433\u0430"}
          </span>
          <span className="text-slate-400"> · {lastMatchLabel}</span>
        </div>
      )}
    </>
  );
}
