import type { CareerMvpRecord } from "@/lib/careerMvp";
import type { Player } from "@/lib/lineup";
import type { Match } from "@/lib/matches";
import type { MatchHistoryEntry } from "@/lib/matchHistory";
import { getPositionGroup } from "@/lib/positionStyles";
import { TOURNAMENT_HOME_TEAM } from "@/lib/tournament/constants";
import {
  buildTournamentStandings,
  getLongestWinStreak,
  type TournamentStandingRow,
} from "@/lib/tournament/standings";

export type TournamentPlayerRow = {
  rank: number;
  playerId: number;
  name: string;
  photoUrl: string | null;
  position: string;
  teamName: string;
  value: number;
  secondary?: number;
  rating?: number;
};

export type TournamentMvpRow = {
  rank: number;
  playerId: number;
  name: string;
  photoUrl: string | null;
  position: string;
  rating: number;
  avgMatchRating: number;
  mvpCount: number;
  matchesRated: number;
};

export type TournamentAward = {
  id: string;
  title: string;
  icon: string;
  playerId: number | null;
  playerName: string | null;
  photoUrl: string | null;
  valueLabel: string;
};

export type TournamentStatCard = {
  id: string;
  title: string;
  icon: string;
  value: string;
  subtitle?: string;
};

export type TournamentMatchListItem = {
  id: number;
  opponent: string;
  date: string;
  time: string;
  location: string;
  isPlayed: boolean;
  isLive: boolean;
  ndfkGoals: number | null;
  opponentGoals: number | null;
};

export type TournamentBundle = {
  standings: TournamentStandingRow[];
  matches: TournamentMatchListItem[];
  scorers: TournamentPlayerRow[];
  assisters: TournamentPlayerRow[];
  mvpBoard: TournamentMvpRow[];
  stats: TournamentStatCard[];
  awards: TournamentAward[];
};

type RatingAgg = {
  sum: number;
  count: number;
  mvpCount: number;
};

function toMatchItem(match: Match): TournamentMatchListItem {
  return {
    id: match.id,
    opponent: match.opponent,
    date: match.date,
    time: match.time,
    location: match.location,
    isPlayed: Boolean(match.is_played),
    isLive: Boolean(match.is_live),
    ndfkGoals: match.ndfk_goals ?? null,
    opponentGoals: match.opponent_goals ?? null,
  };
}

export function buildTournamentScorers(players: Player[]): TournamentPlayerRow[] {
  return [...players]
    .filter((player) => player.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.rating - a.rating)
    .map((player, index) => ({
      rank: index + 1,
      playerId: player.id,
      name: player.name,
      photoUrl: player.photo_url ?? null,
      position: player.position,
      teamName: TOURNAMENT_HOME_TEAM.shortName,
      value: player.goals,
      secondary: player.assists,
      rating: player.rating,
    }));
}

export function buildTournamentAssisters(
  players: Player[]
): TournamentPlayerRow[] {
  return [...players]
    .filter((player) => player.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || b.rating - a.rating)
    .map((player, index) => ({
      rank: index + 1,
      playerId: player.id,
      name: player.name,
      photoUrl: player.photo_url ?? null,
      position: player.position,
      teamName: TOURNAMENT_HOME_TEAM.shortName,
      value: player.assists,
      secondary: player.goals,
      rating: player.rating,
    }));
}

