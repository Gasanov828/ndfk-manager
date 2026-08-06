import type { ChampionshipStandingRow } from "@/lib/championship/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ChampionshipTable({
  rows,
}: {
  rows: ChampionshipStandingRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-500">
        Команды сезона ещё не загружены
      </p>
    );
  }

  return (
    <div className="tournament-panel overflow-hidden rounded-[16px]">
      <table className="w-full table-fixed border-collapse text-left text-[11px]">
        <thead>
          <tr className="border-b border-white/8 text-[8px] uppercase tracking-wider text-amber-200/45">
            <th className="w-7 px-1 py-1.5 font-bold">№</th>
            <th className="px-1 py-1.5 font-bold">Команда</th>
            <th className="w-7 px-0.5 py-1.5 text-center font-bold">И</th>
            <th className="w-7 px-0.5 py-1.5 text-center font-bold">В</th>
            <th className="w-7 px-1 py-1.5 text-center font-bold">П</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const place = index + 1;
            const medal = MEDALS[index];
            return (
              <tr
                key={row.teamId}
                className={`border-b border-white/[0.04] ${
                  row.isHomeClub ? "bg-amber-500/[0.12]" : ""
                }`}
              >
                <td className="px-1 py-1.5 font-bold tabular-nums text-slate-400">
                  {medal ? <span className="text-[11px]">{medal}</span> : place}
                </td>
                <td className="min-w-0 px-1 py-1.5">
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
                <td className="px-0.5 py-1.5 text-center tabular-nums text-slate-400">
                  {row.played}
                </td>
                <td className="px-0.5 py-1.5 text-center tabular-nums text-emerald-300/90">
                  {row.won}
                </td>
                <td className="px-1 py-1.5 text-center tabular-nums text-rose-300/80">
                  {row.lost}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
