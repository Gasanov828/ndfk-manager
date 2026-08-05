"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PlayerReactionSheet from "@/components/PlayerReactionSheet";
import ReactionCountsRow from "@/components/ReactionCountsRow";
import {
  CHAMPIONSHIP_BENCH_SIZE,
  CHAMPIONSHIP_FIELD_SIZE,
  CHAMPIONSHIP_FIELD_SLOTS,
  getBenchPlayers,
  getFieldPlayers,
  getPlayerInSlot,
  LINEUP_SLOT_LABELS,
  type ChampionshipLineupPlayer,
  type LineupPosition,
} from "@/lib/championship/lineup";
import { formatCreateOverall } from "@/lib/playerCreateRating";
import {
  type MyReactionMap,
  type ReactionCode,
  type ReactionCountMap,
} from "@/lib/playerReactions";
import {
  getPositionGroup,
  getPositionStyle,
  type PositionGroup,
} from "@/lib/positionStyles";
import { supabase } from "@/lib/supabase";

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

const LONG_PRESS_MS = 420;

const SLOT_BADGE: Record<PositionGroup, string> = {
  НАП: "bg-red-500/90 text-white",
  ЦП: "bg-blue-500/90 text-white",
  ЗАЩ: "bg-amber-500/90 text-black",
  ВРТ: "bg-violet-500/90 text-white",
};

const BORDER_L: Record<PositionGroup, string> = {
  НАП: "border-l-red-400/70",
  ЦП: "border-l-blue-400/70",
  ЗАЩ: "border-l-amber-400/70",
  ВРТ: "border-l-violet-400/70",
};

function shortName(name: string): string {
  const part = name.trim().split(/\s+/)[0] ?? name;
  return part.length > 8 ? `${part.slice(0, 7)}…` : part;
}

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

function FieldSlotButton({
  position,
  className,
  group,
  player,
  isSelected,
  saving,
  canEdit,
  reactionCounts,
  onClick,
  onOpenReactions,
}: {
  position: LineupPosition;
  className: string;
  group: PositionGroup;
  player?: ChampionshipLineupPlayer;
  isSelected: boolean;
  saving: boolean;
  canEdit: boolean;
  reactionCounts?: Partial<Record<ReactionCode, number>>;
  onClick: () => void;
  onOpenReactions?: () => void;
}) {
  const style = getPositionStyle(group);
  const longPress = useLongPress(
    () => onOpenReactions?.(),
    Boolean(player && onOpenReactions && canEdit)
  );

  return (
    <button
      type="button"
      disabled={saving || (!canEdit && !player)}
      onClick={() => {
        if (longPress.didLongPress()) return;
        onClick();
      }}
      onPointerDown={longPress.onPointerDown}
      onPointerUp={longPress.onPointerUp}
      onPointerLeave={longPress.onPointerLeave}
      onPointerCancel={longPress.onPointerCancel}
      className={`absolute w-[3.6rem] transition-all duration-200 sm:w-[4.25rem] ${className} ${
        isSelected ? "z-20 scale-[1.04]" : "z-10"
      }`}
    >
      {player ? (
        <div
          className={`rounded-lg border px-1 py-1 text-center backdrop-blur-sm ${style.fieldCard} ${
            isSelected ? "ring-2 ring-cyan-400/50" : ""
          }`}
        >
          <div
            className={`mx-auto mb-0.5 flex h-4 w-4 items-center justify-center rounded text-[6px] font-bold ${style.fieldBadge}`}
          >
            {group}
          </div>
          <p className="text-[9px] font-semibold text-amber-200/90 sm:text-[10px]">
            ★ {Math.round(player.rating)}
          </p>
          <p className="mt-0.5 truncate text-[8px] font-semibold leading-tight text-slate-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] sm:text-[9px]">
            {shortName(player.name)}
          </p>
          <ReactionCountsRow counts={reactionCounts} onOpen={onOpenReactions} />
        </div>
      ) : (
        <div
          className={`rounded-lg border border-dashed px-1 py-1.5 text-center backdrop-blur-sm ${
            isSelected
              ? "border-cyan-400/40 bg-slate-900/80 ring-2 ring-cyan-400/40"
              : "border-slate-500/35 bg-slate-900/60"
          }`}
        >
          <p className="text-[8px] font-medium text-slate-400">
            {LINEUP_SLOT_LABELS[position]}
          </p>
          <p className="mt-0.5 text-[8px] text-slate-500">+</p>
        </div>
      )}
    </button>
  );
}

