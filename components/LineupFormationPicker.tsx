"use client";

import { useEffect, useRef, useState } from "react";
import {
  getLineupFormation,
  LINEUP_FORMATIONS,
  type LineupFormationId,
} from "@/lib/lineupFormations";

type LineupFormationPickerProps = {
  formationId: LineupFormationId;
  onChange: (id: LineupFormationId) => void;
  /** Corner inside the pitch overlay */
  corner?: "top-left" | "top-right";
};

export default function LineupFormationPicker({
  formationId,
  onChange,
  corner = "top-left",
}: LineupFormationPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = getLineupFormation(formationId);

  const positionClass =
    corner === "top-left"
      ? "left-1.5 top-1.5 sm:left-2.5 sm:top-2.5"
      : "right-1.5 top-1.5 sm:right-2.5 sm:top-2.5";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function pick(id: LineupFormationId) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`absolute z-40 ${positionClass}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-left shadow-md backdrop-blur-md transition ${
          open
            ? "border-cyan-400/40 bg-slate-950/95 ring-1 ring-cyan-400/20"
            : "border-white/20 bg-slate-950/80 hover:border-cyan-400/30 hover:bg-slate-950/90"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300/90 sm:text-[9px]">
          Схема
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-white sm:text-[11px]">
          {active.scheme}
        </span>
        <span className="text-[10px]" aria-hidden>
          {active.icon}
        </span>
        <span
          className={`ml-0.5 text-[8px] text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-cyan-400/25 bg-slate-950/96 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ring-1 ring-white/10 backdrop-blur-md"
        >
          <table className="w-full min-w-[10.5rem] border-collapse text-left sm:min-w-[11.5rem]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-slate-500 sm:text-[9px]">
                  Расстановка
                </th>
                <th className="px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-slate-500 sm:text-[9px]">
                  Стиль
                </th>
              </tr>
            </thead>
            <tbody>
              {LINEUP_FORMATIONS.map((formation) => {
                const isActive = formation.id === formationId;
                return (
                  <tr
                    key={formation.id}
                    className={`border-b border-white/8 last:border-b-0 ${
                      isActive ? "bg-cyan-500/15" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <td className="p-0">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => pick(formation.id)}
                        className={`w-full px-2 py-1.5 text-left text-[10px] font-semibold tabular-nums sm:text-[11px] ${
                          isActive ? "text-cyan-100" : "text-slate-200"
                        }`}
                      >
                        {formation.scheme}
                      </button>
                    </td>
                    <td className="p-0">
                      <button
                        type="button"
                        onClick={() => pick(formation.id)}
                        className={`flex w-full items-center gap-1 px-2 py-1.5 text-left text-[9px] font-medium sm:text-[10px] ${
                          isActive ? "text-cyan-100" : "text-slate-300"
                        }`}
                      >
                        <span aria-hidden>{formation.icon}</span>
                        <span className="truncate">{formation.style}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
