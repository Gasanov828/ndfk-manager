import {
  avgSeasonRating,
  type Championship,
  type ChampionshipMatch,
  type ChampionshipSeasonPlayerStat,
  type ChampionshipStandingRow,
  type ChampionshipTeam,
} from "@/lib/championship/types";
import {
  buildChampionshipStandings,
  getChampionshipWinStreak,
} from "@/lib/championship/standings";
import { getPositionGroup } from "@/lib/positionStyles";

export type ChampionshipPlayerRow = {
  rank: number;
  playerId: number;
  name: string;
  photoUrl: string | null;
  position: string;
  teamName: string;
  value: number;
  secondary?: number;
};

export type ChampionshipMvpRow = {
  rank: number;
  playerId: number;
  name: string;
  photoUrl: string | null;
  position: string;
  avgMatchRating: number;
  mvpCount: number;
  matchesPlayed: number;
};

export type ChampionshipStatCard = {
  id: string;
  title: string;
  icon: string;
  value: string;
  subtitle?: string;
};

export type ChampionshipAward = {
  id: string;
  title: string;
  icon: string;
  playerId: number | null;
  playerName: string | null;
  photoUrl: string | null;
  valueLabel: string;
};

export type ChampionshipBundle = {
  championship: Championship;
  teams: ChampionshipTeam[];
  homeClubTeamId: number | null;
  standings: ChampionshipStandingRow[];
  matches: ChampionshipMatch[];
  scorers: ChampionshipPlayerRow[];
  assisters: ChampionshipPlayerRow[];
  mvpBoard: ChampionshipMvpRow[];
  stats: ChampionshipStatCard[];
  awards: ChampionshipAward[];
  schemaMissing?: boolean;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function playerMeta(stat: ChampionshipSeasonPlayerStat) {
  const player = one(stat.player);
  const team = one(stat.team);
  return {
    playerId: stat.player_id,
    name: player?.name ?? `Игрок #${stat.player_id}`,
    photoUrl: player?.photo_url ?? null,
    position: player?.position ?? "",
    teamName: team?.name ?? "—",
  };
}

export function buildChampionshipScorers(
  seasonStats: ChampionshipSeasonPlayerStat[]
): ChampionshipPlayerRow[] {
  return [...seasonStats]
    .filter((row) => row.goals > 0)
    .sort(
      (a, b) =>
        b.goals - a.goals || b.assists - a.assists || b.mvp_count - a.mvp_count
    )
    .map((row, index) => {
      const meta = playerMeta(row);
      return {
        rank: index + 1,
        ...meta,
        value: row.goals,
        secondary: row.assists,
      };
    });
}

export function buildChampionshipAssisters(
  seasonStats: ChampionshipSeasonPlayerStat[]
): ChampionshipPlayerRow[] {
  return [...seasonStats]
    .filter((row) => row.assists > 0)
    .sort(
      (a, b) =>
        b.assists - a.assists || b.goals - a.goals || b.mvp_count - a.mvp_count
    )
    .map((row, index) => {
      const meta = playerMeta(row);
      return {
        rank: index + 1,
        ...meta,
        value: row.assists,
        secondary: row.goals,
      };
    });
}

export function buildChampionshipMvpBoard(
  seasonStats: ChampionshipSeasonPlayerStat[]
): ChampionshipMvpRow[] {
  return [...seasonStats]
    .filter((row) => row.mvp_count > 0 || row.rating_count > 0)
    .sort(
      (a, b) =>
        b.mvp_count - a.mvp_count ||
        avgSeasonRating(b) - avgSeasonRating(a) ||
        b.goals - a.goals
    )
    .map((row, index) => {
      const meta = playerMeta(row);
      return {
        rank: index + 1,
        playerId: meta.playerId,
        name: meta.name,
        photoUrl: meta.photoUrl,
        position: meta.position,
        avgMatchRating: avgSeasonRating(row),
        mvpCount: row.mvp_count,
        matchesPlayed: row.matches_played,
      };
    });
}

export function buildChampionshipStatsCards(params: {
  standings: ChampionshipStandingRow[];
  scorers: ChampionshipPlayerRow[];
  assisters: ChampionshipPlayerRow[];
  mvpBoard: ChampionshipMvpRow[];
  matches: ChampionshipMatch[];
  homeClubTeamId: number | null;
}): ChampionshipStatCard[] {
  const { standings, scorers, assisters, mvpBoard, matches, homeClubTeamId } =
    params;
  const playedStandings = standings.filter((row) => row.played > 0);
  // Без сыгранных матчей никого не выбираем (иначе берётся первая команда по алфавиту)
  const bestAttack = [...playedStandings]
    .filter((row) => row.goalsFor > 0)
    .sort(
      (a, b) =>
        b.goalsFor - a.goalsFor || b.goalDiff - a.goalDiff || b.points - a.points
    )[0];
  const bestDefense = [...playedStandings].sort(
    (a, b) =>
      a.goalsAgainst - b.goalsAgainst ||
      b.goalDiff - a.goalDiff ||
      b.points - a.points
  )[0];
  const streak =
    homeClubTeamId != null
      ? getChampionshipWinStreak(matches, homeClubTeamId)
      : 0;

  return [
    {
      id: "top-scorer",
      title: "Лучший бомбардир",
      icon: "⚽",
      value: scorers[0]?.name ?? "—",
      subtitle: scorers[0] ? `${scorers[0].value} голов` : "Нет данных сезона",
    },
    {
      id: "top-assist",
      title: "Лучший ассистент",
      icon: "🎯",
      value: assisters[0]?.name ?? "—",
      subtitle: assisters[0]
        ? `${assisters[0].value} пасов`
        : "Нет данных сезона",
    },
    {
      id: "best-player",
      title: "Лучший игрок",
      icon: "⭐",
      value: mvpBoard[0]?.name ?? "—",
      subtitle: mvpBoard[0]
        ? `ср. ${mvpBoard[0].avgMatchRating} · MVP ${mvpBoard[0].mvpCount}`
        : "Нет данных сезона",
    },
    {
      id: "best-attack",
      title: "Лучшая атака",
      icon: "🔥",
      value: bestAttack?.teamName ?? "—",
      subtitle: bestAttack
        ? `${bestAttack.goalsFor} забито`
        : "Нет данных сезона",
    },
    {
      id: "best-defense",
      title: "Лучшая защита",
      icon: "🛡️",
      value: bestDefense?.teamName ?? "—",
      subtitle: bestDefense
        ? `${bestDefense.goalsAgainst} пропущено`
        : "Нет данных сезона",
    },
    {
      id: "win-streak",
      title: "Серия побед",
      icon: "💪",
      value: streak > 0 ? String(streak) : "—",
      subtitle:
        streak > 0
          ? "Дженгутай в текущем сезоне"
          : "Нет данных сезона",
    },
  ];
}

export function buildChampionshipAwards(params: {
  scorers: ChampionshipPlayerRow[];
  assisters: ChampionshipPlayerRow[];
  mvpBoard: ChampionshipMvpRow[];
  seasonStats: ChampionshipSeasonPlayerStat[];
}): ChampionshipAward[] {
  const { scorers, assisters, mvpBoard, seasonStats } = params;

  const withPos = (group: "ВРТ" | "ЗАЩ") =>
    [...seasonStats]
      .map((row) => ({ row, player: one(row.player) }))
      .filter(
        (item) =>
          item.player &&
          getPositionGroup(null, item.player.position) === group &&
          item.row.matches_played > 0 &&
          item.row.rating_count > 0
      )
      .sort(
        (a, b) =>
          avgSeasonRating(b.row) - avgSeasonRating(a.row) ||
          b.row.matches_played - a.row.matches_played
      )[0] ?? null;

  const gk = withPos("ВРТ");
  const def = withPos("ЗАЩ");
  const discovery =
    [...seasonStats]
      .filter(
        (row) =>
          row.goals + row.assists <= 2 &&
          row.matches_played > 0 &&
          row.rating_count > 0
      )
      .sort(
        (a, b) =>
          avgSeasonRating(b) - avgSeasonRating(a) ||
          b.matches_played - a.matches_played
      )[0] ?? null;

  const discoveryPlayer = discovery ? one(discovery.player) : null;

  return [
    {
      id: "best-player",
      title: "Лучший игрок чемпионата",
      icon: "🏆",
      playerId: mvpBoard[0]?.playerId ?? scorers[0]?.playerId ?? null,
      playerName: mvpBoard[0]?.name ?? scorers[0]?.name ?? null,
      photoUrl: mvpBoard[0]?.photoUrl ?? scorers[0]?.photoUrl ?? null,
      valueLabel: mvpBoard[0]
        ? `ср. ${mvpBoard[0].avgMatchRating}`
        : scorers[0]
          ? `${scorers[0].value} голов`
          : "Нет данных сезона",
    },
    {
      id: "top-scorer",
      title: "Лучший бомбардир",
      icon: "⚽",
      playerId: scorers[0]?.playerId ?? null,
      playerName: scorers[0]?.name ?? null,
      photoUrl: scorers[0]?.photoUrl ?? null,
      valueLabel: scorers[0]
        ? `${scorers[0].value} голов`
        : "Нет данных сезона",
    },
    {
      id: "top-assist",
      title: "Лучший ассистент",
      icon: "🎯",
      playerId: assisters[0]?.playerId ?? null,
      playerName: assisters[0]?.name ?? null,
      photoUrl: assisters[0]?.photoUrl ?? null,
      valueLabel: assisters[0]
        ? `${assisters[0].value} пасов`
        : "Нет данных сезона",
    },
    {
      id: "best-gk",
      title: "Лучший вратарь",
      icon: "🧤",
      playerId: gk ? gk.row.player_id : null,
      playerName: gk?.player?.name ?? null,
      photoUrl: gk?.player?.photo_url ?? null,
      valueLabel: gk
        ? `ср. ${avgSeasonRating(gk.row)}`
        : "Нет данных сезона",
    },
    {
      id: "best-def",
      title: "Лучший защитник",
      icon: "🛡",
      playerId: def ? def.row.player_id : null,
      playerName: def?.player?.name ?? null,
      photoUrl: def?.player?.photo_url ?? null,
      valueLabel: def
        ? `ср. ${avgSeasonRating(def.row)}`
        : "Нет данных сезона",
    },
    {
      id: "discovery",
      title: "Открытие сезона",
      icon: "⭐",
      playerId: discovery?.player_id ?? null,
      playerName: discoveryPlayer?.name ?? null,
      photoUrl: discoveryPlayer?.photo_url ?? null,
      valueLabel: discovery
        ? `ср. ${avgSeasonRating(discovery) || "—"}`
        : "Нет данных сезона",
    },
  ];
}


function getLatestPlayedMatchForMovement(
  matches: ChampionshipMatch[]
): ChampionshipMatch | null {
  return [...matches]
    .filter(
      (match) =>
        match.is_played &&
        match.home_goals != null &&
        match.away_goals != null
    )
    .sort((a, b) => {
      const byDate = b.match_date.localeCompare(a.match_date);
      if (byDate !== 0) return byDate;
      return b.id - a.id;
    })[0] ?? null;
}

function attachStandingMovement(params: {
  standings: ChampionshipStandingRow[];
  teams: ChampionshipTeam[];
  matches: ChampionshipMatch[];
  homeClubTeamId: number | null;
}): ChampionshipStandingRow[] {
  const { standings, teams, matches, homeClubTeamId } = params;
  const latestPlayed = getLatestPlayedMatchForMovement(matches);
  if (!latestPlayed) return standings;

  const previousStandings = buildChampionshipStandings(
    teams,
    matches.filter((match) => match.id !== latestPlayed.id),
    homeClubTeamId
  );
  const previousPlaceByTeam = new Map(
    previousStandings.map((row, index) => [row.teamId, index + 1])
  );

  return standings.map((row, index) => {
    const currentPlace = index + 1;
    const previousPlace = previousPlaceByTeam.get(row.teamId);
    if (!previousPlace) return row;
    return {
      ...row,
      positionChange: previousPlace - currentPlace,
    };
  });
}export function buildChampionshipBundle(params: {
  championship: Championship;
  teams: ChampionshipTeam[];
  matches: ChampionshipMatch[];
  seasonStats: ChampionshipSeasonPlayerStat[];
  homeClubTeamId: number | null;
}): ChampionshipBundle {
  const { championship, teams, matches, seasonStats, homeClubTeamId } = params;
  const standings = buildChampionshipStandings(
    teams,
    matches,
    homeClubTeamId
  );
  const scorers = buildChampionshipScorers(seasonStats);
  const assisters = buildChampionshipAssisters(seasonStats);
  const mvpBoard = buildChampionshipMvpBoard(seasonStats);

  return {
    championship,
    teams,
    homeClubTeamId,
    standings,
    matches: [...matches].sort((a, b) => {
      const byDate = b.match_date.localeCompare(a.match_date);
      if (byDate !== 0) return byDate;
      return b.id - a.id;
    }),
    scorers,
    assisters,
    mvpBoard,
    stats: buildChampionshipStatsCards({
      standings,
      scorers,
      assisters,
      mvpBoard,
      matches,
      homeClubTeamId,
    }),
    awards: buildChampionshipAwards({
      scorers,
      assisters,
      mvpBoard,
      seasonStats,
    }),
  };
}
