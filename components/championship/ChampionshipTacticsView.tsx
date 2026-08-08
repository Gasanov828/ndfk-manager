"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSlotTactics,
  TEAM_LOSS_INSTRUCTION,
  TEAM_ROLE_LINES,
  type SlotTactics,
} from "@/lib/championship/tacticsContent";
import type { ChampionshipLineupPlayer } from "@/lib/championship/lineup";
import type { HomeChampionshipDashboardData } from "@/lib/championship/homeDashboard";
import {
  CHAMPIONSHIP_LINEUP_FORMATION_STORAGE_KEY,
  getLineupFormation,
} from "@/lib/lineupFormations";
import { useLineupFormation } from "@/hooks/useLineupFormation";
import { LINEUP_SLOT_LABELS, type LineupPosition } from "@/lib/lineup";
import {
  getPositionGroup,
  getPositionStyle,
  type PositionGroup,
} from "@/lib/positionStyles";
import { getFirstName } from "@/lib/playerStats";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";

type ChampionshipTacticsViewProps = {
  nextMatch: HomeChampionshipDashboardData["nextMatch"];
  fieldPlayers: ChampionshipLineupPlayer[];
  viewerPlayerId: number | null;
};

function InstructionSection({
  icon,
  title,
  items,
  accentClass,
}: {
  icon: string;
  title: string;
  items: string[];
  accentClass: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-2">
      <p
        className={`mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${accentClass}`}
      >
        <span aria-hidden>{icon}</span>
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-1.5 text-[11px] leading-snug text-slate-300"
          >
            <span className="mt-[0.35rem] h-1 w-1 shrink-0 rounded-full bg-slate-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PersonalInstructions({ slot }: { slot: LineupPosition }) {
  const tactics: SlotTactics = getSlotTactics(slot);
  const group = getPositionGroup(slot, slot);
  const style = getPositionStyle(group);

  return (
    <div className="mt-2 border-t border-white/8 pt-2">
      <InstructionSection
        icon="📍"
        title="Позиционирование"
        items={tactics.positioning}
        accentClass="text-violet-300/90"
      />
      <InstructionSection
        icon="⚔️"
        title="Атака"
        items={tactics.attack}
        accentClass="text-red-300/90"
      />
      <InstructionSection
        icon="🛡️"
        title="Оборона"
        items={tactics.defense}
        accentClass="text-amber-300/90"
      />
      <InstructionSection
        icon="⚡"
        title="При потере"
        items={tactics.onLoss}
        accentClass={style.text}
      />
    </div>
  );
}

export default function ChampionshipTacticsView({
  nextMatch,
  fieldPlayers,
  viewerPlayerId,
}: ChampionshipTacticsViewProps) {
  const { formationId } = useLineupFormation(
    CHAMPIONSHIP_LINEUP_FORMATION_STORAGE_KEY
  );
  const formation = getLineupFormation(formationId);

  const defaultPlayerId = useMemo(() => {
    if (
      viewerPlayerId != null &&
      fieldPlayers.some((player) => player.id === viewerPlayerId)
    ) {
      return viewerPlayerId;
    }
    return fieldPlayers[0]?.id ?? null;
  }, [fieldPlayers, viewerPlayerId]);

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    defaultPlayerId
  );

  useEffect(() => {
    setSelectedPlayerId(defaultPlayerId);
  }, [defaultPlayerId]);

  const selectedPlayer =
    fieldPlayers.find((player) => player.id === selectedPlayerId) ??
    fieldPlayers[0] ??
    null;

  const selectedGroup =
    selectedPlayer?.lineup_slot != null
      ? getPositionGroup(selectedPlayer.lineup_slot, selectedPlayer.position)
      : null;

  const selectedSlot = selectedPlayer?.lineup_slot as LineupPosition | null;
  const selectedRole =
    selectedSlot != null ? getSlotTactics(selectedSlot).roleTitle : null;

  const isViewerSelected =
    viewerPlayerId != null && selectedPlayer?.id === viewerPlayerId;

  return (
    <div className="space-y-2">
      <div className="tournament-panel rounded-xl px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">
              📋 {isViewerSelected ? "Моя установка" : "Установка игрока"}
            </p>
            <p className="mt-0.5 text-[9px] text-slate-500">
              Можно посмотреть задачи всех в основе
            </p>
          </div>
        </div>

        {!nextMatch ? (
          <p className="mt-2 text-[12px] text-slate-400">
            Состав на матч ещё не назначен
          </p>
        ) : fieldPlayers.length === 0 ? (
          <p className="mt-2 text-[12px] text-slate-400">
            Основной состав на поле ещё не заполнен
          </p>
        ) : (
          <>
            <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
              {fieldPlayers.map((player) => {
                const slot = player.lineup_slot as LineupPosition | null;
                const group = slot
                  ? getPositionGroup(slot, player.position)
                  : "ЦП";
                const style = getPositionStyle(group);
                const roleShort = slot ? getSlotTactics(slot).roleShort : group;
                const active = player.id === selectedPlayer?.id;
                const isMe = viewerPlayerId === player.id;

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={`shrink-0 rounded-lg border px-2 py-1 text-left transition ${
                      active
                        ? "border-cyan-400/40 bg-cyan-500/15 ring-1 ring-cyan-400/25"
                        : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <p className="truncate text-[10px] font-bold text-white">
                      {getFirstName(player.name)}
                      {isMe ? (
                        <span className="ml-1 text-[8px] font-semibold text-cyan-300">
                          вы
                        </span>
                      ) : null}
                    </p>
                    <p className={`text-[9px] font-semibold ${style.text}`}>
                      {roleShort}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedPlayer && selectedGroup && selectedSlot && selectedRole ? (
              <>
                <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-xl font-black text-white sm:text-2xl">
                    {getFirstName(selectedPlayer.name)}
                  </p>
                  <p
                    className={`text-sm font-bold ${getPositionStyle(selectedGroup).text}`}
                  >
                    — {selectedRole}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500">
                  {LINEUP_SLOT_LABELS[selectedSlot]} · {selectedGroup}
                </p>
                {nextMatch ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    vs {nextMatch.opponent}
                    {nextMatch.date
                      ? ` · ${formatMatchDate(nextMatch.date)}${
                          nextMatch.time
                            ? ` · ${formatMatchTime(nextMatch.time)}`
                            : ""
                        }`
                      : ""}
                  </p>
                ) : null}
                <PersonalInstructions slot={selectedSlot} />
              </>
            ) : null}
          </>
        )}
      </div>

      <div className="tournament-panel rounded-xl px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-200/90">
          🧩 План команды
        </p>

        {!nextMatch ? (
          <p className="mt-2 text-[12px] text-slate-400">
            Состав на матч ещё не назначен
          </p>
        ) : (
          <>
            <p className="mt-2 text-lg font-black tabular-nums text-amber-100">
              {formation.scheme}
            </p>
            <p className="text-[10px] text-slate-500">
              {formation.icon} {formation.style}
            </p>

            <ul className="mt-2 space-y-1.5">
              {TEAM_ROLE_LINES.map((role) => (
                <li
                  key={role.label}
                  className="flex gap-2 text-[11px] leading-snug text-slate-300"
                >
                  <span className="shrink-0" aria-hidden>
                    {role.icon}
                  </span>
                  <span>
                    <span className="font-bold text-slate-200">
                      {role.label}
                    </span>
                    {" — "}
                    {role.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-2.5 rounded-lg border border-amber-400/20 bg-amber-500/8 px-2.5 py-2">
              <p className="text-[10px] font-bold text-amber-200/95">
                ⚠️ При потере мяча:
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                {TEAM_LOSS_INSTRUCTION}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
