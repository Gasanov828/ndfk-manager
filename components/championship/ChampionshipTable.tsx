import type { ChampionshipStandingRow } from "@/lib/championship/types";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Фон для sticky-ячеек (совпадает с tournament-panel). */
const STICKY_BG = "bg-[#10121c]";
const STICKY_BG_HOME = "bg-[#1a1508]";

function MovementBadge({ change }: { change?: number }) {
  if (!change) return null;
  const up = change > 0;
  return (
    <span
      className={`ml-0.5 text-[9px] font-black leading-none ${
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

  const textSize = compact ? "text-[10px]" : "text-[11px] sm:text-xs";
  const headSize = compact ? "text-[7px]" : "text-[8px] sm:text-[9px]";
  const statPad = compact ? "px-1 py-1" : "px-1.5 py-2 sm:px-2 sm:py-2.5";

  return (
    <div className="tournament-panel overflow-hidden rounded-[16px]">
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <table
          className={`w-max min-w-full border-collapse text-left ${textSize}`}
        >
          <thead>
            <tr
              className={`border-b border-white/8 uppercase tracking-wider text-amber-200/45 ${headSize}`}
            >
              <th
                className={`sticky left-0 z-20 w-8 ${STICKY_BG} px-1.5 py-2 font-bold sm:px-2`}
              >
                №
              </th>
              <th
                className={`sticky left-8 z-20 min-w-[7.5rem] ${STICKY_BG} px-2 py-2 font-bold sm:min-w-[8.5rem] sm:px-3`}
              >
                Команда
              </th>
              <th className={`${statPad} text-center font-bold`} title="Игры">
                И
              </th>
              <th className={`${statPad} text-center font-bold`} title="Очки">
                О
              </th>
              <th className={`${statPad} text-center font-bold`} title="Победы">
                В
              </th>
              <th className={`${statPad} text-center font-bold`} title="Ничьи">
                Н
              </th>
              <th className={`${statPad} text-center font-bold`} title="Поражения">
                П
              </th>
              {!compact ? (
                <>
                  <th className={`${statPad} text-center font-bold`} title="Забито">
                    З
                  </th>
                  <th className={`${statPad} text-center font-bold`} title="Пропущено">
                    Пр
                  </th>
                  <th
                    className={`${statPad} text-center font-bold`}
                    title="Разница мячей"
                  >
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
              const stickyBg = row.isHomeClub ? STICKY_BG_HOME : STICKY_BG;

              return (
                <tr
                  key={row.teamId}
                  className={`border-b border-white/[0.04] ${
                    row.isHomeClub ? "bg-amber-500/[0.12]" : ""
                  }`}
                >
                  <td
                    className={`sticky left-0 z-10 ${stickyBg} px-1.5 py-2 font-bold tabular-nums text-slate-400 sm:px-2`}
                  >
                    <span className="inline-flex items-center whitespace-nowrap">
                      {medal ? <span className="text-[11px]">{medal}</span> : place}
                      {showMovement ? (
                        <MovementBadge change={row.positionChange} />
                      ) : null}
                    </span>
                  </td>
                  <td
                    className={`sticky left-8 z-10 ${stickyBg} min-w-[7.5rem] px-2 py-2 sm:min-w-[8.5rem] sm:px-3`}
                  >
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: row.primaryColor }}
                      />
                      <span
                        className={`font-extrabold leading-tight ${
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
                  <td className={`${statPad} text-center tabular-nums text-slate-300/90`}>
                    {row.played}
                  </td>
                  <td className={`${statPad} text-center font-black tabular-nums text-amber-200`}>
                    {row.points}
                  </td>
                  <td className={`${statPad} text-center tabular-nums text-emerald-300/90`}>
                    {row.won}
                  </td>
                  <td className={`${statPad} text-center tabular-nums text-slate-300/90`}>
                    {row.drawn}
                  </td>
                  <td className={`${statPad} text-center tabular-nums text-rose-300/80`}>
                    {row.lost}
                  </td>
                  {!compact ? (
                    <>
                      <td className={`${statPad} text-center tabular-nums text-slate-300/90`}>
                        {row.goalsFor}
                      </td>
                      <td className={`${statPad} text-center tabular-nums text-slate-400/90`}>
                        {row.goalsAgainst}
                      </td>
                      <td
                        className={`${statPad} text-center font-semibold tabular-nums ${
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
      <p className="border-t border-white/8 px-3 py-1.5 text-[9px] text-slate-500 sm:text-[10px]">
        Листайте таблицу вправо для статистики · название команды всегда слева
      </p>
    </div>
  );
}
