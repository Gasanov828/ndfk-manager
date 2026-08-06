import type {
  ChampionshipMatch,
  ChampionshipStandingRow,
  ChampionshipTeam,
} from "@/lib/championship/types";

function oneTeam(
  team: ChampionshipTeam | ChampionshipTeam[] | null | undefined
): ChampionshipTeam | null {
  if (!team) return null;
  return Array.isArray(team) ? team[0] ?? null : team;
}

function emptyStanding(
  team: ChampionshipTeam,
  homeClubTeamId: number | null
): ChampionshipStandingRow {
  return {
    teamId: team.id,
    teamName: team.name,
    primaryColor: team.primary_color,
    isHomeClub: homeClubTeamId != null && team.id === homeClubTeamId,
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

function apply(
  row: ChampionshipStandingRow,
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

export function buildChampionshipStandings(
  teams: ChampionshipTeam[],
  matches: ChampionshipMatch[],
  homeClubTeamId: number | null
): ChampionshipStandingRow[] {
  const teamsById = new Map<number, ChampionshipTeam>();

  for (const team of teams) {
    teamsById.set(team.id, team);
  }

  for (const match of matches) {
    const home = oneTeam(match.home_team);
    const away = oneTeam(match.away_team);
    if (home) teamsById.set(home.id, home);
    if (away) teamsById.set(away.id, away);
  }

  const map = new Map<number, ChampionshipStandingRow>();
  for (const team of teamsById.values()) {
    map.set(team.id, emptyStanding(team, homeClubTeamId));
  }

  for (const match of matches) {
    if (
      !match.is_played ||
      match.home_goals == null ||
      match.away_goals == null
    ) {
      continue;
    }
    const home = map.get(match.home_team_id);
    const away = map.get(match.away_team_id);
    if (!home || !away) continue;
    apply(home, Number(match.home_goals), Number(match.away_goals));
    apply(away, Number(match.away_goals), Number(match.home_goals));
  }

  return [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName, "ru");
  });
}

export function getChampionshipWinStreak(
  matches: ChampionshipMatch[],
  homeClubTeamId: number
): number {
  const played = [...matches]
    .filter(
      (match) =>
        match.is_played &&
        match.home_goals != null &&
        match.away_goals != null &&
        (match.home_team_id === homeClubTeamId ||
          match.away_team_id === homeClubTeamId)
    )
    .sort((a, b) => {
      const byDate = a.match_date.localeCompare(b.match_date);
      if (byDate !== 0) return byDate;
      return a.id - b.id;
    });

  let best = 0;
  let current = 0;
  for (const match of played) {
    const isHome = match.home_team_id === homeClubTeamId;
    const scored = isHome ? Number(match.home_goals) : Number(match.away_goals);
    const conceded = isHome
      ? Number(match.away_goals)
      : Number(match.home_goals);
    if (scored > conceded) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}
