import Link from "next/link";
import type {
  TournamentAward,
  TournamentMvpRow,
  TournamentPlayerRow,
  TournamentStatCard,
} from "@/lib/tournament/build";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base">🥇</span>;
  if (rank === 2) return <span className="text-base">🥈</span>;
  if (rank === 3) return <span className="text-base">🥉</span>;
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-[11px] font-bold text-slate-400">
      {rank}
    </span>
  );
}

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
        className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/15"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-[11px] font-black text-amber-100 ring-1 ring-amber-400/20">
      {name.trim().charAt(0) || "?"}
    </div>
  );
}

export function TournamentScorersBoard({
  rows,
  valueLabel,
}: {
  rows: TournamentPlayerRow[];
  valueLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
        Пока нет данных
      </p>
    );
  }

  return (
    <div className="tournament-panel divide-y divide-white/[0.05] overflow-hidden rounded-[20px]">
      {rows.map((row) => (
        <Link
          key={row.playerId}
          href={`/players/${row.playerId}`}
          className="flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-amber-500/[0.06]"
        >
          <RankBadge rank={row.rank} />
          <PlayerPhoto name={row.name} photoUrl={row.photoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold text-white">
              {row.name}
            </p>
            <p className="truncate text-[10px] text-slate-500">
              {row.teamName}
              {row.secondary != null ? ` · ${row.secondary} втор.` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black tabular-nums text-amber-200">
              {row.value}
            </p>
            <p className="text-[9px] uppercase tracking-wide text-slate-500">
              {valueLabel}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function TournamentMvpBoard({ rows }: { rows: TournamentMvpRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
        Оценок и MVP пока нет
      </p>
    );
  }

  return (
    <div className="tournament-panel divide-y divide-white/[0.05] overflow-hidden rounded-[20px]">
      {rows.map((row) => (
        <Link
          key={row.playerId}
          href={`/players/${row.playerId}`}
          className="flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-amber-500/[0.06]"
        >
          <RankBadge rank={row.rank} />
          <PlayerPhoto name={row.name} photoUrl={row.photoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold text-white">
              {row.name}
            </p>
            <p className="truncate text-[10px] text-slate-500">
              OVR {row.rating} · матчей {row.matchesRated}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black tabular-nums text-amber-200">
              {row.avgMatchRating.toFixed(1)}
            </p>
            <p className="text-[9px] font-bold text-amber-300/70">
              MVP ×{row.mvpCount}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function TournamentStatsGrid({ cards }: { cards: TournamentStatCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.id} className="tournament-panel rounded-2xl px-3 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200/55">
            <span className="mr-1" aria-hidden>
              {card.icon}
            </span>
            {card.title}
          </p>
          <p className="mt-2 truncate text-[14px] font-extrabold text-white sm:text-[15px]">
            {card.value}
          </p>
          {card.subtitle ? (
            <p className="mt-0.5 text-[10px] text-slate-500">{card.subtitle}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function TournamentAwardsGrid({ awards }: { awards: TournamentAward[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {awards.map((award) => (
        <div
          key={award.id}
          className="tournament-panel flex items-center gap-3 rounded-[20px] px-3 py-3"
        >
          <span className="text-2xl" aria-hidden>
            {award.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200/60">
              {award.title}
            </p>
            {award.playerId && award.playerName ? (
              <Link
                href={`/players/${award.playerId}`}
                className="mt-1 flex items-center gap-2"
              >
                <PlayerPhoto
                  name={award.playerName}
                  photoUrl={award.photoUrl}
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold text-white">
                    {award.playerName}
                  </p>
                  <p className="text-[10px] text-slate-500">{award.valueLabel}</p>
                </div>
              </Link>
            ) : (
              <p className="mt-1 text-[12px] text-slate-500">{award.valueLabel}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
