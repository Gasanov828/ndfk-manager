import type { ChampionshipStandingRow } from "@/lib/championship/types";

const MEDALS = ["🥇", "🥈", "🥉"];

function MovementBadge({ change }: { change?: number }) {
  if (!change) return null;
  const up = change > 0;
  return (
    <span
      className={`ml-1 text-[9px] font-black leading-none ${
        up ? "text-emerald-300" : "text-rose-300"
      }`}
      title={up ? `Поднялись на ${change}` : `Опустились на ${Math.abs(change)}`}
    >
      {up ? "↗" : "↘"}
    </span>
  );
}

export default function ChampionshipTable({
  rows,
  compact = false,
  showMovement = true,
}: {
  rows: ChampionshipStandingRow[];
  compact?: boolean;
  showMovement?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-500">
        Команды сезона ещё не загружены
      </p>
    );
  }

  const textSize = compact ? "text-[10px]" : "text-[11px]";
  const headSize = compact ? "text-[7px]" : "text-[8px]";
  const cellPad = compact ? "px-0.5 py-1" : "px-1 py-1.5";

  return (
    <div className="tournament-panel overflow-hidden rounded-[16px]">
      <div className="overflow-x-auto">
        <table className={`w-full min-w-[280px] table-fixed border-collapse text-left ${textSize}`}>
          <thead>
            <tr className={`border-b border-white/8 uppercase tracking-wider text-amber-200/45 ${headSize}`}>
              <th className={`w-7 ${cellPad} font-bold`}>№</th>
              <th className={`${cellPad} font-bold`}>Команда</th>
              <th className={`w-6 ${cellPad} text-center font-bold`} title="Игры">
                И
              </th>
              <th className={`w-7 ${cellPad} text-center font-bold`} title="Очки">
                О
              </th>
              <th className={`w-6 ${cellPad} text-center font-bold`} title="Победы">
                В
              </th>
              <th className={`w-6 ${cellPad} text-center font-bold`} title="Ничьи">
                Н
              </th>
              <th className={`w-6 ${cellPad} text-center font-bold`} title="Поражения">
                П
              </th>
              {!compact ? (
                <>
                  <th className={`w-7 ${cellPad} text-center font-bold`} title="Забито">
                    З
                  </th>
                  <th className={`w-7 ${cellPad} text-center font-bold`} title="Пропущено">
                    П
                  </th>
                  <th className={`w-8 ${cellPad} text-center font-bold`} title="Разница мячей">
                    РМ
                  </th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const place = index + 1;
              const medal = MEDALS[index];
              const goalDiffLabel =
                row.goalDiff > 0 ? `+${row.goalDiff}` : String(row.goalDiff);

              return (
                <tr
                  key={row.teamId}
                  className={`border-b border-white/[0.04] ${
                    row.isHomeClub ? "bg-amber-500/[0.12]" : ""
                  }`}
                >
                  <td className={`${cellPad} font-bold tabular-nums text-slate-400`}>
                    <span className="inline-flex items-center">
                      {medal ? <span className="text-[11px]">{medal}</span> : place}
                      {showMovement ? (
                        <MovementBadge change={row.positionChange} />
                      ) : null}
                    </span>
                  </td>
                  <td className={`min-w-0 ${cellPad}`}>
                    <div className="flex min-w-0 items-center gap-1">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: row.primaryColor }}
                      />
                      <span
                        className={`min-w-0 truncate font-extrabold ${
                          row.isHomeClub ? "text-amber-100" : "text-white"
                        }`}
                      >
                        {row.teamName}
                      </span>
                      {row.isHomeClub ? (
                        <span className="shrink-0 rounded px-1 py-px text-[7px] font-bold uppercase leading-none text-amber-200/90 ring-1 ring-amber-400/35">
                          Мы
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className={`${cellPad} text-center tabular-nums text-slate-300/90`}>
                    {row.played}
                  </td>
                  <td className={`${cellPad} text-center font-black tabular-nums text-amber-200`}>
                    {row.points}
                  </td>
                  <td className={`${cellPad} text-center tabular-nums text-emerald-300/90`}>
                    {row.won}
                  </td>
                  <td className={`${cellPad} text-center tabular-nums text-slate-300/90`}>
                    {row.drawn}
                  </td>
                  <td className={`${cellPad} text-center tabular-nums text-rose-300/80`}>
                    {row.lost}
                  </td>
                  {!compact ? (
                    <>
                      <td className={`${cellPad} text-center tabular-nums text-slate-300/90`}>
                        {row.goalsFor}
                      </td>
                      <td className={`${cellPad} text-center tabular-nums text-slate-400/90`}>
                        {row.goalsAgainst}
                      </td>
                      <td
                        className={`${cellPad} text-center font-semibold tabular-nums ${
                          row.goalDiff > 0
                            ? "text-emerald-300/90"
                            : row.goalDiff < 0
                              ? "text-rose-300/80"
                              : "text-slate-400"
                        }`}
                      >
                        {goalDiffLabel}
                      </td>
                    </>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