function BenchRow({
  player,
  selected,
  saving,
  canEdit,
  reactionCounts,
  onClick,
  onOpenReactions,
}: {
  player: ChampionshipLineupPlayer;
  selected: boolean;
  saving: boolean;
  canEdit: boolean;
  reactionCounts?: Partial<Record<ReactionCode, number>>;
  onClick: () => void;
  onOpenReactions: () => void;
}) {
  const group = shortPos(player.position);
  const longPress = useLongPress(onOpenReactions, canEdit);

  return (
    <button
      type="button"
      disabled={saving}
      onClick={() => {
        if (longPress.didLongPress()) return;
        onClick();
      }}
      onPointerDown={longPress.onPointerDown}
      onPointerUp={longPress.onPointerUp}
      onPointerLeave={longPress.onPointerLeave}
      onPointerCancel={longPress.onPointerCancel}
      className={`flex w-full items-center gap-1.5 border-l-[3px] px-1.5 py-1 text-left transition ${BORDER_L[group]} ${
        selected
          ? "bg-cyan-500/10 ring-1 ring-inset ring-cyan-400/45"
          : "bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-[10px] font-extrabold text-white">
            {shortName(player.name)}
          </span>
          <span
            className={`shrink-0 rounded px-1 py-px text-[7px] font-black leading-none ${SLOT_BADGE[group]}`}
          >
            {group}
          </span>
          <span className="w-6 shrink-0 text-right text-[10px] font-black tabular-nums text-amber-200">
            {Math.round(player.rating)}
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
  const [reactionCounts, setReactionCounts] =
    useState<ReactionCountMap>(initialReactionCounts);
  const [myReactions, setMyReactions] =
    useState<MyReactionMap>(initialMyReactions);
  const [sheetPlayerId, setSheetPlayerId] = useState<number | null>(null);

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

  const reserveByGroup = useMemo(() => {
    const counts: Record<PositionGroup, number> = {
      ВРТ: 0,
      ЗАЩ: 0,
      ЦП: 0,
      НАП: 0,
    };
    for (const player of bench) {
      counts[shortPos(player.position)] += 1;
    }
    return counts;
  }, [bench]);

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

    for (const slotDef of CHAMPIONSHIP_FIELD_SLOTS) {
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

  return (
    <section className="flex h-[calc(100dvh-7.25rem)] flex-col gap-1 sm:h-[calc(100dvh-6.25rem)]">
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5">
        <span className="shrink-0 text-[11px] font-black tabular-nums text-white">
          {fieldPlayers.length}/{CHAMPIONSHIP_FIELD_SIZE}
        </span>
        <span className="shrink-0 text-[10px] font-semibold text-slate-500">
          запас {bench.length}/{CHAMPIONSHIP_BENCH_SIZE}
        </span>
        <span className="ml-auto shrink-0 text-[12px] font-black tabular-nums text-amber-300">
          ★ {avg > 0 ? formatCreateOverall(Math.round(avg * 10) / 10) : "—"}
        </span>
        {canEdit ? (
          <button
            type="button"
            disabled={saving}
            onClick={handleAutoLineup}
            className="shrink-0 rounded-md border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-100 disabled:opacity-40"
          >
            Автосостав
          </button>
        ) : null}
      </div>

      {reactionMatchId && reactionsOpen ? (
        <p className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-400">
          {canEdit
            ? "Удерживайте карточку или нажмите на счётчик"
            : "Нажмите на игрока, чтобы оценить"}
        </p>
      ) : null}

      {error ? (
        <p className="shrink-0 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-200">
          {error}
        </p>
      ) : null}

      {canEdit && (selectedSlot || selectedBenchId) ? (
        <div className="shrink-0 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] text-cyan-200">
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

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <aside className="max-h-[30%] shrink-0 overflow-hidden">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Запас
            </p>
            <div className="flex gap-2 text-[8px] font-bold text-slate-500">
              {(
                [
                  ["ВРТ", reserveByGroup.ВРТ],
                  ["ЗАЩ", reserveByGroup.ЗАЩ],
                  ["ЦП", reserveByGroup.ЦП],
                  ["НАП", reserveByGroup.НАП],
                ] as const
              ).map(([label, count]) => (
                <span key={label}>
                  <span className={getPositionStyle(label).text}>{label}</span>{" "}
                  {count}
                </span>
              ))}
            </div>
          </div>
          <div className="max-h-[calc(100%-1.25rem)] space-y-0.5 overflow-y-auto pr-0.5">
            {bench.length === 0 ? (
              <p className="py-1 text-[9px] text-slate-600">пусто</p>
            ) : (
              bench.map((player) => (
                <BenchRow
                  key={player.id}
                  player={player}
                  selected={selectedBenchId === player.id}
                  saving={saving}
                  canEdit={canEdit}
                  reactionCounts={reactionCounts[player.id]}
                  onClick={() => void handleBenchClick(player.id)}
                  onOpenReactions={() => openReactions(player.id)}
                />
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-1.5">
            <div className="pitch-surface relative h-full w-full overflow-hidden rounded-xl border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
              <div className="pointer-events-none absolute inset-2 rounded-lg border border-white/10" />
              <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-px bg-white/12" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12" />
              <div className="pointer-events-none absolute left-1/2 top-2 h-10 w-24 -translate-x-1/2 border border-b-0 border-white/10" />
              <div className="pointer-events-none absolute bottom-2 left-1/2 h-10 w-24 -translate-x-1/2 border border-t-0 border-white/10" />

              {CHAMPIONSHIP_FIELD_SLOTS.map(({ position, className, group }) => {
                const player = getPlayerInSlot(squad, position);
                return (
                  <FieldSlotButton
                    key={position}
                    position={position}
                    className={className}
                    group={group}
                    player={player}
                    isSelected={selectedSlot === position}
                    saving={saving}
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
          </div>

          {canEdit ? (
            <div className="grid shrink-0 grid-cols-3 gap-1">
              <button
                type="button"
                disabled={saving}
                onClick={handleAutoLineup}
                className="rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[9px] font-bold text-slate-300 disabled:opacity-40"
              >
                Автосостав
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleAutoLineup}
                className="rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[9px] font-bold text-slate-300 disabled:opacity-40"
              >
                Балансировка
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleReset}
                className="rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[9px] font-bold text-slate-300 disabled:opacity-40"
              >
                Сброс
              </button>
            </div>
          ) : null}
        </div>
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
    </section>
  );
}
