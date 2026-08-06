import { sortMatchesByDate, type Match } from "@/lib/matches";
import {
  TOURNAMENT_HOME_TEAM,
  TOURNAMENT_HOME_TEAM_ID,
} from "@/lib/tournament/constants";

export type TournamentStandingRow = {
  teamId: string;
  teamName: string;
  isHome: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

function emptyRow(
  teamId: string,
  teamName: string,
  isHome: boolean
): TournamentStandingRow {
  return {
    teamId,
    teamName,
    isHome,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
  };
}

function applyResult(
  row: TournamentStandingRow,
  scored: number,
  conceded: number
) {
  row.played += 1;
  row.goalsFor += scored;
  row.goalsAgainst += conceded;
  row.goalDiff = row.goalsFor - row.goalsAgainst;
  if (scored > conceded) {
    row.won += 1;
    row.points += 3;
  } else if (scored < conceded) {
    row.lost += 1;
  } else {
    row.drawn += 1;
    row.points += 1;
  }
}

/**
 * Турнирная таблица из существующих матчей:
 * НДФК + каждый соперник как отдельная команда.
 */
export function buildTournamentStandings(
  matches: Match[]
): TournamentStandingRow[] {
  const map = new Map<string, TournamentStandingRow>();
  map.set(
    TOURNAMENT_HOME_TEAM_ID,
    emptyRow(TOURNAMENT_HOME_TEAM_ID, TOURNAMENT_HOME_TEAM.name, true)
  );

  const played = sortMatchesByDate(matches).filter(
    (match) =>
      match.is_played &&
      match.ndfk_goals != null &&
      match.opponent_goals != null
  );

  for (const match of played) {
    const opponentKey = `opp:${match.opponent.trim().toLowerCase()}`;
    if (!map.has(opponentKey)) {
      map.set(opponentKey, emptyRow(opponentKey, match.opponent.trim(), false));
    }

    const home = map.get(TOURNAMENT_HOME_TEAM_ID)!;
    const away = map.get(opponentKey)!;
    const gf = Number(match.ndfk_goals) || 0;
    const ga = Number(match.opponent_goals) || 0;
    applyResult(home, gf, ga);
    applyResult(away, ga, gf);
  }

  return [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName, "ru");
  });
}

export function getLongestWinStreak(matches: Match[]): number {
  const played = sortMatchesByDate(matches)
    .filter(
      (match) =>
        match.is_played &&
        match.ndfk_goals != null &&
        match.opponent_goals != null
    )
    .reverse(); // chronological oldest → newest

  let best = 0;
  let current = 0;
  for (const match of played) {
    if ((match.ndfk_goals ?? 0) > (match.opponent_goals ?? 0)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}
