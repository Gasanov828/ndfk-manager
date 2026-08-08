import type { ChampionshipBundle } from "@/lib/championship/build";
import { avgSeasonRating } from "@/lib/championship/types";
import type {
  ChampionshipMatch,
  ChampionshipRound,
  ChampionshipSeasonPlayerStat,
  ChampionshipStandingRow,
} from "@/lib/championship/types";

export type HomeStandingSlice = ChampionshipStandingRow & { place: number };

export type HomeChampGoalLine = {
  playerId: number;
  name: string;
  count: number;
};

export type HomeChampionshipDashboardData = {
  championshipName: string;
  season: string;
  standingsSlice: HomeStandingSlice[];
  ourPlace: number | null;
  lastMatch: {
    homeName: string;
    awayName: string;
    homeGoals: number | null;
    awayGoals: number | null;
    isPlayed: boolean;
    date: string;
    result: "W" | "D" | "L" | null;
    resultLabel: string;
    scorers: HomeChampGoalLine[];
    assisters: HomeChampGoalLine[];
  } | null;
  nextMatch: {
    ourName: string;
    opponent: string;
    date: string;
    time: string;
    location: string;
    isHome: boolean;
  } | null;
  progress: {
    currentRound: number;
    totalRounds: number;
    percent: number;
  };
  leader: {
    playerId: number;
    name: string;
    photoUrl: string | null;
    avgRating: number;
    goals: number;
    assists: number;
  } | null;
  form: Array<"W" | "D" | "L">;
};

function oneTeam(
  team: { name: string } | { name: string }[] | null | undefined
): string {
  if (!team) return "Команда";
  return Array.isArray(team) ? team[0]?.name ?? "Команда" : team.name;
}

function playerName(
  player: { name: string } | { name: string }[] | null | undefined,
  playerId: number
): string {
  if (!player) return `Игрок #${playerId}`;
  return Array.isArray(player)
    ? player[0]?.name ?? `Игрок #${playerId}`
    : player.name;
}

function ourResult(
  match: ChampionshipMatch,
  homeClubTeamId: number
): "W" | "D" | "L" | null {
  if (
    !match.is_played ||
    match.home_goals == null ||
    match.away_goals == null
  ) {
    return null;
  }
  const isHome = match.home_team_id === homeClubTeamId;
  const scored = isHome ? Number(match.home_goals) : Number(match.away_goals);
  const conceded = isHome ? Number(match.away_goals) : Number(match.home_goals);
  if (scored > conceded) return "W";
  if (scored < conceded) return "L";
  return "D";
}

export function buildStandingsWindow(
  standings: ChampionshipStandingRow[]
): { slice: HomeStandingSlice[]; ourPlace: number | null } {
  const withPlace = standings.map((row, index) => ({
    ...row,
    place: index + 1,
  }));
  const ourIndex = withPlace.findIndex((row) => row.isHomeClub);
  if (ourIndex < 0) {
    return {
      slice: withPlace.slice(0, Math.min(3, withPlace.length)),
      ourPlace: null,
    };
  }

  // 1-е место → топ-3; последнее → три снизу; иначе ±1 вокруг нас
  if (ourIndex === 0) {
    return {
      slice: withPlace.slice(0, Math.min(3, withPlace.length)),
      ourPlace: 1,
    };
  }
  if (ourIndex === withPlace.length - 1) {
    const start = Math.max(0, withPlace.length - 3);
    return {
      slice: withPlace.slice(start),
      ourPlace: ourIndex + 1,
    };
  }

  return {
    slice: withPlace.slice(ourIndex - 1, ourIndex + 2),
    ourPlace: ourIndex + 1,
  };
}

function estimateTotalRounds(teamCount: number): number {
  return Math.max(1, teamCount - 1);
}

function buildRoundNumberById(
  rounds: Pick<ChampionshipRound, "id" | "round_number">[]
): Map<number, number> {
  return new Map(rounds.map((round) => [round.id, round.round_number]));
}

/** Сколько туров реально завершено (без двойного счёта тестовых матчей). */
function countCompletedTours(
  ourMatches: ChampionshipMatch[],
  rounds: Pick<ChampionshipRound, "id" | "round_number" | "status">[],
  roundNumberById: Map<number, number>
): number {
  const finishedFromTable = rounds.filter(
    (round) => round.status === "finished"
  ).length;
  if (finishedFromTable > 0) return finishedFromTable;

  const playedRoundNumbers = new Set<number>();
  for (const match of ourMatches) {
    if (!match.is_played) continue;
    const roundId = match.round_id;
    if (roundId != null && roundNumberById.has(roundId)) {
      playedRoundNumbers.add(roundNumberById.get(roundId)!);
    }
  }
  if (playedRoundNumbers.size > 0) return playedRoundNumbers.size;

  return ourMatches.some((match) => match.is_played) ? 1 : 0;
}

