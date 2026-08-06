import {
  buildFormRatingsFromRows,
  buildPlayerHomeAchievements,
  getUpcomingMatchesList,
  type FormRatingPoint,
  type PlayerHomeAchievement,
  type RatingSummaryRow,
} from "@/lib/playerHomeDashboard";
import type { Match } from "@/lib/matches";
import {
  enrichMatchMvpInfo,
  getMatchMvpFromSummaries,
  isVotingDeadlinePassed,
  type MatchMvpInfo,
  type RatingVotingMatch,
} from "@/lib/matchRatings";
import type { MatchPlayerStat } from "@/lib/matchHistory";
import type { PlayerWelcomeData } from "@/lib/playerStats";
import {
  buildPersonalMvpFromTeamData,
  buildPlayerWelcomeFromTeamData,
} from "@/lib/server/playerWelcome";
import type { TeamPageData } from "@/lib/server/teamData";
import type { UserProfile } from "@/lib/auth";
import {
  formatReputationRows,
  type ReputationRow,
} from "@/lib/playerReactions";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

export type PlayerHomeDashboardPayload = {
  playerWelcome: PlayerWelcomeData;
  formRatings: FormRatingPoint[];
  playedMatchesCount: number;
  reputation: ReputationRow[];
  achievements: PlayerHomeAchievement[];
  latestMatchRating: number | null;
  matchMvp: MatchMvpInfo | null;
  personalMvp: MatchMvpInfo | null;
  votingMatch: RatingVotingMatch | null;
  latestMatchStats: MatchPlayerStat[];
  upcomingMatches: Match[];
};

async function fetchPlayerRatingRows(playerId: number): Promise<RatingSummaryRow[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("match_player_rating_summary")
    .select(
      "match_id, match_rating, vote_count, is_mvp, rating_before, rating_after, match:matches(opponent, date, time, is_played, rating_voting_ends_at)"
    )
    .eq("player_id", playerId);

  if (error) {
    console.error("fetchPlayerRatingRows failed", error.message);
    return [];
  }

  return (data ?? []) as RatingSummaryRow[];
}

async function fetchPlayerReactionTotals(
  playerId: number
): Promise<ReputationRow[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("player_reaction_totals")
    .select("reaction_code, count")
    .eq("player_id", playerId);

  if (error) {
    console.error("fetchPlayerReactionTotals failed", error.message);
    return [];
  }

  return formatReputationRows(data ?? []);
}

async function fetchLatestMatchStats(matchId: number): Promise<MatchPlayerStat[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("match_player_stats")
    .select(
      "id, match_id, player_id, goals, assists, saves, player:players(id, name, position, rating)"
    )
    .eq("match_id", matchId);

  if (error) {
    console.error("fetchLatestMatchStats failed", error.message);
    return [];
  }

  return (data ?? []) as unknown as MatchPlayerStat[];
}

function resolveVotingMatch(
  latestPlayed: Match | null,
  liveMatch: Match | null
): RatingVotingMatch | null {
  const candidate = liveMatch ?? latestPlayed;
  if (!candidate || !candidate.is_played) return null;
  if (isVotingDeadlinePassed(candidate)) return null;
  return candidate;
}

export async function getPlayerHomeDashboardPayload(
  profile: UserProfile,
  teamData: TeamPageData
): Promise<PlayerHomeDashboardPayload | null> {
  const playerWelcome = buildPlayerWelcomeFromTeamData(profile, teamData);
  if (!playerWelcome || !profile.player_id) return null;

  const { players, matches, latestPlayed, summaries } = teamData;
  const liveMatch = matches.find((match) => match.is_live) ?? null;

  const [ratingRows, reputation] = await Promise.all([
    fetchPlayerRatingRows(profile.player_id),
    fetchPlayerReactionTotals(profile.player_id),
  ]);
  const formRatings = buildFormRatingsFromRows(ratingRows, 6);
  const playedMatchesCount = formRatings.length;
  const latestMatchRating =
    formRatings.length > 0 ? formRatings[formRatings.length - 1].rating : null;

  let matchMvp: MatchMvpInfo | null = null;
  if (latestPlayed && summaries.length > 0 && !liveMatch) {
    matchMvp = getMatchMvpFromSummaries(
      summaries,
      players.map((player) => ({ id: player.id, name: player.name })),
      latestPlayed
    );
  }

  if (matchMvp && latestPlayed) {
    const mvpPlayer = players.find((player) => player.id === matchMvp!.playerId);
    const stats = await fetchLatestMatchStats(latestPlayed.id);
    const mvpStat = stats.find((row) => row.player_id === matchMvp!.playerId);
    matchMvp = enrichMatchMvpInfo(matchMvp, {
      photoUrl: mvpPlayer?.photo_url ?? null,
      matchGoals: mvpStat?.goals ?? null,
      matchAssists: mvpStat?.assists ?? null,
    });
  }

  let personalMvp = buildPersonalMvpFromTeamData(profile, teamData);
  if (personalMvp && matchMvp && personalMvp.playerId === matchMvp.playerId) {
    personalMvp = enrichMatchMvpInfo(personalMvp, {
      photoUrl: matchMvp.photoUrl,
      matchGoals: matchMvp.matchGoals,
      matchAssists: matchMvp.matchAssists,
    });
  }

  const achievements = buildPlayerHomeAchievements({
    welcome: playerWelcome,
    formRatings,
    personalMvp,
    playedMatchesCount,
  });

  const latestMatchStats = latestPlayed
    ? await fetchLatestMatchStats(latestPlayed.id)
    : [];

  return {
    playerWelcome,
    formRatings,
    playedMatchesCount,
    reputation,
    achievements,
    latestMatchRating,
    matchMvp: personalMvp?.isConfirmedMvp ? null : matchMvp,
    personalMvp,
    votingMatch: resolveVotingMatch(latestPlayed, liveMatch),
    latestMatchStats,
    upcomingMatches: getUpcomingMatchesList(matches, 4),
  };
}