export function buildTournamentMvpBoard(
  players: Player[],
  ratingRows: { player_id: number; match_rating: number; is_mvp: boolean }[],
  mvpRecords: CareerMvpRecord[]
): TournamentMvpRow[] {
  const agg = new Map<number, RatingAgg>();
  for (const row of ratingRows) {
    const current = agg.get(row.player_id) ?? {
      sum: 0,
      count: 0,
      mvpCount: 0,
    };
    if (row.match_rating > 0) {
      current.sum += Number(row.match_rating) || 0;
      current.count += 1;
    }
    if (row.is_mvp) current.mvpCount += 1;
    agg.set(row.player_id, current);
  }

  // Fallback MVP counts from confirmed records if summary flag missing
  for (const record of mvpRecords) {
    const current = agg.get(record.playerId) ?? {
      sum: 0,
      count: 0,
      mvpCount: 0,
    };
    if (current.mvpCount === 0) {
      // count from records if not already from summaries
    }
    agg.set(record.playerId, current);
  }

  const mvpCountByPlayer = new Map<number, number>();
  for (const record of mvpRecords) {
    mvpCountByPlayer.set(
      record.playerId,
      (mvpCountByPlayer.get(record.playerId) ?? 0) + 1
    );
  }

  return [...agg.entries()]
    .map(([playerId, value]) => {
      const player = players.find((item) => item.id === playerId);
      if (!player || value.count === 0) return null;
      const mvpCount = Math.max(
        value.mvpCount,
        mvpCountByPlayer.get(playerId) ?? 0
      );
      return {
        rank: 0,
        playerId,
        name: player.name,
        photoUrl: player.photo_url ?? null,
        position: player.position,
        rating: player.rating,
        avgMatchRating: Math.round((value.sum / value.count) * 10) / 10,
        mvpCount,
        matchesRated: value.count,
      } satisfies TournamentMvpRow;
    })
    .filter((row): row is TournamentMvpRow => row != null)
    .sort(
      (a, b) =>
        b.mvpCount - a.mvpCount ||
        b.avgMatchRating - a.avgMatchRating ||
        b.rating - a.rating
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function buildTournamentStats(params: {
  players: Player[];
  matches: Match[];
  standings: TournamentStandingRow[];
  scorers: TournamentPlayerRow[];
  assisters: TournamentPlayerRow[];
  mvpBoard: TournamentMvpRow[];
}): TournamentStatCard[] {
  const { players, matches, standings, scorers, assisters, mvpBoard } = params;
  const home = standings.find((row) => row.isHome);
  const bestAttack = [...standings].sort(
    (a, b) => b.goalsFor - a.goalsFor || b.points - a.points
  )[0];
  const bestDefense = [...standings]
    .filter((row) => row.played > 0)
    .sort(
      (a, b) =>
        a.goalsAgainst - b.goalsAgainst || b.points - a.points || b.goalDiff - a.goalDiff
    )[0];

  const topRated = [...players].sort((a, b) => b.rating - a.rating)[0];
  const winStreak = getLongestWinStreak(matches);

  return [
    {
      id: "top-scorer",
      title: "Лучший бомбардир",
      icon: "⚽",
      value: scorers[0]?.name ?? "—",
      subtitle: scorers[0] ? `${scorers[0].value} голов` : undefined,
    },
    {
      id: "top-assist",
      title: "Лучший ассистент",
      icon: "🎯",
      value: assisters[0]?.name ?? "—",
      subtitle: assisters[0] ? `${assisters[0].value} пасов` : undefined,
    },
    {
      id: "best-player",
      title: "Лучший игрок",
      icon: "⭐",
      value: mvpBoard[0]?.name ?? topRated?.name ?? "—",
      subtitle: mvpBoard[0]
        ? `ср. ${mvpBoard[0].avgMatchRating} · MVP ${mvpBoard[0].mvpCount}`
        : topRated
          ? `OVR ${topRated.rating}`
          : undefined,
    },
    {
      id: "best-attack",
      title: "Лучшая атака",
      icon: "🔥",
      value: bestAttack?.teamName ?? "—",
      subtitle: bestAttack ? `${bestAttack.goalsFor} забито` : undefined,
    },
    {
      id: "best-defense",
      title: "Лучшая защита",
      icon: "🛡️",
      value: bestDefense?.teamName ?? "—",
      subtitle: bestDefense
        ? `${bestDefense.goalsAgainst} пропущено`
        : undefined,
    },
    {
      id: "win-streak",
      title: "Серия побед",
      icon: "💪",
      value: String(winStreak),
      subtitle: home
        ? `${TOURNAMENT_HOME_TEAM.shortName} · ${home.points} очков`
        : undefined,
    },
  ];
}

export function buildTournamentAwards(params: {
  players: Player[];
  scorers: TournamentPlayerRow[];
  assisters: TournamentPlayerRow[];
  mvpBoard: TournamentMvpRow[];
}): TournamentAward[] {
  const { players, scorers, assisters, mvpBoard } = params;

  const byGroup = (group: "ВРТ" | "ЗАЩ") =>
    [...players]
      .filter((player) => getPositionGroup(null, player.position) === group)
      .sort((a, b) => b.rating - a.rating)[0] ?? null;

  const gk = byGroup("ВРТ");
  const def = byGroup("ЗАЩ");
  const discovery =
    [...players]
      .filter((player) => player.goals + player.assists <= 2)
      .sort((a, b) => b.rating - a.rating)[0] ?? null;

  const bestOverall =
    mvpBoard[0] != null
      ? {
          id: mvpBoard[0].playerId,
          name: mvpBoard[0].name,
          photo: mvpBoard[0].photoUrl,
          label: `ср. ${mvpBoard[0].avgMatchRating}`,
        }
      : scorers[0]
        ? {
            id: scorers[0].playerId,
            name: scorers[0].name,
            photo: scorers[0].photoUrl,
            label: `${scorers[0].value} голов`,
          }
        : null;

  return [
    {
      id: "best-player",
      title: "Лучший игрок турнира",
      icon: "🏆",
      playerId: bestOverall?.id ?? null,
      playerName: bestOverall?.name ?? null,
      photoUrl: bestOverall?.photo ?? null,
      valueLabel: bestOverall?.label ?? "Пока нет данных",
    },
    {
      id: "top-scorer",
      title: "Лучший бомбардир",
      icon: "⚽",
      playerId: scorers[0]?.playerId ?? null,
      playerName: scorers[0]?.name ?? null,
      photoUrl: scorers[0]?.photoUrl ?? null,
      valueLabel: scorers[0] ? `${scorers[0].value} голов` : "Пока нет данных",
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
        : "Пока нет данных",
    },
    {
      id: "best-gk",
      title: "Лучший вратарь",
      icon: "🧤",
      playerId: gk?.id ?? null,
      playerName: gk?.name ?? null,
      photoUrl: gk?.photo_url ?? null,
      valueLabel: gk ? `OVR ${gk.rating}` : "Пока нет данных",
    },
    {
      id: "best-def",
      title: "Лучший защитник",
      icon: "🛡",
      playerId: def?.id ?? null,
      playerName: def?.name ?? null,
      photoUrl: def?.photo_url ?? null,
      valueLabel: def ? `OVR ${def.rating}` : "Пока нет данных",
    },
    {
      id: "discovery",
      title: "Открытие сезона",
      icon: "⭐",
      playerId: discovery?.id ?? null,
      playerName: discovery?.name ?? null,
      photoUrl: discovery?.photo_url ?? null,
      valueLabel: discovery ? `OVR ${discovery.rating}` : "Пока нет данных",
    },
  ];
}

export function buildTournamentBundle(params: {
  players: Player[];
  matches: Match[];
  history: MatchHistoryEntry[];
  ratingRows: { player_id: number; match_rating: number; is_mvp: boolean }[];
  mvpRecords: CareerMvpRecord[];
}): TournamentBundle {
  const { players, matches, ratingRows, mvpRecords } = params;
  const standings = buildTournamentStandings(matches);
  const scorers = buildTournamentScorers(players);
  const assisters = buildTournamentAssisters(players);
  const mvpBoard = buildTournamentMvpBoard(players, ratingRows, mvpRecords);
  const matchItems = [...matches]
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return b.time.localeCompare(a.time);
    })
    .map(toMatchItem);

  return {
    standings,
    matches: matchItems,
    scorers,
    assisters,
    mvpBoard,
    stats: buildTournamentStats({
      players,
      matches,
      standings,
      scorers,
      assisters,
      mvpBoard,
    }),
    awards: buildTournamentAwards({
      players,
      scorers,
      assisters,
      mvpBoard,
    }),
  };
}