export function pickChampionshipTeamLeader(
  seasonStats: ChampionshipSeasonPlayerStat[],
  homeClubTeamId: number | null
): HomeChampionshipDashboardData["leader"] {
  const pool = seasonStats.filter((row) => {
    if (homeClubTeamId == null) return true;
    return Number(row.team_id) === homeClubTeamId;
  });

  const ranked = [...pool]
    .filter(
      (row) => row.matches_played > 0 || row.goals > 0 || row.assists > 0
    )
    .sort((a, b) => {
      const ra = avgSeasonRating(a);
      const rb = avgSeasonRating(b);
      return (
        rb - ra ||
        b.goals + b.assists - (a.goals + a.assists) ||
        b.mvp_count - a.mvp_count
      );
    });

  const top = ranked[0];
  if (!top) return null;
  const player = Array.isArray(top.player) ? top.player[0] : top.player;
  return {
    playerId: top.player_id,
    name: player?.name ?? `Игрок #${top.player_id}`,
    photoUrl: player?.photo_url ?? null,
    avgRating: avgSeasonRating(top),
    goals: top.goals,
    assists: top.assists,
  };
}

export function buildHomeChampionshipDashboard(params: {
  bundle: ChampionshipBundle;
  lastMatchLines?: Array<{
    player_id: number;
    goals: number;
    assists: number;
    player?: { id: number; name: string } | { name: string }[] | null;
  }>;
  roundsCount?: number;
  rounds?: Pick<ChampionshipRound, "id" | "round_number" | "status">[];
  seasonStats?: ChampionshipSeasonPlayerStat[];
}): HomeChampionshipDashboardData {
  const {
    bundle,
    lastMatchLines = [],
    roundsCount,
    rounds = [],
    seasonStats,
  } = params;
  const homeId = bundle.homeClubTeamId;
  const { slice, ourPlace } = buildStandingsWindow(bundle.standings);

  const ourMatches = homeId
    ? bundle.matches.filter(
        (m) => m.home_team_id === homeId || m.away_team_id === homeId
      )
    : bundle.matches;

  const played = [...ourMatches]
    .filter((m) => m.is_played)
    .sort((a, b) => {
      const byDate = b.match_date.localeCompare(a.match_date);
      if (byDate !== 0) return byDate;
      return b.id - a.id;
    });

  const upcoming = [...ourMatches]
    .filter((m) => !m.is_played)
    .sort((a, b) => {
      const byDate = a.match_date.localeCompare(b.match_date);
      if (byDate !== 0) return byDate;
      return a.id - b.id;
    });

  const last = played[0] ?? null;
  let lastMatch: HomeChampionshipDashboardData["lastMatch"] = null;

  if (last && homeId) {
    const result = ourResult(last, homeId);
    lastMatch = {
      homeName: oneTeam(last.home_team),
      awayName: oneTeam(last.away_team),
      homeGoals: last.home_goals,
      awayGoals: last.away_goals,
      isPlayed: true,
      date: last.match_date,
      result,
      resultLabel:
        result === "W"
          ? "Победа"
          : result === "D"
            ? "Ничья"
            : result === "L"
              ? "Поражение"
              : "—",
      scorers: lastMatchLines
        .filter((row) => Number(row.goals) > 0)
        .map((row) => ({
          playerId: Number(row.player_id),
          name: playerName(row.player, Number(row.player_id)),
          count: Number(row.goals),
        }))
        .sort((a, b) => b.count - a.count),
      assisters: lastMatchLines
        .filter((row) => Number(row.assists) > 0)
        .map((row) => ({
          playerId: Number(row.player_id),
          name: playerName(row.player, Number(row.player_id)),
          count: Number(row.assists),
        }))
        .sort((a, b) => b.count - a.count),
    };
  } else if (!last) {
    lastMatch = {
      homeName: "—",
      awayName: "—",
      homeGoals: null,
      awayGoals: null,
      isPlayed: false,
      date: "",
      result: null,
      resultLabel: "Не сыгран",
      scorers: [],
      assisters: [],
    };
  }

  const next = upcoming[0] ?? null;
  let nextMatch: HomeChampionshipDashboardData["nextMatch"] = null;
  if (next && homeId) {
    const isHome = next.home_team_id === homeId;
    const ourName = isHome
      ? oneTeam(next.home_team)
      : oneTeam(next.away_team);
    nextMatch = {
      ourName,
      opponent: isHome ? oneTeam(next.away_team) : oneTeam(next.home_team),
      date: next.match_date,
      time: next.match_time,
      location: next.location ?? "",
      isHome,
    };
  }

  const totalRounds =
    roundsCount && roundsCount > 0
      ? roundsCount
      : rounds.length > 0
        ? Math.max(...rounds.map((round) => round.round_number))
        : estimateTotalRounds(bundle.teams.length);

  const roundNumberById = buildRoundNumberById(rounds);
  const completedTours = countCompletedTours(
    ourMatches,
    rounds,
    roundNumberById
  );
  // Показываем завершённые туры, не «следующий» — после 1-го тура остаётся 1/6, не 2/6
  const currentRound =
    completedTours === 0 ? 1 : Math.min(completedTours, totalRounds);

  const form: Array<"W" | "D" | "L"> = [];
  if (homeId) {
    for (const match of [...played].reverse().slice(-5)) {
      const r = ourResult(match, homeId);
      if (r) form.push(r);
    }
  }

  return {
    championshipName: bundle.championship.name,
    season: bundle.championship.season,
    standingsSlice: slice,
    ourPlace,
    lastMatch,
    nextMatch,
    progress: {
      currentRound,
      totalRounds,
      percent:
        totalRounds > 0
          ? Math.min(
              100,
              Math.round((completedTours / totalRounds) * 100)
            )
          : 0,
    },
    leader: pickChampionshipTeamLeader(
      seasonStats ?? [],
      homeId
    ),
    form,
  };
}
