"use client";

import type { Player } from "@/lib/lineup";
import LiveBottomSheet from "@/components/live/LiveBottomSheet";

type LivePlayerSheetProps = {
  player: Player | null;
  busy?: boolean;
  onGoal: () => void;
  onAssist: () => void;
  onSub: () => void;
  onClose: () => void;
};

export default function LivePlayerSheet({
  player,
  busy,
  onGoal,
  onAssist,
  onSub,
  onClose,
}: LivePlayerSheetProps) {
  return (
    <LiveBottomSheet open={Boolean(player)} onClose={onClose}>
      {player ? (
        <div className="overflow-hidden rounded-[22px] border border-white/15 bg-gradient-to-br from-[#141c31] via-[#0b1224] to-[#080d18] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/25 sm:hidden" aria-hidden />
          <p className="text-center text-[15px] font-extrabold text-white">
            ⚽ {player.name}
          </p>
          <p className="mt-0.5 text-center text-[11px] text-slate-400">
            {player.position || "Без позиции"}
          </p>
          <div className="mt-3 h-px bg-white/10" />

          <div className="mt-3 space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={onGoal}
              className="flex w-full items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3.5 text-left text-[14px] font-bold text-emerald-50 transition hover:bg-emerald-500/25 disabled:opacity-50"
            >
              <span className="text-xl">⚽</span>
              Добавить гол
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onAssist}
              className="flex w-full items-center gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-3.5 text-left text-[14px] font-bold text-cyan-50 transition hover:bg-cyan-500/25 disabled:opacity-50"
            >
              <span className="text-xl">🎯</span>
              Добавить ассист
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSub}
              className="flex w-full items-center gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/15 px-4 py-3.5 text-left text-[14px] font-bold text-violet-50 transition hover:bg-violet-500/25 disabled:opacity-50"
            >
              <span className="text-xl">🔄</span>
              Замена
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-[13px] font-semibold text-slate-300 transition hover:bg-white/[0.08]"
            >
              <span className="text-lg">❌</span>
              Закрыть
            </button>
          </div>
        </div>
      ) : null}
    </LiveBottomSheet>
  );
}
