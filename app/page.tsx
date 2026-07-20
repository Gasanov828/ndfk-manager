import Link from "next/link";
import HomeHero from "@/components/HomeHero";
import MatchScoreboard from "@/components/MatchScoreboard";
import PlayerWelcomeSection from "@/components/PlayerWelcomeSection";
import TeamStars from "@/components/TeamStars";
import { getAuthSession } from "@/lib/auth";
import { getAverageLineupRating } from "@/lib/lineup";
import {
  getPlayerOfMonth,
  getTopAssister,
  getTopRated,
  getTopScorer,
  type MatchStatRow,
} from "@/lib/playerAwards";
import {
  enrichMatchMvpInfo,
  getMatchMvpFromSummaries,
  type MatchMvpInfo,
} from "@/lib/matchRatings";
import {
  buildPersonalMvpFromTeamData,
  buildPlayerWelcomeFromTeamData,
} from "@/lib/server/playerWelcome";
import { getTeamPageData } from "@/lib/server/teamData";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HomeSummaryProps = {
  className?: string;
  playersCount: number;
  totalGoals: number;
  totalAssists: number;
  averageLineupRating: string;
  playedCount: number;
  winsCount: number;
  latestPlayed: {
    opponent: string;
    date: string;
    time: string;
    ndfk_goals?: number;
    opponent_goals?: number;
  } | null;
};

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "cyan" | "violet" | "amber" | "emerald";
}) {
  const toneClass = {
    cyan: "border-cyan-400/15 bg-cyan-500/10 text-cyan-200/80",
    violet: "border-violet-400/15 bg-violet-500/10 text-violet-200/80",
    amber: "border-amber-400/15 bg-amber-500/10 text-amber-200/80",
    emerald: "border-emerald-400/15 bg-emerald-500/10 text-emerald-200/80",
  }[tone];

  return (
    <div className={`rounded-xl border p-2.5 sm:rounded-2xl sm:p-4 ${toneClass}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wide sm:text-xs">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-extrabold text-white sm:mt-2 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function HomeSummary({
  className = "",
  playersCount,
  totalGoals,
  totalAssists,
  averageLineupRating,
  playedCount,
  winsCount,
  latestPlayed,
}: HomeSummaryProps) {
  return (
    <aside className={`glass-panel-strong rounded-2xl p-3 ring-1 ring-violet-500/12 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-5">
        <div>
          <h2 className="text-base font-bold text-white sm:text-xl">
            Сводка команды
          </h2>
          <p className="mt-0.5 text-xs text-slate-400 sm:mt-1 sm:text-sm">
            Главное по составу и статистике
          </p>
        </div>
        <Link
          href="/players"
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:text-white sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs"
        >
          Игроки →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <MiniMetric label="Игроков" value={playersCount} tone="cyan" />
        <MiniMetric label="Рейтинг" value={averageLineupRating} tone="violet" />
        <MiniMetric label="Голы" value={totalGoals} tone="amber" />
        <MiniMetric label="Передачи" value={totalAssists} tone="emerald" />
      </div>

      <div className="mt-2 rounded-xl border border-white/5 bg-black/20 p-3 sm:mt-4 sm:rounded-2xl sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
              Сыграно матчей
            </p>
            <p className="mt-0.5 text-xl font-extrabold text-white sm:mt-1 sm:text-2xl">
              {playedCount}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
              Победы
            </p>
            <p className="mt-0.5 text-xl font-extrabold text-emerald-300 sm:mt-1 sm:text-2xl">
              {winsCount}
            </p>
          </div>
        </div>
      </div>

      {latestPlayed &&
        latestPlayed.ndfk_goals != null &&
        latestPlayed.opponent_goals != null && (
        <div className="mt-2 rounded-xl border border-white/5 bg-black/20 p-3 sm:mt-4 sm:rounded-2xl sm:p-4">
          <MatchScoreboard
            match={{
              opponent: latestPlayed.opponent,
              ndfk_goals: latestPlayed.ndfk_goals,
              opponent_goals: latestPlayed.opponent_goals,
              date: latestPlayed.date,
              time: latestPlayed.time,
              is_played: true,
            }}
            density="roomy"
          />
          <Link
            href="/matches#history"
            className="mt-2.5 inline-block text-[11px] font-semibold text-cyan-400 hover:underline sm:mt-3 sm:text-xs"
          >
            История матчей →
          </Link>
        </div>
      )}
    </aside>
  );
}

export default async function Home() {
  const [teamData, { profile }, matchStatsResult] = await Promise.all([
    getTeamPageData(),
    getAuthSession(),
    (async () => {
      const supabase = await createClient();
      return supabase
        .from("match_player_stats")
        .select("player_id, goals, assists, match:matches(date, is_played)");
    })(),
  ]);

  const { players, matches, playersError, latestPlayed, summaries } = teamData;

  if (playersError) {
    return <main className="p-8 text-red-400">Ошибка загрузки данных</main>;
  }

  let matchMvp: MatchMvpInfo | null = null;
  if (latestPlayed && summaries.length > 0) {
    matchMvp = getMatchMvpFromSummaries(
      summaries,
      players.map((player) => ({ id: player.id, name: player.name })),
      latestPlayed
    );
  }

  let mvpMatchGoals: number | null = null;
  let mvpMatchAssists: number | null = null;
  if (matchMvp && latestPlayed) {
    const supabase = await createClient();
    const { data: mvpStat } = await supabase
      .from("match_player_stats")
      .select("goals, assists")
      .eq("match_id", latestPlayed.id)
      .eq("player_id", matchMvp.playerId)
      .maybeSingle();
    mvpMatchGoals = mvpStat?.goals ?? null;
    mvpMatchAssists = mvpStat?.assists ?? null;
  }

  if (matchMvp) {
    const mvpId = matchMvp.playerId;
    const mvpPlayer = players.find((player) => player.id === mvpId);
    matchMvp = enrichMatchMvpInfo(matchMvp, {
      photoUrl: mvpPlayer?.photo_url ?? null,
      matchGoals: mvpMatchGoals,
      matchAssists: mvpMatchAssists,
    });
  }

  const playerWelcome = buildPlayerWelcomeFromTeamData(profile, teamData);
  let personalMvp = buildPersonalMvpFromTeamData(profile, teamData);
  if (personalMvp && matchMvp && personalMvp.playerId === matchMvp.playerId) {
    personalMvp = enrichMatchMvpInfo(personalMvp, {
      photoUrl: matchMvp.photoUrl,
      matchGoals: matchMvp.matchGoals,
      matchAssists: matchMvp.matchAssists,
    });
  }
  const hidePublicMvp = personalMvp != null && personalMvp.isConfirmedMvp;
  const totalGoals = players.reduce((sum, player) => sum + player.goals, 0);
  const totalAssists = players.reduce((sum, player) => sum + player.assists, 0);
  const playedMatches = matches.filter((match) => match.is_played);
  const winsCount = playedMatches.filter(
    (match) =>
      match.ndfk_goals != null &&
      match.opponent_goals != null &&
      match.ndfk_goals > match.opponent_goals
  ).length;
  const averageLineupRating = getAverageLineupRating(players).toFixed(1);

  const topScorer = getTopScorer(players);
  const topAssister = getTopAssister(players);
  const playerOfMonth = getPlayerOfMonth(
    players,
    (matchStatsResult.data ?? []) as unknown as MatchStatRow[]
  );
  const topRated = getTopRated(players);

  return (
    <>
      <PlayerWelcomeSection
        initialWelcome={playerWelcome}
        initialPersonalMvp={personalMvp}
      />

      <section className="mb-3 grid gap-2 sm:mb-8 sm:gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.65fr)]">
        <HomeHero
          players={players}
          matches={matches}
          matchMvp={hidePublicMvp ? null : matchMvp}
        />

        <HomeSummary
          className="hidden xl:block"
          playersCount={players.length}
          totalGoals={totalGoals}
          totalAssists={totalAssists}
          averageLineupRating={averageLineupRating}
          playedCount={playedMatches.length}
          winsCount={winsCount}
          latestPlayed={latestPlayed}
        />
      </section>

      <TeamStars
        topScorer={topScorer}
        topAssister={topAssister}
        playerOfMonth={playerOfMonth}
        topRated={topRated}
        totalGoals={totalGoals}
        totalAssists={totalAssists}
        averageRating={averageLineupRating}
        playedCount={playedMatches.length}
      />
    </>
  );
}
