import Link from "next/link";
import type { HomeChampionshipDashboardData } from "@/lib/championship/homeDashboard";
import type { ChampionshipStandingRow } from "@/lib/championship/types";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";

const FORM: Record<"W" | "D" | "L", { label: string; className: string }> = {
  W: { label: "В", className: "bg-emerald-500/90 text-white" },
  D: { label: "Н", className: "bg-amber-400/90 text-slate-900" },
  L: { label: "П", className: "bg-rose-500/90 text-white" },
};

export default function ChampionshipOverview({
  data,
  standings,
  topScorers,
}: {
  data: HomeChampionshipDashboardData;
  standings: ChampionshipStandingRow[];
  topScorers: Array<{ name: string; value: number; teamName: string }>;
}) {
  const us = standings.find((row) => row.isHomeClub);
  const { lastMatch, nextMatch, progress, form, leader } = data;

  return (
    <div className="mt-2 space-y-2">
      {/* Наша сводка */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="tournament-panel rounded-xl px-2 py-2 text-center">
          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
            Место
          </p>
          <p className="mt-0.5 text-lg font-black tabular-nums text-amber-200">
            {data.ourPlace ?? "—"}
          </p>
        </div>
        <div className="tournament-panel rounded-xl px-2 py-2 text-center">
          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
            Очки
          </p>
          <p className="mt-0.5 text-lg font-black tabular-nums text-white">
            {us?.points ?? 0}
          </p>
        </div>
        <div className="tournament-panel rounded-xl px-2 py-2 text-center">
          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
            РМ
          </p>
          <p className="mt-0.5 text-lg font-black tabular-nums text-slate-200">
            {us
              ? us.goalDiff > 0
                ? `+${us.goalDiff}`
                : us.goalDiff
              : 0}
          </p>
        </div>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {/* Следующий */}
        <div className="tournament-panel rounded-xl px-2.5 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
            📅 Следующий матч
          </p>
          {nextMatch ? (
            <>
              <p className="mt-1 truncate text-[12px] font-extrabold text-white">
                {nextMatch.ourName} — {nextMatch.opponent}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {nextMatch.date
                  ? `${formatMatchDate(nextMatch.date)}${
                      nextMatch.time
                        ? ` · ${formatMatchTime(nextMatch.time)}`
                        : ""
                    }`
                  : "Дата уточняется"}
              </p>
              {nextMatch.location ? (
                <p className="truncate text-[9px] text-slate-500">
                  {nextMatch.location}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">Дата уточняется</p>
          )}
        </div>

        {/* Последний */}
        <div className="tournament-panel rounded-xl px-2.5 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
            ⚽ Последний матч
          </p>
          {lastMatch?.isPlayed ? (
            <>
              <p className="mt-1 truncate text-[12px] font-extrabold text-white">
                {lastMatch.homeName}{" "}
                <span className="tabular-nums text-amber-200">
                  {lastMatch.homeGoals}:{lastMatch.awayGoals}
                </span>{" "}
                {lastMatch.awayName}
              </p>
              <p
                className={`mt-0.5 text-[10px] font-bold ${
                  lastMatch.result === "W"
                    ? "text-emerald-300"
                    : lastMatch.result === "D"
                      ? "text-amber-300"
                      : "text-rose-300"
                }`}
              >
                {lastMatch.resultLabel}
                {lastMatch.date
                  ? ` · ${formatMatchDate(lastMatch.date)}`
                  : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">
              Матч ещё не завершён
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {/* Форма + прогресс */}
        <div className="tournament-panel rounded-xl px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
              🔥 Форма
            </p>
            <Link
              href="/championship/matches"
              className="text-[9px] font-semibold text-amber-200/70"
            >
              Матчи →
            </Link>
          </div>
          {form.length === 0 ? (
            <p className="mt-1.5 text-[11px] text-slate-500">Пока нет матчей</p>
          ) : (
            <div className="mt-1.5 flex gap-1">
              {form.map((r, i) => (
                <span
                  key={`${r}-${i}`}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${FORM[r].className}`}
                >
                  {FORM[r].label}
                </span>
              ))}
            </div>
          )}
          <div className="mt-2">
            <div className="mb-0.5 flex justify-between text-[9px] text-slate-500">
              <span>
                Тур {progress.currentRound}/{progress.totalRounds}
              </span>
              <span>{progress.percent}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Лидер */}
        <div className="tournament-panel rounded-xl px-2.5 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
            ⭐ Лидер команды
          </p>
          {leader ? (
            <Link
              href={`/players/${leader.playerId}`}
              className="mt-1.5 flex items-center gap-2"
            >
              {leader.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={leader.photoUrl}
                  alt=""
                  className="h-9 w-9 rounded-lg object-cover ring-1 ring-amber-400/25"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-xs font-black text-amber-100">
                  {leader.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[12px] font-extrabold text-white">
                  {leader.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  ср. {leader.avgRating || "—"} · {leader.goals}Г ·{" "}
                  {leader.assists}П
                </p>
              </div>
            </Link>
          ) : (
            <p className="mt-1.5 text-[11px] text-slate-500">
              После первых матчей
            </p>
          )}
        </div>
      </div>

      {/* Бомбардиры */}
      <div className="tournament-panel rounded-xl px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
            ⚽ Топ бомбардиров
          </p>
          <Link
            href="/championship/scorers"
            className="text-[9px] font-semibold text-amber-200/70"
          >
            Все →
          </Link>
        </div>
        {topScorers.length === 0 ? (
          <p className="mt-1.5 text-[11px] text-slate-500">Пока без голов</p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {topScorers.slice(0, 5).map((row, index) => (
              <li
                key={`${row.name}-${index}`}
                className="flex items-center gap-2 text-[11px]"
              >
                <span className="w-4 text-center font-bold text-slate-500">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-white">
                  {row.name}
                </span>
                <span className="truncate text-[9px] text-slate-500">
                  {row.teamName}
                </span>
                <span className="font-black tabular-nums text-amber-200">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
