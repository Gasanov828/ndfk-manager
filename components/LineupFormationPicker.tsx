"use client";

import {
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
  const positionClass =
    corner === "top-left"
      ? "left-1.5 top-1.5 sm:left-2.5 sm:top-2.5"
      : "right-1.5 top-1.5 sm:right-2.5 sm:top-2.5";

  return (
    <div
      className={`absolute z-40 ${positionClass}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="overflow-hidden rounded-lg border border-cyan-400/25 bg-slate-950/92 shadow-[0_4px_20px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-md">
        <p className="border-b border-white/10 bg-cyan-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-cyan-200 sm:text-[9px]">
          Схема
        </p>
        <table className="w-full min-w-[10rem] border-collapse text-left sm:min-w-[11rem]">
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
              const active = formation.id === formationId;
              return (
                <tr
                  key={formation.id}
                  className={`border-b border-white/8 last:border-b-0 ${
                    active ? "bg-cyan-500/15" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <td className="p-0">
                    <button
                      type="button"
                      onClick={() => onChange(formation.id)}
                      className={`w-full px-2 py-1.5 text-left text-[10px] font-semibold tabular-nums sm:text-[11px] ${
                        active ? "text-cyan-100" : "text-slate-200"
                      }`}
                    >
                      {formation.scheme}
                    </button>
                  </td>
                  <td className="p-0">
                    <button
                      type="button"
                      onClick={() => onChange(formation.id)}
                      className={`flex w-full items-center gap-1 px-2 py-1.5 text-left text-[9px] font-medium sm:text-[10px] ${
                        active ? "text-cyan-100" : "text-slate-300"
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
    </div>
  );
}
