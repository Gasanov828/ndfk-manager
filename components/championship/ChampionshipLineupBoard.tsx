"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import ReactionEmojiStrip from "@/components/lineup/ReactionEmojiStrip";
import PlayerReactionSheet from "@/components/PlayerReactionSheet";
import ReactionCountsRow from "@/components/ReactionCountsRow";
import LineupFormationPicker from "@/components/LineupFormationPicker";
import { useLineupFormation } from "@/hooks/useLineupFormation";
import {
  CHAMPIONSHIP_BENCH_SIZE,
  CHAMPIONSHIP_FIELD_SIZE,
  getBenchPlayers,
  getFieldPlayers,
  getPlayerInSlot,
  type ChampionshipLineupPlayer,
  type LineupPosition,
} from "@/lib/championship/lineup";
import { LINEUP_SLOT_LABELS } from "@/lib/lineup";
import {
  CHAMPIONSHIP_LINEUP_FORMATION_STORAGE_KEY,
  getLineupFormation,
  preferredGroupForSlot,
} from "@/lib/lineupFormations";
import { formatCreateOverall } from "@/lib/playerCreateRating";
import {
  type MyReactionMap,
  type ReactionCode,
  type ReactionCountMap,
} from "@/lib/playerReactions";
import { getFirstName } from "@/lib/playerStats";
import {
  getPositionGroup,
  getPositionStyle,
  type PositionGroup,
} from "@/lib/positionStyles";
import { supabase } from "@/lib/supabase";

/** Меняется при правках UI — проверка деплоя на странице состава чемпионата */
export const CHAMPIONSHIP_LINEUP_UI_VERSION = "2026-08-09-lineup";

type BenchFilter = "all" | PositionGroup;

const BENCH_FILTERS: { id: BenchFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "НАП", label: "Нап" },
  { id: "ЦП", label: "ЦП" },
  { id: "ЗАЩ", label: "Защ" },
  { id: "ВРТ", label: "Врт" },
];

const LONG_PRESS_MS = 420;

type ChampionshipLineupBoardProps = {
  championshipId: number;
  squad: ChampionshipLineupPlayer[];
  canEdit: boolean;
  schemaMissing?: boolean;
  reactionMatchId?: number | null;
  reactionsOpen?: boolean;
  initialReactionCounts?: ReactionCountMap;
  initialMyReactions?: MyReactionMap;
  viewerPlayerId?: number | null;
};

function shortPos(position: string): PositionGroup {
  return getPositionGroup(null, position);
}

function useLongPress(onLongPress: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return {
    onPointerDown: (event: ReactPointerEvent) => {
      if (!enabled || event.button !== 0) return;
      firedRef.current = false;
      clear();
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress();
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(8);
        }
      }, LONG_PRESS_MS);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    didLongPress: () => {
      const fired = firedRef.current;
      firedRef.current = false;
      return fired;
    },
  };
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

