import Link from "next/link";
import type { HomeChampionshipDashboardData } from "@/lib/championship/homeDashboard";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";

function shortName(name: string): string {
  const first = name.trim().split(/\s+/)[0] || name;
  return first.length > 10 ? `${first.slice(0, 9)}…` : first;
}

export default function HomeChampionshipDashboard({
  data,
}: {
  data: HomeChampionshipDashboardData;
}) {
  const {
    championshipName,
    standingsSlice,
    lastMatch,
    nextMatch,
    progress,
  } = data;

  const hasPlayed = Boolean(lastMatch?.isPlayed);
  const hasDate = Boolean(nextMatch?.date);

  return (
    <section className="championship-home-enter mb-2 sm:mb-4">
      <div className="glass-panel-strong overflow-hidden rounded-2xl ring-1 ring-amber-400/20">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/75">
            🏆 {championshipName}
          </p>
          <Link
            href="/championship"
            className="shrink-0 text-[10px] font-bold text-amber-200/80 hover:text-amber-100"
          >
            Таблица →
          </Link>
        </div>

        {/* Body: standings + match | next */}
        <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-2 px-3 pb-2">
          {/* Left */}
          <div className="min-w-0">
            <ul className="space-y-0.5">
              {standingsSlice.map((row) => (
                <li
                  key={row.teamId}
                  className={`flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 ${
                    row.isHomeClub ? "bg-amber-500/20" : ""
                  }`}
                >
                  <span className="w-3.5 text-[10px] font-bold tabular-nums text-slate-500">
                    {row.place}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-[11px] font-extrabold ${
                      row.isHomeClub ? "text-amber-100" : "text-slate-300"
                    }`}
                  >
                    {row.teamName}
                  </span>
                  <span
                    className={`text-[11px] font-black tabular-nums ${
                      row.isHomeClub ? "text-amber-200" : "text-slate-400"
                    }`}
                  >
                    {row.points}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-1.5 border-t border-white/8 pt-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                Последний матч
              </p>
              {!hasPlayed ? (
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                  Матч ещё не завершён
                </p>
              ) : (
                <>
                  <p className="mt-0.5 truncate text-[12px] font-extrabold text-white">
                    {lastMatch!.homeName}{" "}
                    <span className="tabular-nums text-amber-200">
                      {lastMatch!.homeGoals}:{lastMatch!.awayGoals}
                    </span>{" "}
                    {lastMatch!.awayName}
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500">
                        ⚽ Голы
                      </p>
                      {lastMatch!.scorers.length === 0 ? (
                        <p className="text-[10px] text-slate-600">—</p>
                      ) : (
                        lastMatch!.scorers.slice(0, 3).map((row) => (
                          <p
                            key={row.playerId}
                            className="truncate text-[10px] font-semibold text-slate-300"
                          >
                            {shortName(row.name)}
                            {row.count > 1 ? ` ×${row.count}` : ""}
                          </p>
                        ))
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500">
                        🎯 Ассисты
                      </p>
                      {lastMatch!.assisters.length === 0 ? (
                        <p className="text-[10px] text-slate-600">—</p>
                      ) : (
                        lastMatch!.assisters.slice(0, 3).map((row) => (
                          <p
                            key={row.playerId}
                            className="truncate text-[10px] font-semibold text-slate-300"
                          >
                            {shortName(row.name)}
                            {row.count > 1 ? ` ×${row.count}` : ""}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: next match */}
          <div className="min-w-0 rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
              📅 Следующий матч
            </p>
            {nextMatch ? (
              <>
                <p className="mt-1 text-[11px] font-extrabold leading-snug text-white">
                  {nextMatch.ourName} — {nextMatch.opponent}
                </p>
                {hasDate ? (
                  <>
                    <p className="mt-1 text-[11px] font-semibold text-slate-300">
                      {formatMatchDate(nextMatch.date)}
                    </p>
                    {nextMatch.time ? (
                      <p className="text-[11px] font-bold text-amber-200/90">
                        {formatMatchTime(nextMatch.time)}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    Дата уточняется
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Дата уточняется
              </p>
            )}
          </div>
        </div>

        {/* Progress footer */}
        <div className="border-t border-white/8 px-3 py-1.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold text-amber-100/80">
              Тур {progress.currentRound} / {progress.totalRounds}
            </p>
            <p className="text-[9px] tabular-nums text-slate-500">
              {progress.percent}%
            </p>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-[width] duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
