import Link from "next/link";

export type ProgressRow = {
  playerId: number;
  name: string;
  photoUrl: string | null;
  teamName: string;
  teamColor: string;
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNext: number;
  percent: number;
  seasonRating: number;
};

function PlayerPhoto({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/15"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-xs font-black text-amber-100 ring-1 ring-amber-400/20">
      {name.trim().charAt(0) || "?"}
    </div>
  );
}

export default function ChampionshipProgressBoard({
  rows,
}: {
  rows: ProgressRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
        Прогресс сезона ещё пуст — все начнут с 1 уровня и 0 XP
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {rows.map((row, index) => (
        <Link
          key={row.playerId}
          href={`/players/${row.playerId}`}
          className="tournament-panel block rounded-2xl px-3 py-2.5 transition hover:border-amber-400/30 hover:bg-amber-500/[0.06]"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-5 text-center text-[11px] font-bold text-slate-500">
              {index + 1}
            </span>
            <PlayerPhoto name={row.name} photoUrl={row.photoUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-extrabold text-white">
                  {row.name}
                </p>
                <span className="shrink-0 rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-100">
                  Ур. {row.level}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">
                <span
                  className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                  style={{ background: row.teamColor }}
                />
                {row.teamName}
                {row.seasonRating > 0
                  ? ` · ср. ${row.seasonRating}`
                  : ""}
              </p>
              <div className="mt-1.5">
                <div className="mb-0.5 flex items-center justify-between text-[9px] font-semibold text-amber-200/70">
                  <span>
                    {row.xpIntoLevel} / {row.xpForNext} XP
                  </span>
                  <span className="text-slate-500">{row.totalXp} всего</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-[width] duration-500"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
