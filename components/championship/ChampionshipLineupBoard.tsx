"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PlayerReactionSheet from "@/components/PlayerReactionSheet";
import LineupFormationPicker from "@/components/LineupFormationPicker";
import LineupFieldCard from "@/components/lineup/LineupFieldCard";
import ChampionshipBenchCard from "@/components/championship/ChampionshipBenchCard";
import ChampionshipPitchSurface from "@/components/championship/ChampionshipPitchSurface";
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
import {
  getPositionGroup,
  getPositionStyle,
  type PositionGroup,
} from "@/lib/positionStyles";
import { supabase } from "@/lib/supabase";

/** Меняется при правках UI — проверка деплоя на странице состава чемпионата */
export const CHAMPIONSHIP_LINEUP_UI_VERSION = "2026-08-09-v1";

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
  group: PositionGroup;
  player?: ChampionshipLineupPlayer;
  isSelected: boolean;
  saving: boolean;
  canEdit: boolean;
  reactionCounts?: Partial<Record<ReactionCode, number>>;
  onClick: () => void;
  onOpenReactions?: () => void;
}) {
  const longPress = useLongPress(
    () => onOpenReactions?.(),
    Boolean(player && onOpenReactions && canEdit)
  );

  return (
    <LineupFieldCard
      slot={position}
      group={group}
      player={
        player
          ? {
              name: player.name,
              photo_url: player.photo_url,
              rating: player.rating,
            }
          : undefined
      }
      isSelected={isSelected}
      disabled={saving || (!canEdit && !player)}
      emptyLabel="+"
      reactionCounts={reactionCounts}
      onClick={() => {
        if (longPress.didLongPress()) return;
        onClick();
      }}
      onPointerDown={longPress.onPointerDown}
      onPointerUp={longPress.onPointerUp}
      onPointerLeave={longPress.onPointerLeave}
      onPointerCancel={longPress.onPointerCancel}
      onOpenReactions={onOpenReactions}
    />
  );
}

function BenchSlotButton({
  player,
  selected,
  saving,
  canEdit,
  onClick,
  onOpenReactions,
}: {
  player: ChampionshipLineupPlayer;
  selected: boolean;
  saving: boolean;
  canEdit: boolean;
  onClick: () => void;
  onOpenReactions: () => void;
}) {
  const longPress = useLongPress(onOpenReactions, canEdit);

  return (
    <ChampionshipBenchCard
      name={player.name}
      position={player.position}
      rating={player.rating}
      photoUrl={player.photo_url}
      selected={selected}
      disabled={saving}
      onClick={() => {
        if (longPress.didLongPress()) return;
        onClick();
      }}
      onPointerDown={longPress.onPointerDown}
      onPointerUp={longPress.onPointerUp}
      onPointerLeave={longPress.onPointerLeave}
      onPointerCancel={longPress.onPointerCancel}
    />
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

  const fieldByGroup = useMemo(() => {
    const counts: Record<PositionGroup, number> = {
      ВРТ: 0,
      ЗАЩ: 0,
      ЦП: 0,
      НАП: 0,
    };
    for (const player of fieldPlayers) {
      const group = player.lineup_slot
        ? preferredGroupForSlot(player.lineup_slot)
        : shortPos(player.position);
      counts[group] += 1;
    }
    return counts;
  }, [fieldPlayers]);


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

  return (
    <section className="champ-lineup-page flex h-[calc(100dvh-7.25rem)] flex-col gap-1 sm:h-[calc(100dvh-6.25rem)]">
      <div className="champ-lineup-stats shrink-0">
        <span className="champ-lineup-stats__rating">
          ★ {avg > 0 ? formatCreateOverall(Math.round(avg * 10) / 10) : "—"}
        </span>
        {canEdit ? (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={handleAutoLineup}
              className="champ-lineup-stats__auto"
            >
              Автосостав
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleReset}
              className="champ-lineup-stats__reset"
            >
              Сброс
            </button>
          </>
        ) : null}
        <span className="champ-lineup-stats__count">
          {fieldPlayers.length}/{CHAMPIONSHIP_FIELD_SIZE}
        </span>
        <span className="champ-lineup-stats__bench">
          Запас {bench.length}/{CHAMPIONSHIP_BENCH_SIZE}
        </span>
        <span className="champ-lineup-stats__groups">
          {(
            [
              ["ВРТ", fieldByGroup.ВРТ],
              ["ЗАЩ", fieldByGroup.ЗАЩ],
              ["ЦП", fieldByGroup.ЦП],
              ["НАП", fieldByGroup.НАП],
            ] as const
          ).map(([label, count], index) => (
            <span key={label}>
              {index > 0 ? " · " : null}
              <span className={getPositionStyle(label).text}>{label}</span> {count}
            </span>
          ))}
        </span>
        <span
          className="champ-lineup-stats__build"
          title="Версия интерфейса состава чемпионата"
        >
          UI {CHAMPIONSHIP_LINEUP_UI_VERSION}
        </span>
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

      <div className="champ-lineup flex min-h-0 flex-1 flex-col gap-1">
        <section className="champ-lineup__bench shrink-0">
          <p className="champ-lineup__bench-title">Запасные</p>
          <div className="champ-bench-grid scrollbar-thin">
            {bench.length === 0 ? (
              <p className="champ-bench-grid__empty">пусто</p>
            ) : (
              bench.map((player) => (
                <BenchSlotButton
                  key={player.id}
                  player={player}
                  selected={selectedBenchId === player.id}
                  saving={saving}
                  canEdit={canEdit}
                  onClick={() => void handleBenchClick(player.id)}
                  onOpenReactions={() => openReactions(player.id)}
                />
              ))
            )}
          </div>
        </section>

        <div className="champ-lineup__pitch-panel min-h-0 min-w-0 flex-1">
          <div className="champ-lineup__pitch-frame">
            <ChampionshipPitchSurface
              formationPicker={
                <LineupFormationPicker
                  formationId={formationId}
                  onChange={setFormationId}
                  schemeLabel="СХЕМА"
                />
              }
            >
              {formation.rows.map((row) => (
                <div
                  key={row.slots.join("-")}
                  className={`lineup-pitch__row ${row.rowClass} lineup-pitch__row--n-${row.slots.length}`}
                >
                  {row.slots.map((position) => {
                    const player = getPlayerInSlot(squad, position);
                    return (
                      <FieldSlotButton
                        key={position}
                        position={position}
                        group={preferredGroupForSlot(position)}
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
              ))}
            </ChampionshipPitchSurface>
          </div>
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
