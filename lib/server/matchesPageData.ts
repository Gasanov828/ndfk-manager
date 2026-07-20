import { getMatchDateTime } from "@/lib/matchCountdown";

import type { Match } from "@/lib/matches";

import {

  getLiveMatch,

  getNextUpcomingMatch,

  isMatchInProgress,

} from "@/lib/matchStatus";

import type { TeamReadiness } from "@/components/MatchesSchedule";



export function getTeamReadiness(

  players: { status: string; lineup_position: string | null }[]

): TeamReadiness {

  return {

    ready: players.filter((p) => p.status === "ready").length,

    maybe: players.filter((p) => p.status === "maybe").length,

    absent: players.filter((p) => p.status === "absent").length,

    onField: players.filter((p) => p.lineup_position).length,

  };

}



export function getUpcomingMatchesList(matches: Match[]): Match[] {

  return matches

    .filter((match) => !match.is_played && !isMatchInProgress(match))

    .sort((a, b) => {

      const dateA = getMatchDateTime(a)?.getTime() ?? 0;

      const dateB = getMatchDateTime(b)?.getTime() ?? 0;

      return dateA - dateB;

    });

}



export function buildMatchesPageModel(

  matches: Match[],

  players: { status: string; lineup_position: string | null }[]

) {

  const liveMatch = getLiveMatch(matches);

  const upcomingMatch = getNextUpcomingMatch(matches);

  const upcomingMatches = getUpcomingMatchesList(matches);

  const readiness = getTeamReadiness(players);



  return {

    liveMatch,

    upcomingMatch,

    upcomingMatches,

    readiness,

  };

}

