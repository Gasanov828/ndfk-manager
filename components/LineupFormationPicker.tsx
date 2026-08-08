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
  corner = "top-right",
}: LineupFormationPickerProps) {
  const positionClass =
    corner === "top-left"
      ? "left-2 top-2 sm:left-3 sm:top-3"
      : "right-2 top-2 sm:right-3 sm:top-3";

  return (
    <div
      className={`absolute z-30 ${positionClass}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="overflow-hidden rounded-lg border border-white/15 bg-slate-950/88 shadow-lg backdrop-blur-md">
        <table className="w-full min-w-[9.5rem] border-collapse text-left sm:min-w-[10.5rem]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[8px]">
                Схема
              </th>
              <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[8px]">
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
                      className={`w-full px-2 py-1 text-left text-[9px] font-semibold tabular-nums sm:text-[10px] ${
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
                      className={`flex w-full items-center gap-1 px-2 py-1 text-left text-[8px] font-medium sm:text-[9px] ${
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
