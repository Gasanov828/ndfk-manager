import Link from "next/link";
import AnimatedValue from "@/components/ui/AnimatedValue";
import ChampionshipProgressBar from "@/components/ui/ChampionshipProgressBar";
import type { HomeChampionshipDashboardData } from "@/lib/championship/homeDashboard";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";

function shortName(name: string): string {
  const first = name.trim().split(/\s+/)[0] || name;
  return first.length > 10 ? `${first.slice(0, 9)}…` : first;
}


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
}export default function HomeChampionshipDashboard({
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
    ourPlace,
  } = data;

  const hasPlayed = Boolean(lastMatch?.isPlayed);
  const hasDate = Boolean(nextMatch?.date);

  return (
    <section className="mb-2 sm:mb-4">
      <div className="glass-panel-strong overflow-hidden rounded-2xl ring-1 ring-amber-400/20">
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

        <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-2 px-3 pb-2">
          <div className="min-w-0">
            <div className="mb-1 grid grid-cols-[18px_minmax(0,1fr)_22px_22px] items-center gap-1 px-1.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
              <span>№</span>
              <span>Команда</span>
              <span className="text-center">О</span>
              <span className="text-center">В</span>
            </div>
            <ul className="space-y-0.5">
              {standingsSlice.map((row) => (
                <li
                  key={row.teamId}
                  className={`grid grid-cols-[18px_minmax(0,1fr)_22px_22px] items-center gap-1 rounded-lg px-1.5 py-0.5 ${
                    row.isHomeClub ? "bg-amber-500/20 championship-home-row-glow" : ""
                  }`}
                >
                  <span className="flex items-center text-[10px] font-bold tabular-nums text-slate-500">
                    <AnimatedValue value={row.place} />
                    <MovementBadge change={row.positionChange} />
                  </span>
                  <span
                    className={`min-w-0 truncate text-[11px] font-extrabold ${
                      row.isHomeClub ? "text-amber-100" : "text-slate-300"
                    }`}
                  >
                    {row.teamName}
                  </span>
                  <span
                    className={`text-center text-[11px] font-black tabular-nums ${
                      row.isHomeClub ? "text-amber-200" : "text-slate-400"
                    }`}
                  >
                    <AnimatedValue value={row.points} />
                  </span>
                  <span className="text-center text-[10px] font-bold tabular-nums text-emerald-300/80">
                    <AnimatedValue value={row.won} />
                  </span>

                </li>
              ))}
            </ul>
            {ourPlace ? (
              <p className="mt-1 text-[9px] font-semibold text-amber-100/70">
                Мы сейчас на <AnimatedValue value={ourPlace} />-м месте
              </p>
            ) : null}

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

        <div className="border-t border-white/8 px-3 py-1.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold text-amber-100/80">
              Тур {progress.currentRound} / {progress.totalRounds}
            </p>
            <p className="text-[9px] tabular-nums text-slate-500">
              <AnimatedValue value={`${progress.percent}%`} />
            </p>
          </div>
          <ChampionshipProgressBar percent={progress.percent} />
        </div>
      </div>
    </section>
  );
}
