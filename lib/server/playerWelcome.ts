import type { UserProfile } from "@/lib/auth";
import { formatMatchDate } from "@/lib/matches";
import {
  buildPlayerWelcomeData,
  type PlayerWelcomeData,
} from "@/lib/playerStats";
import {
  enrichMatchMvpInfo,
  getMatchMvpFromSummaries,
  type MatchMvpInfo,
} from "@/lib/matchRatings";
import { getTeamPageData, type TeamPageData } from "@/lib/server/teamData";

export function buildPlayerWelcomeFromTeamData(
  profile: UserProfile | null,
  teamData: TeamPageData
): PlayerWelcomeData | null {
  if (!profile?.player_id || profile.role === "admin") {
    return null;
  }

  const me = teamData.players.find((player) => player.id === profile.player_id);

  if (!me) {
    return null;
  }

  const lastMatchLabel = teamData.latestPlayed
    ? `vs ${teamData.latestPlayed.opponent} · ${formatMatchDate(teamData.latestPlayed.date)}`
    : null;

  const summary = teamData.ratingSummaryMap[profile.player_id];
  const matchVoteScore =
    summary && summary.vote_count > 0
      ? Number(summary.match_rating)
      : null;

  return buildPlayerWelcomeData(
    me,
    teamData.players,
    summary?.rating_delta,
    lastMatchLabel,
    matchVoteScore
  );
}

export function buildPersonalMvpFromTeamData(
  profile: UserProfile | null,
  teamData: TeamPageData
): MatchMvpInfo | null {
  if (!profile?.player_id || profile.role === "admin") {
    return null;
  }

  if (!teamData.latestPlayed || teamData.summaries.length === 0) {
    return null;
  }

  const matchMvp = getMatchMvpFromSummaries(
    teamData.summaries,
    teamData.players.map((player) => ({ id: player.id, name: player.name })),
    teamData.latestPlayed
  );

  if (!matchMvp || matchMvp.playerId !== profile.player_id || !matchMvp.isConfirmedMvp) {
    return null;
  }

  const me = teamData.players.find((player) => player.id === matchMvp.playerId);

  return enrichMatchMvpInfo(matchMvp, {
    photoUrl: me?.photo_url ?? null,
  });
}

export async function getPlayerWelcomeForProfile(
  profile: UserProfile | null
): Promise<{
  welcome: PlayerWelcomeData | null;
  personalMvp: MatchMvpInfo | null;
}> {
  if (!profile?.player_id || profile.role === "admin") {
    return { welcome: null, personalMvp: null };
  }

  const teamData = await getTeamPageData();
  const welcome = buildPlayerWelcomeFromTeamData(profile, teamData);
  let personalMvp = buildPersonalMvpFromTeamData(profile, teamData);

  if (personalMvp && teamData.latestPlayed) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: mvpStat } = await supabase
      .from("match_player_stats")
      .select("goals, assists")
      .eq("match_id", teamData.latestPlayed.id)
      .eq("player_id", personalMvp.playerId)
      .maybeSingle();

    personalMvp = enrichMatchMvpInfo(personalMvp, {
      matchGoals: mvpStat?.goals ?? null,
      matchAssists: mvpStat?.assists ?? null,
    });
  }

  return { welcome, personalMvp };
}
