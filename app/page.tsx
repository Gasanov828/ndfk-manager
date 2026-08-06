import Link from "next/link";
import HomeChampionshipDashboard from "@/components/HomeChampionshipDashboard";
import HomeClubAchievements from "@/components/HomeClubAchievements";
import {
  HomeCalendarLink,
  HomeMvpSection,
  HomeNowSection,
} from "@/components/HomeMatchSection";
import HomeTeamLeaders from "@/components/HomeTeamLeaders";
import MatchScoreboard from "@/components/MatchScoreboard";
import PlayerWelcomeSection from "@/components/PlayerWelcomeSection";
import TeamStars from "@/components/TeamStars";
import { getAuthSession } from "@/lib/auth";
import { getHomeChampionshipDashboard } from "@/lib/championship/server";
import { getAverageLineupRating } from "@/lib/lineup";
import {
  normalizeMatchStatRows,
} from "@/lib/playerAwards";
import { buildTeamStarCards } from "@/lib/teamStars";
import { getHomeMvpDisplayMode } from "@/lib/homeMvp";
import {
  getLiveMatch,
  type MatchWithLive,
} from "@/lib/matchStatus";
import {
  enrichMatchMvpInfo,
  getMatchMvpFromSummaries,
  type MatchMvpInfo,
} from "@/lib/matchRatings";
import {
  buildPersonalMvpFromTeamData,
  buildPlayerWelcomeFromTeamData,
} from "@/lib/server/playerWelcome";
import { getConfirmedMvpRecords } from "@/lib/server/careerMvp";
import {
  getRatingDeltas,
  getTeamPageData,
} from "@/lib/server/teamData";
import {
  buildTeamSeasonStats,
  getNextTeamAchievements,
  resolveTeamAchievements,
} from "@/lib/teamAchievements";
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
  const [teamData, { profile }, matchStatsResult, mvpRecords, champDash] =
    await Promise.all([
      getTeamPageData(),
      getAuthSession(),
      (async () => {
        const supabase = await createClient();
        return supabase
          .from("match_player_stats")
          .select("player_id, goals, assists, saves, match:matches(date, is_played)");
      })(),
      getConfirmedMvpRecords(),
      getHomeChampionshipDashboard(),
    ]);

  const { players, matches, playersError, latestPlayed, summaries } = teamData;
  const championshipActive = Boolean(champDash.active && champDash.data);

  if (playersError) {
    return <main className="p-8 text-red-400">Ошибка загрузки данных</main>;
  }

  let matchMvp: MatchMvpInfo | null = null;
  const liveMatch = getLiveMatch(matches as MatchWithLive[]);

  // Только подтверждённый MVP после голосования; во время LIVE — не считаем
  if (!liveMatch && latestPlayed && summaries.length > 0) {
    const candidate = getMatchMvpFromSummaries(
      summaries,
      players.map((player) => ({ id: player.id, name: player.name })),
      latestPlayed
    );
    if (candidate?.isConfirmedMvp) {
      matchMvp = candidate;
    }
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

  const homeMvpMode = getHomeMvpDisplayMode({
    isLive: Boolean(liveMatch),
    mvp: matchMvp,
    match: latestPlayed ?? null,
  });
  const showHomeMvp = homeMvpMode !== "hidden";

  const playerWelcome = buildPlayerWelcomeFromTeamData(profile, teamData);
  let personalMvp =
    liveMatch || !showHomeMvp
      ? null
      : buildPersonalMvpFromTeamData(profile, teamData);
  if (personalMvp && matchMvp && personalMvp.playerId === matchMvp.playerId) {
    personalMvp = enrichMatchMvpInfo(personalMvp, {
      photoUrl: matchMvp.photoUrl,
      matchGoals: matchMvp.matchGoals,
      matchAssists: matchMvp.matchAssists,
    });
  }
  const isPersonalMvp = Boolean(
    personalMvp?.isConfirmedMvp &&
      matchMvp &&
      personalMvp.playerId === matchMvp.playerId
  );
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

  const monthStats = normalizeMatchStatRows(
    matchStatsResult.data as unknown as Parameters<
      typeof normalizeMatchStatRows
    >[0]
  );
  const latestMvp = mvpRecords[0] ?? null;

  const ratingDeltas = getRatingDeltas(teamData.ratingSummaryMap);
  const starCards = buildTeamStarCards({
    players,
    matchStats: monthStats,
    ratingDeltas,
    latestMvp: latestMvp
      ? {
          playerId: latestMvp.playerId,
          playerName: latestMvp.playerName,
          matchRating: latestMvp.matchRating,
        }
      : null,
    limit: 6,
  });

  const clubStats = buildTeamSeasonStats(matches, players, mvpRecords.length);
  const nextClubGoals = getNextTeamAchievements(
    resolveTeamAchievements(clubStats),
    3
  );

  return (
    <>
      {/* 1. Я — голы / пасы / мой состав */}
      <PlayerWelcomeSection
        initialWelcome={playerWelcome}
        initialPersonalMvp={personalMvp}
        isMatchMvp={isPersonalMvp}
      />

      <section className="grid gap-0 xl:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.65fr)] xl:gap-5">
        <div className="min-w-0">
          {championshipActive && champDash.data ? (
            <HomeChampionshipDashboard data={champDash.data} />
          ) : (
            <HomeNowSection matches={matches} />
          )}

          {/* MVP последнего матча (скрыт на LIVE / через 3 дня) — клубные матчи */}
          {!championshipActive && showHomeMvp && matchMvp && latestPlayed ? (
            <HomeMvpSection
              matchMvp={matchMvp}
              match={latestPlayed}
              personal={isPersonalMvp}
              matches={matches}
            />
          ) : null}

          {/* 4. Команда — топ-3 */}
          <HomeTeamLeaders players={players} />

          {/* 5. Следующие цели клуба */}
          <HomeClubAchievements items={nextClubGoals} />

          {/* 6. Звёзды + календарь */}
          <TeamStars
            cards={starCards}
            totalGoals={totalGoals}
            totalAssists={totalAssists}
            averageRating={averageLineupRating}
            playedCount={playedMatches.length}
            winsCount={winsCount}
          />
          <HomeCalendarLink />
        </div>

        <HomeSummary
          className="mb-5 hidden xl:block"
          playersCount={players.length}
          totalGoals={totalGoals}
          totalAssists={totalAssists}
          averageLineupRating={averageLineupRating}
          playedCount={playedMatches.length}
          winsCount={winsCount}
          latestPlayed={latestPlayed}
        />
      </section>
    </>
  );
}
