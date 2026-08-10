import Link from "next/link";
import type { SeasonPrizesTeamRow } from "@/lib/championship/server";

export default function SeasonPrizesTeamOverview({
  rows,
  activePlayerId,
}: {
  rows: SeasonPrizesTeamRow[];
  activePlayerId: number;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="mb-3 rounded-2xl border border-violet-400/25 bg-violet-500/10 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-violet-200/80">
        Админ · кто сколько открыл
      </p>
      <p className="mt-1 text-[11px] leading-snug text-slate-300">
        Награды считаются <strong className="text-white">персонально</strong> по
        статистике каждого игрока (матчи, голы, рейтинг, MVP). Число «7 / 21» —
        это не общий клубный счёт, а коллекция одного игрока.
      </p>
      <ul className="mt-2 space-y-1">
        {rows.map((row) => {
          const isActive = row.playerId === activePlayerId;
          return (
            <li
              key={row.playerId}
              className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 ${
                isActive
                  ? "bg-amber-500/20 ring-1 ring-amber-400/30"
                  : "bg-black/20"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-white">
                  {row.playerName}
                  {isActive ? (
                    <span className="ml-1 text-[10px] font-semibold text-amber-200/90">
                      ← сейчас на экране
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] font-black tabular-nums text-amber-100">
                  {row.unlockedTotal}/{row.total}
                </span>
                {!isActive ? (
                  <Link
                    href={`/players/${row.playerId}`}
                    className="text-[10px] font-bold text-violet-200/90 hover:text-violet-100"
                  >
                    Профиль
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
