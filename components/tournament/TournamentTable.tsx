import Link from "next/link";
import type { TournamentStandingRow } from "@/lib/tournament/standings";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function TournamentTable({
  rows,
}: {
  rows: TournamentStandingRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
        Пока нет сыгранных матчей для таблицы
      </p>
    );
  }

  return (
    <div className="tournament-panel overflow-hidden rounded-[20px]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[11px] sm:text-xs">
          <thead>
            <tr className="border-b border-white/8 text-[9px] uppercase tracking-wider text-amber-200/50 sm:text-[10px]">
              <th className="px-2 py-2.5 font-bold sm:px-3">#</th>
              <th className="px-2 py-2.5 font-bold sm:px-3">Команда</th>
              <th className="px-1.5 py-2.5 text-center font-bold">И</th>
              <th className="px-1.5 py-2.5 text-center font-bold">В</th>
              <th className="px-1.5 py-2.5 text-center font-bold">Н</th>
              <th className="px-1.5 py-2.5 text-center font-bold">П</th>
              <th className="px-1.5 py-2.5 text-center font-bold">З</th>
              <th className="px-1.5 py-2.5 text-center font-bold">Пр</th>
              <th className="px-1.5 py-2.5 text-center font-bold">РМ</th>
              <th className="px-2 py-2.5 text-center font-bold sm:px-3">О</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const place = index + 1;
              const medal = MEDALS[index];
              return (
                <tr
                  key={row.teamId}
                  className={`border-b border-white/[0.04] transition ${
                    row.isHome
                      ? "bg-amber-500/[0.08]"
                      : place <= 3
                        ? "bg-white/[0.02]"
                        : ""
                  }`}
                >
                  <td className="px-2 py-2.5 tabular-nums font-bold text-slate-300 sm:px-3">
                    {medal ? (
                      <span className="text-sm">{medal}</span>
                    ) : (
                      place
                    )}
                  </td>
                  <td className="px-2 py-2.5 sm:px-3">
                    <span
                      className={`font-extrabold ${
                        row.isHome ? "text-amber-100" : "text-white"
                      }`}
                    >
                      {row.teamName}
                    </span>
                    {row.isHome ? (
                      <span className="ml-1.5 rounded bg-amber-500/20 px-1 py-0.5 text-[8px] font-bold uppercase text-amber-200">
                        мы
                      </span>
                    ) : null}
                  </td>
                  <td className="px-1.5 py-2.5 text-center tabular-nums text-slate-300">
                    {row.played}
                  </td>
                  <td className="px-1.5 py-2.5 text-center tabular-nums text-emerald-300/90">
                    {row.won}
                  </td>
                  <td className="px-1.5 py-2.5 text-center tabular-nums text-slate-400">
                    {row.drawn}
                  </td>
                  <td className="px-1.5 py-2.5 text-center tabular-nums text-rose-300/80">
                    {row.lost}
                  </td>
                  <td className="px-1.5 py-2.5 text-center tabular-nums text-slate-300">
                    {row.goalsFor}
                  </td>
                  <td className="px-1.5 py-2.5 text-center tabular-nums text-slate-300">
                    {row.goalsAgainst}
                  </td>
                  <td className="px-1.5 py-2.5 text-center tabular-nums text-slate-300">
                    {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                  </td>
                  <td className="px-2 py-2.5 text-center text-[13px] font-black tabular-nums text-amber-200 sm:px-3 sm:text-sm">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-white/8 px-3 py-2 text-[10px] text-slate-500">
        3 очка за победу · 1 за ничью · данные из сыгранных матчей клуба
      </p>
    </div>
  );
}

export function TournamentEmptyHint({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-amber-400/20 bg-amber-500/[0.04] px-4 py-8 text-center">
      <p className="text-sm text-slate-400">{label}</p>
      <Link
        href={href}
        className="mt-3 inline-block text-xs font-semibold text-amber-200/80 hover:text-amber-100"
      >
        Смотреть матчи →
      </Link>
    </div>
  );
}
