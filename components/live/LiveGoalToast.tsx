"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type LiveGoalToastProps = {
  open: boolean;
  playerName: string;
  onDone: () => void;
};

export default function LiveGoalToast({
  open,
  playerName,
  onDone,
}: LiveGoalToastProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onDone, 1600);
    return () => window.clearTimeout(timer);
  }, [open, onDone]);

  if (!open || !ready) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[240] flex items-center justify-center px-4">
      <div className="live-goal-toast rounded-[24px] border border-amber-300/40 bg-gradient-to-br from-amber-500/25 via-[#121a2e] to-[#0b1224] px-8 py-6 text-center shadow-[0_0_60px_rgba(251,191,36,0.35)] backdrop-blur-xl">
        <p className="text-3xl font-black tracking-wide text-amber-100">⚽ ГОЛ!</p>
        <p className="mt-1 text-lg font-extrabold text-white">{playerName}</p>
      </div>
    </div>,
    document.body
  );
}
