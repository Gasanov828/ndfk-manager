"use client";

import { memo } from "react";
import {
  LINEUP_SLOT_LABELS,
  type LineupPosition,
  type Player,
  getPlayerByLineupSlot,
} from "@/lib/lineup";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import { formatOverallRating } from "@/lib/matchRatings";

const FIELD_SLOTS: { position: LineupPosition; className: string }[] = [
  { position: "НАП1", className: "top-[8%] left-[23%] -translate-x-1/2" },
  { position: "НАП2", className: "top-[8%] left-[77%] -translate-x-1/2" },
  { position: "ЦП1", className: "top-[33%] left-[20%] -translate-x-1/2" },
  { position: "ЦП2", className: "top-[33%] left-[80%] -translate-x-1/2" },
  { position: "ЗАЩ1", className: "top-[57%] left-[11%] -translate-x-1/2" },
  { position: "ЗАЩ2", className: "top-[57%] left-1/2 -translate-x-1/2" },
  { position: "ЗАЩ3", className: "top-[57%] left-[89%] -translate-x-1/2" },
  { position: "ВРТ", className: "top-[81%] left-1/2 -translate-x-1/2" },
];

type LivePitchProps = {
  players: Player[];
  matchGoals: Record<number, number>;
  matchAssists: Record<number, number>;
  matchSaves: Record<number, number>;
  highlightMode: "none" | "assist" | "save";
  disabledPlayerId?: number | null;
  onSelectPlayer: (player: Player) => void;
};

function LivePitch({
  players,
  matchGoals,
  matchAssists,
  matchSaves,
  highlightMode,
  disabledPlayerId,
  onSelectPlayer,
}: LivePitchProps) {
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-[22px] border border-emerald-400/20 bg-gradient-to-b from-emerald-950/40 via-slate-950/80 to-slate-950 shadow-[0_0_40px_rgba(16,185,129,0.12)]">
      <div className="pitch-surface absolute inset-0">
        <div className="pointer-events-none absolute inset-x-[12%] top-[4%] bottom-[4%] rounded-[18px] border border-white/10" />
        <div className="pointer-events-none absolute left-1/2 top-[4%] h-[14%] w-[36%] -translate-x-1/2 rounded-b-xl border border-white/10 border-t-0" />
        <div className="pointer-events-none absolute left-1/2 bottom-[4%] h-[14%] w-[36%] -translate-x-1/2 rounded-t-xl border border-white/10 border-b-0" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute inset-x-[12%] top-1/2 border-t border-white/10" />
      </div>

      {highlightMode === "assist" ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-30 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-3 py-2 text-center text-[11px] font-bold text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.25)] backdrop-blur-md">
          Выберите игрока, который сделал ассист
        </div>
      ) : null}
      {highlightMode === "save" ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-30 rounded-xl border border-orange-400/35 bg-orange-500/15 px-3 py-2 text-center text-[11px] font-bold text-orange-50 shadow-[0_0_20px_rgba(251,146,60,0.25)] backdrop-blur-md">
          Нажмите на вратаря, чтобы добавить сейв
        </div>
      ) : null}

      {FIELD_SLOTS.map((slot) => {
        const player = getPlayerByLineupSlot(players, slot.position);
        const group = player
          ? getPositionGroup(player.lineup_position, player.position)
          : getPositionGroup(slot.position, slot.position.slice(0, 3));
        const style = getPositionStyle(group);
        const disabled = Boolean(
          player && disabledPlayerId != null && player.id === disabledPlayerId
        );
        const goals = player ? matchGoals[player.id] ?? 0 : 0;
        const assists = player ? matchAssists[player.id] ?? 0 : 0;
        const saves = player ? matchSaves[player.id] ?? 0 : 0;
        const isGk = group === "ВРТ";
        const saveHighlight = highlightMode === "save" && isGk && player && !disabled;

        return (
          <button
            key={slot.position}
            type="button"
            disabled={!player || disabled || (highlightMode === "save" && !isGk)}
            onClick={() => player && onSelectPlayer(player)}
            className={`absolute ${slot.className} z-10 w-[64px] max-w-[21vw] transition duration-200 active:scale-95 sm:w-[78px] ${
              (highlightMode === "assist" && player && !disabled) || saveHighlight
                ? "animate-pulse"
                : ""
            } ${disabled || (highlightMode === "save" && !isGk) ? "opacity-40" : "hover:scale-[1.04]"}`}
          >
            {player ? (
              <div
                className={`rounded-xl border px-1 py-1.5 text-center backdrop-blur-md ${style.fieldCard} ${
                  highlightMode === "assist" && !disabled
                    ? "ring-2 ring-cyan-300/60 shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                    : saveHighlight
                      ? "ring-2 ring-orange-300/60 shadow-[0_0_18px_rgba(251,146,60,0.35)]"
                      : "shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                }`}
              >
                <div
                  className={`mx-auto mb-0.5 flex h-4 w-4 items-center justify-center rounded text-[6px] font-bold sm:h-5 sm:w-5 sm:text-[7px] ${style.fieldBadge}`}
                >
                  {group}
                </div>
                <p className="text-[9px] font-semibold text-amber-200/90 sm:text-[10px]">
                  ★ {formatOverallRating(player.rating)}
                </p>
                <p className="mt-0.5 truncate text-[8px] font-bold leading-tight text-white sm:text-[9px]">
                  {player.name}
                </p>
                {(goals > 0 || assists > 0 || saves > 0) && (
                  <p className="mt-0.5 flex justify-center gap-1 text-[7px] text-slate-200">
                    {goals > 0 ? <span>⚽{goals}</span> : null}
                    {assists > 0 ? <span>🎯{assists}</span> : null}
                    {saves > 0 ? <span>🧤{saves}</span> : null}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/15 bg-black/30 px-1 py-2 text-center text-[8px] text-slate-500">
                {LINEUP_SLOT_LABELS[slot.position]}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default memo(LivePitch);
