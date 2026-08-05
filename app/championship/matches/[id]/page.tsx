import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import { getChampionshipMatchById } from "@/lib/championship/server";
import { SHOW_MATCH_MVP_UI } from "@/lib/matchMvpUi";
import type { ChampionshipTeam } from "@/lib/championship/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function teamLabel(
  team: ChampionshipTeam | ChampionshipTeam[] | null | undefined
): string {
  if (!team) return "Команда";
  return Array.isArray(team) ? team[0]?.name ?? "Команда" : team.name;
}

export default async function ChampionshipMatchDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const { data: match, error } = await getChampionshipMatchById(matchId);
  if (error || !match) notFound();

  const played = Boolean(match.is_played);
  const scorers = match.playerStats
    .filter((row) => row.goals > 0)
    .sort((a, b) => b.goals - a.goals);
  const assisters = match.playerStats
    .filter((row) => row.assists > 0)
    .sort((a, b) => b.assists - a.assists);
  const mvp = match.playerStats.find((row) => row.is_mvp);

  const score =
    played && match.home_goals != null && match.away_goals != null
      ? `${match.home_goals}:${match.away_goals}`
      : match.is_live
        ? "LIVE"
        : "vs";

  return (
    <section className="space-y-3">
      <Link
        href="/championship/matches"
        className="inline-block text-[11px] font-semibold text-amber-200/70 hover:text-amber-100"
      >
        ← Все матчи
      </Link>

      <div className="tournament-panel rounded-[22px] px-4 py-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/60">
          {formatMatchDate(match.match_date)} ·{" "}
          {formatMatchTime(match.match_time)}
        </p>
        <h1 className="mt-2 text-lg font-black text-white sm:text-xl">
          {teamLabel(match.home_team)}
        </h1>
        <p className="mt-2 text-3xl font-black tabular-nums text-amber-200 sm:text-4xl">
          {score}
        </p>
        <h2 className="mt-2 text-lg font-black text-white sm:text-xl">
          {teamLabel(match.away_team)}
        </h2>
        {match.location ? (
          <p className="mt-2 text-xs text-slate-500">{match.location}</p>
        ) : null}
        {SHOW_MATCH_MVP_UI && mvp?.player ? (
          <p className="mt-2 text-xs font-semibold text-amber-200/80">
            ⭐ MVP: {mvp.player.name}
          </p>
        ) : null}
      </div>

      {played && (scorers.length > 0 || assisters.length > 0) ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="tournament-panel rounded-2xl px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/60">
              ⚽ Голы сезона
            </p>
            {scorers.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Нет данных</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {scorers.map((stat) => (
                  <li
                    key={stat.id}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span className="font-semibold text-white">
                      {stat.player?.name ?? `Игрок #${stat.player_id}`}
                    </span>
                    <span className="font-black text-amber-200">
                      {stat.goals}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="tournament-panel rounded-2xl px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/60">
              🎯 Ассисты сезона
            </p>
            {assisters.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Нет данных</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {assisters.map((stat) => (
                  <li
                    key={stat.id}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span className="font-semibold text-white">
                      {stat.player?.name ?? `Игрок #${stat.player_id}`}
                    </span>
                    <span className="font-black text-cyan-200">
                      {stat.assists}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
