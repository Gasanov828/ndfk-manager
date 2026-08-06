"use client";

import type { Player } from "@/lib/lineup";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import LiveBottomSheet from "@/components/live/LiveBottomSheet";

type LiveSubSheetProps = {
  playerOut: Player | null;
  bench: Player[];
  busy?: boolean;
  onPick: (playerIn: Player) => void;
  onClose: () => void;
};

export default function LiveSubSheet({
  playerOut,
  bench,
  busy,
  onPick,
  onClose,
}: LiveSubSheetProps) {
  return (
    <LiveBottomSheet open={Boolean(playerOut)} onClose={onClose}>
      {playerOut ? (
        <div className="flex max-h-[min(72dvh,560px)] flex-col overflow-hidden rounded-[22px] border border-violet-400/25 bg-gradient-to-br from-[#141c31] via-[#0b1224] to-[#080d18] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/25 sm:hidden" aria-hidden />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200/80">
              Замена
            </p>
            <h3 className="mt-0.5 text-[15px] font-extrabold text-white">
              Вместо {playerOut.name}
            </h3>
            <p className="text-[11px] text-slate-400">Выберите запасного</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {bench.length === 0 ? (
              <p className="px-2 py-6 text-center text-[12px] text-slate-500">
                Нет запасных
              </p>
            ) : (
              <div className="space-y-1.5">
                {bench.map((player) => {
                  const group = getPositionGroup(
                    player.lineup_position,
                    player.position
                  );
                  const style = getPositionStyle(group);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      disabled={busy}
                      onClick={() => onPick(player)}
                      className="flex w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-violet-400/35 hover:bg-violet-500/10 disabled:opacity-50"
                    >
                      <span
                        className={`flex h-7 w-8 items-center justify-center rounded-md text-[9px] font-bold text-white ${style.badge}`}
                      >
                        {group}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-white">
                          {player.name}
                        </span>
                        <span className="block truncate text-[10px] text-slate-400">
                          {player.position || "Без позиции"} · ★ {player.rating}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-white/10 py-2.5 text-[13px] font-semibold text-slate-300"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}
    </LiveBottomSheet>
  );
}
