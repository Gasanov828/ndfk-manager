"use client";

import LiveBottomSheet from "@/components/live/LiveBottomSheet";

type LiveAssistPromptProps = {
  open: boolean;
  scorerName: string;
  onYes: () => void;
  onNo: () => void;
};

export default function LiveAssistPrompt({
  open,
  scorerName,
  onYes,
  onNo,
}: LiveAssistPromptProps) {
  return (
    <LiveBottomSheet open={open} onClose={onNo} zClassName="z-[310]">
      <div className="overflow-hidden rounded-[22px] border border-amber-300/25 bg-gradient-to-br from-[#151d32] via-[#0b1224] to-[#080d18] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/25 sm:hidden" aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/80">
          Гол! · {scorerName}
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-white">
          Добавить ассист?
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onYes}
            className="rounded-2xl border border-emerald-400/35 bg-emerald-500/20 py-3 text-[13px] font-bold text-emerald-50"
          >
            ✅ Да
          </button>
          <button
            type="button"
            onClick={onNo}
            className="rounded-2xl border border-white/15 bg-white/[0.05] py-3 text-[13px] font-bold text-slate-200"
          >
            ❌ Нет
          </button>
        </div>
      </div>
    </LiveBottomSheet>
  );
}