/** Карточка на поле — как в /lineup, ~12% меньше */
function ChampionshipFieldPlayerCard({
  player,
  slot,
  isSelected,
  isSaving,
  canEdit,
  reactionCounts,
  onClick,
  onOpenReactions,
}: {
  player?: ChampionshipLineupPlayer;
  slot: LineupPosition;
  isSelected: boolean;
  isSaving: boolean;
  canEdit: boolean;
  reactionCounts?: Partial<Record<ReactionCode, number>>;
  onClick: () => void;
  onOpenReactions?: () => void;
}) {
  const group = player
    ? shortPos(player.position)
    : preferredGroupForSlot(slot);
  const style = getPositionStyle(group);
  const longPress = useLongPress(
    () => onOpenReactions?.(),
    Boolean(player && onOpenReactions && canEdit)
  );

  return (
    <button
      type="button"
      disabled={isSaving || (!canEdit && !player)}
      onClick={() => {
        if (longPress.didLongPress()) return;
        onClick();
      }}
      onPointerDown={longPress.onPointerDown}
      onPointerUp={longPress.onPointerUp}
      onPointerLeave={longPress.onPointerLeave}
      onPointerCancel={longPress.onPointerCancel}
      className={`relative shrink-0 w-[60px] max-w-[17vw] transition-all duration-200 sm:w-[70px] sm:max-w-none md:w-[79px] lg:w-[88px] ${
        isSelected ? "z-20 scale-[1.04]" : "z-10 hover:scale-[1.02]"
      }`}
    >
      {player ? (
        <div
          className={`overflow-hidden rounded-lg border text-center backdrop-blur-sm sm:rounded-xl ${style.fieldCard} ${
            isSelected ? "ring-2 ring-cyan-400/50" : ""
          }`}
        >
          <div className="relative w-full">
            <PlayerAvatar
              name={player.name}
              photoUrl={player.photo_url}
              size="fieldWide"
              className="w-full"
            />
            <span
              className={`absolute left-0.5 top-0.5 z-10 flex h-[13px] w-[13px] items-center justify-center rounded text-[5px] font-black leading-none sm:left-1 sm:top-1 sm:h-[15px] sm:w-[15px] sm:text-[6px] ${style.fieldBadge}`}
            >
              {group}
            </span>
            <ReactionEmojiStrip counts={reactionCounts} />
          </div>

          <div className="px-1 py-0.5">
            <p className="truncate text-[7px] font-bold leading-tight text-white sm:text-[8px]">
              {getFirstName(player.name)}
            </p>
            <div className="mt-0.5 flex items-center justify-center gap-0.5 leading-none">
              <span className="text-[7px] font-semibold tabular-nums text-amber-200/95 sm:text-[8px]">
                ★ {formatCreateOverall(Math.round(player.rating))}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-lg border border-dashed px-1 py-2.5 text-center backdrop-blur-sm sm:rounded-xl sm:px-1.5 sm:py-3 ${
            isSelected
              ? "border-cyan-400/40 bg-slate-900/80 ring-2 ring-cyan-400/40"
              : "border-slate-500/35 bg-slate-900/60"
          }`}
        >
          <div className="text-[7px] font-medium text-slate-400 sm:text-[8px]">
            {LINEUP_SLOT_LABELS[slot]}
          </div>
          <div className="mt-0.5 text-[7px] text-slate-500 sm:text-[9px]">
            Пусто
          </div>
        </div>
      )}
    </button>
  );
}

function ChampionshipBenchRow({
  player,
  isSelected,
  isSaving,
  canEdit,
  reactionCounts,
  onClick,
  onOpenReactions,
}: {
  player: ChampionshipLineupPlayer;
  isSelected: boolean;
  isSaving: boolean;
  canEdit: boolean;
  reactionCounts?: Partial<Record<ReactionCode, number>>;
  onClick: () => void;
  onOpenReactions: () => void;
}) {
  const group = shortPos(player.position);
  const style = getPositionStyle(group);
  const selectedClass = isSelected
    ? "border-cyan-400/50 bg-cyan-500/10"
    : "border-transparent bg-white/[0.02] hover:bg-white/[0.05]";
  const longPress = useLongPress(onOpenReactions, canEdit);
  const borderColor =
    group === "НАП"
      ? "border-l-red-400/70"
      : group === "ЦП"
        ? "border-l-blue-400/70"
        : group === "ЗАЩ"
          ? "border-l-amber-400/70"
          : "border-l-violet-400/70";

  return (
    <button
      type="button"
      disabled={isSaving}
      onClick={() => {
        if (longPress.didLongPress()) return;
        onClick();
      }}
      onPointerDown={longPress.onPointerDown}
      onPointerUp={longPress.onPointerUp}
      onPointerLeave={longPress.onPointerLeave}
      onPointerCancel={longPress.onPointerCancel}
      className={`flex items-center gap-1.5 border-l-[3px] px-1.5 py-1 text-left transition ${selectedClass} ${borderColor} ${
        !canEdit ? "cursor-pointer opacity-90" : ""
      }`}
    >
      <div className="relative shrink-0 scale-[0.88] origin-left">
        <PlayerAvatar
          name={player.name}
          photoUrl={player.photo_url}
          size="bench"
        />
        <span
          className={`absolute left-0 top-0 z-10 flex h-3 w-3 items-center justify-center rounded text-[5px] font-black leading-none ring-1 ring-black/35 ${style.fieldBadge}`}
        >
          {group}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <span className="truncate text-[9px] font-semibold leading-tight text-white">
          {player.name}
        </span>
        <div className="mt-0.5 flex items-center gap-1.5 text-[7px] text-slate-400">
          <span className="font-bold text-amber-200/90">
            ★ {formatCreateOverall(Math.round(player.rating))}
          </span>
        </div>
        <ReactionCountsRow counts={reactionCounts} onOpen={onOpenReactions} />
      </div>
    </button>
  );
}

export default function ChampionshipLineupBoard({
  championshipId,
  squad: initialSquad,
  canEdit,
  schemaMissing = false,
  reactionMatchId = null,
  reactionsOpen = false,
  initialReactionCounts = {},
  initialMyReactions = {},
  viewerPlayerId = null,
}: ChampionshipLineupBoardProps) {
  const router = useRouter();
  const [squad, setSquad] = useState(initialSquad);
  const [selectedSlot, setSelectedSlot] = useState<LineupPosition | null>(null);
  const [selectedBenchId, setSelectedBenchId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [benchSearch, setBenchSearch] = useState("");
  const [benchFilter, setBenchFilter] = useState<BenchFilter>("all");
  const [reactionCounts, setReactionCounts] =
    useState<ReactionCountMap>(initialReactionCounts);
  const [myReactions, setMyReactions] =
    useState<MyReactionMap>(initialMyReactions);
  const [sheetPlayerId, setSheetPlayerId] = useState<number | null>(null);
  const { formationId, setFormationId } = useLineupFormation(
    CHAMPIONSHIP_LINEUP_FORMATION_STORAGE_KEY
  );
  const formation = useMemo(
    () => getLineupFormation(formationId),
    [formationId]
  );
  const fieldSlots = useMemo(
    () =>
      formation.rows.flatMap((row) =>
        row.slots.map((position) => ({
          position,
          group: preferredGroupForSlot(position),
        }))
      ),
    [formation]
  );

  useEffect(() => {
    setSquad(initialSquad);
  }, [initialSquad]);

  useEffect(() => {
    setReactionCounts(initialReactionCounts);
  }, [initialReactionCounts]);

  useEffect(() => {
    setMyReactions(initialMyReactions);
  }, [initialMyReactions]);

  const fieldPlayers = useMemo(() => getFieldPlayers(squad), [squad]);
  const bench = useMemo(() => getBenchPlayers(squad), [squad]);
  const avg =
    fieldPlayers.length > 0
      ? fieldPlayers.reduce((sum, player) => sum + player.rating, 0) /
        fieldPlayers.length
      : 0;

  const emptySlots = useMemo(
    () =>
      fieldSlots
        .map(({ position }) => position)
        .filter((slot) => !getPlayerInSlot(squad, slot)),
    [fieldSlots, squad]
  );

  const filteredBench = useMemo(() => {
    const query = benchSearch.trim().toLowerCase();
    return bench.filter((player) => {
      const group = shortPos(player.position);
      const matchesFilter = benchFilter === "all" || group === benchFilter;
      const matchesSearch =
        !query || player.name.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [bench, benchFilter, benchSearch]);

  const sheetPlayer =
    sheetPlayerId != null
      ? squad.find((player) => player.id === sheetPlayerId) ?? null
      : null;

  const openReactions = useCallback((playerId: number) => {
    setSheetPlayerId(playerId);
    setSelectedSlot(null);
    setSelectedBenchId(null);
  }, []);

  function clearSelection() {
    setSelectedSlot(null);
    setSelectedBenchId(null);
  }

  async function persistSlots(
    next: Array<{ playerId: number; slot: LineupPosition | null }>
  ) {
    setSaving(true);
    setError(null);
    try {
      const { error: clearAllError } = await supabase
        .from("championship_player_season_stats")
        .update({ lineup_slot: null })
        .eq("championship_id", championshipId)
        .not("lineup_slot", "is", null);

      if (clearAllError) {
        if (clearAllError.message.includes("lineup_slot")) {
          throw new Error("Выполните SQL: supabase/championship_lineup.sql");
        }
        throw new Error(clearAllError.message);
      }

      for (const row of next) {
        if (!row.slot) continue;
        const { error: assignError } = await supabase
          .from("championship_player_season_stats")
          .update({ lineup_slot: row.slot })
          .eq("championship_id", championshipId)
          .eq("player_id", row.playerId);
        if (assignError) throw new Error(assignError.message);
      }

      setSquad((prev) =>
        prev.map((player) => {
          const match = next.find((row) => row.playerId === player.id);
          return {
            ...player,
            lineup_slot: match ? match.slot : null,
          };
        })
      );
      clearSelection();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function assignBenchToSlot(
    benchPlayerId: number,
    slot: LineupPosition
  ) {
    const next = squad.map((player) => {
      if (player.id === benchPlayerId) {
        return { playerId: player.id, slot };
      }
      if (player.lineup_slot === slot) {
        return { playerId: player.id, slot: null };
      }
      return { playerId: player.id, slot: player.lineup_slot };
    });
    await persistSlots(next);
  }

  async function swapFieldSlots(slotA: LineupPosition, slotB: LineupPosition) {
    const playerA = getPlayerInSlot(squad, slotA);
    const playerB = getPlayerInSlot(squad, slotB);
    if (!playerA || !playerB) return;

    const next = squad.map((player) => {
      if (player.id === playerA.id) {
        return { playerId: player.id, slot: slotB };
      }
      if (player.id === playerB.id) {
        return { playerId: player.id, slot: slotA };
      }
      return { playerId: player.id, slot: player.lineup_slot };
    });
    await persistSlots(next);
  }

  async function handleFieldClick(slot: LineupPosition) {
    if (saving) return;

    const fieldPlayer = getPlayerInSlot(squad, slot);

    if (!canEdit) {
      if (fieldPlayer) openReactions(fieldPlayer.id);
      return;
    }

    if (selectedBenchId != null) {
      await assignBenchToSlot(selectedBenchId, slot);
      return;
    }

    if (selectedSlot === slot) {
      clearSelection();
      return;
    }

    if (selectedSlot) {
      const selectedPlayer = getPlayerInSlot(squad, selectedSlot);
      if (selectedPlayer && fieldPlayer) {
        await swapFieldSlots(selectedSlot, slot);
      } else if (selectedPlayer && !fieldPlayer) {
        const next = squad.map((player) => {
          if (player.id === selectedPlayer.id) {
            return { playerId: player.id, slot };
          }
          return { playerId: player.id, slot: player.lineup_slot };
        });
        await persistSlots(next);
      } else {
        setSelectedSlot(slot);
      }
      return;
    }

    setSelectedSlot(slot);
    setSelectedBenchId(null);
  }

  async function handleBenchClick(benchPlayerId: number) {
    if (saving) return;

    if (!canEdit) {
      openReactions(benchPlayerId);
      return;
    }

    if (selectedSlot) {
      await assignBenchToSlot(benchPlayerId, selectedSlot);
      return;
    }

    if (selectedBenchId === benchPlayerId) {
      clearSelection();
      return;
    }

    setSelectedBenchId(benchPlayerId);
    setSelectedSlot(null);
  }

  function handleReacted(toPlayerId: number, code: ReactionCode) {
    setMyReactions((prev) => {
      const previous = prev[toPlayerId];
      setReactionCounts((counts) => {
        const next = { ...counts };
        const bucket = { ...(next[toPlayerId] ?? {}) };
        if (previous && previous !== code) {
          const oldCount = (bucket[previous] ?? 1) - 1;
          if (oldCount <= 0) delete bucket[previous];
          else bucket[previous] = oldCount;
        }
        if (!previous || previous !== code) {
          bucket[code] = (bucket[code] ?? 0) + 1;
        }
        next[toPlayerId] = bucket;
        return next;
      });
      return { ...prev, [toPlayerId]: code };
    });
  }

  async function handleAutoLineup() {
    if (!canEdit || saving) return;
    const used = new Set<number>();
    const next: Array<{ playerId: number; slot: LineupPosition | null }> = [];

    for (const slotDef of fieldSlots) {
      const candidates = [...squad]
        .filter((player) => !used.has(player.id))
        .sort((a, b) => {
          const aMatch = shortPos(a.position) === slotDef.group ? 0 : 1;
          const bMatch = shortPos(b.position) === slotDef.group ? 0 : 1;
          if (aMatch !== bMatch) return aMatch - bMatch;
          return b.rating - a.rating;
        });
      const pick = candidates[0];
      if (!pick) continue;
      used.add(pick.id);
      next.push({ playerId: pick.id, slot: slotDef.position });
    }

    for (const player of squad) {
      if (!used.has(player.id)) {
        next.push({ playerId: player.id, slot: null });
      }
    }

    await persistSlots(next);
  }

  async function handleReset() {
    if (!canEdit || saving) return;
    if (!confirm("Сбросить состав на поле?")) return;
    await persistSlots(
      squad.map((player) => ({ playerId: player.id, slot: null }))
    );
  }

  if (schemaMissing) {
    return (
      <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-[12px] text-amber-100">
        Выполните SQL: supabase/championship_lineup.sql в Supabase
      </p>
    );
  }

  if (squad.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 px-3 py-6 text-center">
        <p className="text-[13px] font-bold text-white">Состав пуст</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Сначала набери до 13 игроков сезона
        </p>
        <Link
          href="/championship/players"
          className="mt-3 inline-flex rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-1.5 text-[12px] font-bold text-cyan-100"
        >
          К игрокам сезона
        </Link>
      </div>
    );
  }

  const statsGrid = (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
      <div className="grid grid-cols-4 divide-x divide-white/10">
        <MiniStat
          label="На поле"
          value={`${fieldPlayers.length}/${CHAMPIONSHIP_FIELD_SIZE}`}
        />
        <MiniStat
          label="★ состава"
          value={avg > 0 ? formatCreateOverall(Math.round(avg * 10) / 10) : "—"}
        />
        <MiniStat
          label="Запас"
          value={`${bench.length}/${CHAMPIONSHIP_BENCH_SIZE}`}
        />
        <MiniStat label="Пусто" value={emptySlots.length} />
      </div>
    </div>
  );

  const alertBlocks = (
    <>
      {reactionMatchId && reactionsOpen ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11px] text-slate-400">
          {canEdit
            ? "Удерживайте карточку или нажмите на счётчик"
            : "Нажмите на игрока, чтобы оценить"}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-200">
          {error}
        </p>
      ) : null}

      {emptySlots.length > 0 ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-100">
          <p className="font-semibold">
            Не хватает {emptySlots.length}:{" "}
            {emptySlots.map((slot) => LINEUP_SLOT_LABELS[slot]).join(" · ")}
          </p>
        </div>
      ) : null}

      {canEdit && (selectedSlot || selectedBenchId) ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-200">
          {selectedSlot
            ? "Выбери запасного или другую позицию на поле."
            : "Выбери позицию на поле."}{" "}
          <button
            type="button"
            onClick={clearSelection}
            className="font-medium underline hover:text-white"
          >
            Отмена
          </button>
        </div>
      ) : null}
    </>
  );

  const benchCompactPanel = (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
      <div className="flex items-center gap-2 border-b border-white/8 px-2 py-1.5">
        <span className="shrink-0 text-[11px] font-bold text-white">
          Запас · {bench.length}
        </span>
        <input
          type="search"
          value={benchSearch}
          onChange={(event) => setBenchSearch(event.target.value)}
          placeholder="Поиск..."
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
        />
        {canEdit ? (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleAutoLineup()}
              className="rounded-md border border-amber-400/35 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-100 disabled:opacity-45"
            >
              Авто
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleReset()}
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-slate-300 disabled:opacity-45"
            >
              Сброс
            </button>
          </div>
        ) : null}
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
          {bench.length === 0 ? "Нет запасных" : "Не найдено"}
        </p>
      ) : (
        <div className="scrollbar-thin grid max-h-[7.5rem] grid-cols-2 divide-x divide-y divide-white/8 overflow-y-auto">
          {filteredBench.map((player) => (
            <ChampionshipBenchRow
              key={player.id}
              player={player}
              isSelected={selectedBenchId === player.id}
              isSaving={saving}
              canEdit={canEdit}
              reactionCounts={reactionCounts[player.id]}
              onClick={() => void handleBenchClick(player.id)}
              onOpenReactions={() => openReactions(player.id)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const fieldPanel = (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-2 sm:p-3">
      <div
        className="pitch-surface lineup-pitch lineup-pitch--champ"
        data-champ-lineup-ui={CHAMPIONSHIP_LINEUP_UI_VERSION}
      >
        <div className="pointer-events-none absolute inset-2 rounded-lg border border-white/10 sm:inset-3" />
        <div className="pointer-events-none absolute top-1/2 left-3 right-3 h-px bg-white/12" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12 sm:h-20 sm:w-20" />
        <div className="pointer-events-none absolute top-3 left-1/2 h-12 w-28 -translate-x-1/2 border border-b-0 border-white/10" />
        <div className="pointer-events-none absolute bottom-3 left-1/2 h-12 w-28 -translate-x-1/2 border border-t-0 border-white/10" />

        <LineupFormationPicker
          formationId={formationId}
          onChange={setFormationId}
        />

        <div className="lineup-pitch__formation">
          {formation.rows.map((row) => (
            <div
              key={row.slots.join("-")}
              className={`lineup-pitch__row ${row.rowClass} lineup-pitch__row--n-${row.slots.length}`}
            >
              {row.slots.map((position) => {
                const player = getPlayerInSlot(squad, position);
                return (
                  <ChampionshipFieldPlayerCard
                    key={position}
                    player={player}
                    slot={position}
                    isSelected={selectedSlot === position}
                    isSaving={saving}
                    canEdit={canEdit}
                    reactionCounts={
                      player ? reactionCounts[player.id] : undefined
                    }
                    onClick={() => void handleFieldClick(position)}
                    onOpenReactions={
                      player ? () => openReactions(player.id) : undefined
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2">{statsGrid}</div>

      <div className="mt-2 grid grid-cols-4 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-black/20">
        {(["НАП", "ЦП", "ЗАЩ", "ВРТ"] as PositionGroup[]).map((group) => {
          const groupPlayers = fieldPlayers.filter((player) => {
            const slotGroup = player.lineup_slot
              ? preferredGroupForSlot(player.lineup_slot)
              : shortPos(player.position);
            return slotGroup === group;
          });
          const groupAvg =
            groupPlayers.length > 0
              ? groupPlayers.reduce((sum, player) => sum + player.rating, 0) /
                groupPlayers.length
              : null;
          const colors = {
            НАП: "text-red-400/90",
            ЦП: "text-blue-400/90",
            ЗАЩ: "text-amber-400/90",
            ВРТ: "text-violet-400/90",
          };

          return (
            <div key={group} className="px-1.5 py-1.5 text-center">
              <p
                className={`text-[8px] font-semibold uppercase tracking-wide ${colors[group]}`}
              >
                {group}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-200">
                {groupAvg != null
                  ? `★ ${formatCreateOverall(Math.round(groupAvg * 10) / 10)}`
                  : "—"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-end">
        <Link
          href="/championship/tactics"
          className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-100 hover:bg-cyan-500/15"
        >
          ⚽ Тактика
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {alertBlocks}
        {benchCompactPanel}
        {fieldPanel}
      </div>

      <PlayerReactionSheet
        open={sheetPlayerId != null}
        onClose={() => setSheetPlayerId(null)}
        player={
          sheetPlayer
            ? {
                id: sheetPlayer.id,
                name: sheetPlayer.name,
                position: sheetPlayer.position,
                rating: sheetPlayer.rating,
                photo_url: sheetPlayer.photo_url,
              }
            : null
        }
        matchId={reactionMatchId}
        reactionsOpen={reactionsOpen}
        myReaction={
          sheetPlayerId != null ? myReactions[sheetPlayerId] ?? null : null
        }
        canReact={
          viewerPlayerId != null &&
          sheetPlayerId != null &&
          viewerPlayerId !== sheetPlayerId
        }
        onReacted={handleReacted}
      />
    </>
  );
}
