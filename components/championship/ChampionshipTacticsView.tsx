"use client";

import {
  POSITION_TACTICS,
  TEAM_LOSS_INSTRUCTION,
  TEAM_ROLE_LINES,
  type TacticsInstructionGroup,
} from "@/lib/championship/tacticsContent";
import type { HomeChampionshipDashboardData } from "@/lib/championship/homeDashboard";
import {
  CHAMPIONSHIP_LINEUP_FORMATION_STORAGE_KEY,
  getLineupFormation,
} from "@/lib/lineupFormations";
import { useLineupFormation } from "@/hooks/useLineupFormation";
import { getPositionGroup, getPositionStyle, type PositionGroup } from "@/lib/positionStyles";
import { getFirstName } from "@/lib/playerStats";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";

type ChampionshipTacticsViewProps = {
  nextMatch: HomeChampionshipDashboardData["nextMatch"];
  playerName: string | null;
  positionGroup: PositionGroup | null;
  hasLineupAssignment: boolean;
  isInStartingLineup: boolean;
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
      <p className={`mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${accentClass}`}>
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

function PersonalInstructions({ group }: { group: PositionGroup }) {
  const tactics: TacticsInstructionGroup = POSITION_TACTICS[group];
  const style = getPositionStyle(group);

  return (
    <div className="mt-2 border-t border-white/8 pt-2">
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
  playerName,
  positionGroup,
  hasLineupAssignment,
  isInStartingLineup,
}: ChampionshipTacticsViewProps) {
  const { formationId } = useLineupFormation(
    CHAMPIONSHIP_LINEUP_FORMATION_STORAGE_KEY
  );
  const formation = getLineupFormation(formationId);

  return (
    <div className="space-y-2">
      <div className="tournament-panel rounded-xl px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">
          📋 Моя установка
        </p>

        {!nextMatch ? (
          <p className="mt-2 text-[12px] text-slate-400">
            Состав на матч ещё не назначен
          </p>
        ) : !hasLineupAssignment ? (
          <p className="mt-2 text-[12px] text-slate-400">
            Войдите как игрок, чтобы увидеть персональную установку
          </p>
        ) : !isInStartingLineup || !playerName || !positionGroup ? (
          <p className="mt-2 text-[12px] text-slate-400">
            Вы не в основном составе на ближайший матч
          </p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-xl font-black text-white sm:text-2xl">
                {getFirstName(playerName)}
              </p>
              <p
                className={`text-sm font-bold ${getPositionStyle(positionGroup).text}`}
              >
                — {positionGroup}
              </p>
            </div>
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
            <PersonalInstructions group={positionGroup} />
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
                    <span className="font-bold text-slate-200">{role.label}</span>
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
