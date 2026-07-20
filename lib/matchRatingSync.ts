import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateVotes,
  isVotingDeadlinePassed,
  type MatchRatingVote,
} from "@/lib/matchRatings";
import {
  computeMatchMaxStats,
  computeMatchPlayerRatingAfter,
  hasMatchStatActivity,
  shouldApplyMatchRatings,
} from "@/lib/matchPlayerRating";
import {
  filterParticipatingPlayerIds,
  filterVotesByParticipants,
  filterVotesByRatingVoters,
  getMatchRatingVoterIds,
} from "@/lib/matchParticipation";
import { supabase } from "@/lib/supabase";

function pickMvpPlayerId(
  aggregated: ReturnType<typeof aggregateVotes>
): number | null {
  if (aggregated.length === 0) return null;

  let mvpPlayerId: number | null = null;
  let topRating = -1;

  for (const row of aggregated) {
    if (row.match_rating > topRating) {
      topRating = row.match_rating;
      mvpPlayerId = row.player_id;
    } else if (row.match_rating === topRating && mvpPlayerId !== null) {
      const currentMvp = aggregated.find((item) => item.player_id === mvpPlayerId);
      if (currentMvp && row.vote_count > currentMvp.vote_count) {
        mvpPlayerId = row.player_id;
      }
    }
  }

  return mvpPlayerId;
}

export async function getMatchParticipantIds(
  matchId: number,
  db: SupabaseClient = supabase
): Promise<number[]> {
  const { data: allPlayers } = await db.from("players").select("id").order("name");
  const allIds = (allPlayers ?? []).map((row) => row.id);

  const { data: participation, error } = await db
    .from("match_player_participation")
    .select("player_id, participated")
    .eq("match_id", matchId);

  if (error?.message.includes("match_player_participation")) {
    return allIds;
  }

  return filterParticipatingPlayerIds(allIds, participation ?? []);
}

async function loadRatingBeforeMap(
  matchId: number,
  db: SupabaseClient
): Promise<Record<number, number>> {
  const { data: oldSummaries } = await db
    .from("match_player_rating_summary")
    .select("player_id, rating_before")
    .eq("match_id", matchId);

  const map: Record<number, number> = {};

  for (const row of oldSummaries ?? []) {
    if (row.rating_before != null) {
      map[row.player_id] = Number(row.rating_before);
    }
  }

  return map;
}

async function resolveRatingBefore(
  playerId: number,
  ratingBeforeMap: Record<number, number>,
  db: SupabaseClient
): Promise<number> {
  if (ratingBeforeMap[playerId] != null) {
    return ratingBeforeMap[playerId];
  }

  const { data: player } = await db
    .from("players")
    .select("rating")
    .eq("id", playerId)
    .single();

  return Number(player?.rating ?? 70);
}

async function loadMatchStatsMap(
  matchId: number,
  db: SupabaseClient
): Promise<Record<number, { goals: number; assists: number; saves: number }>> {
  const { data, error } = await db
    .from("match_player_stats")
    .select("player_id, goals, assists, saves")
    .eq("match_id", matchId);

  if (error) return {};

  const map: Record<number, { goals: number; assists: number; saves: number }> =
    {};

  for (const row of data ?? []) {
    map[row.player_id] = {
      goals: row.goals ?? 0,
      assists: row.assists ?? 0,
      saves: row.saves ?? 0,
    };
  }

  return map;
}

export async function recalculateMatchRatings(
  matchId: number,
  db: SupabaseClient = supabase
): Promise<{
  teamVotingComplete: boolean;
  ratingsApplied: boolean;
  votingClosed: boolean;
  finalizedByDeadline?: boolean;
}> {
  const { data: matchRow } = await db
    .from("matches")
    .select("id, date, time, is_played, rating_voting_ends_at")
    .eq("id", matchId)
    .single();

  const participantIds = await getMatchParticipantIds(matchId, db);

  const { data: participation } = await db
    .from("match_player_participation")
    .select("player_id, participated, skipped_rating_vote")
    .eq("match_id", matchId);

  const ratingVoterIds = getMatchRatingVoterIds(
    participantIds,
    participation ?? []
  );

  const { data: votes, error } = await db
    .from("match_player_rating_votes")
    .select("voter_player_id, rated_player_id, stars")
    .eq("match_id", matchId);

  if (error) throw error;

  const voteRows = (votes ?? []) as MatchRatingVote[];
  const validVotes = filterVotesByRatingVoters(
    filterVotesByParticipants(voteRows, participantIds),
    participantIds,
    ratingVoterIds
  );

  const matchStatsMap = await loadMatchStatsMap(matchId, db);
  const hasStatActivity = participantIds.some((playerId) =>
    hasMatchStatActivity(matchStatsMap[playerId] ?? { goals: 0, assists: 0, saves: 0 })
  );
  const shouldApply = shouldApplyMatchRatings({
    isPlayed: Boolean(matchRow?.is_played),
    voteCount: validVotes.length,
    hasStatActivity,
  });
  const deadlinePassed = matchRow ? isVotingDeadlinePassed(matchRow) : false;
  const votingClosed = deadlinePassed;

  if (!shouldApply) {
    await revertOverallRatingsForMatch(matchId, db);
    await db.from("match_player_rating_summary").delete().eq("match_id", matchId);

    return {
      teamVotingComplete: false,
      ratingsApplied: false,
      votingClosed,
      finalizedByDeadline: false,
    };
  }

  const ratingBeforeMap = await loadRatingBeforeMap(matchId, db);
  await revertOverallRatingsForMatch(matchId, db);
  await db.from("match_player_rating_summary").delete().eq("match_id", matchId);

  const aggregatedBase = aggregateVotes(validVotes);
  const aggregatedMap = new Map(
    aggregatedBase.map((row) => [row.player_id, row])
  );
  const mvpPlayerId = pickMvpPlayerId(aggregatedBase);
  const confirmMvp = deadlinePassed && mvpPlayerId !== null;
  const { maxGoals, maxAssists } = computeMatchMaxStats(
    matchStatsMap,
    participantIds
  );

  const rowsWithRatings = await Promise.all(
    participantIds.map(async (playerId) => {
      const aggregated = aggregatedMap.get(playerId);
      const stats = matchStatsMap[playerId] ?? { goals: 0, assists: 0, saves: 0 };
      const ratingBefore = await resolveRatingBefore(
        playerId,
        ratingBeforeMap,
        db
      );
      const isMvp = confirmMvp && playerId === mvpPlayerId;
      const avgStars = aggregated?.avg_stars ?? null;
      const voteCount = aggregated?.vote_count ?? 0;
      const matchRating = aggregated?.match_rating ?? 0;
      const ratingAfter = computeMatchPlayerRatingAfter({
        ratingBefore,
        avgStars,
        voteCount,
        isMvp,
        goals: stats.goals,
        assists: stats.assists,
        saves: stats.saves,
        maxGoalsInMatch: maxGoals,
        maxAssistsInMatch: maxAssists,
      });

      return {
        match_id: matchId,
        player_id: playerId,
        avg_stars: avgStars ?? 0,
        match_rating: matchRating,
        vote_count: voteCount,
        is_mvp: isMvp,
        rating_before: ratingBefore,
        rating_after: ratingAfter,
      };
    })
  );

  const { error: insertError } = await db
    .from("match_player_rating_summary")
    .insert(rowsWithRatings);

  if (insertError) throw insertError;

  for (const row of rowsWithRatings) {
    const { error: playerError } = await db
      .from("players")
      .update({ rating: row.rating_after })
      .eq("id", row.player_id);

    if (playerError) throw playerError;
  }

  return {
    teamVotingComplete: false,
    ratingsApplied: true,
    votingClosed,
    finalizedByDeadline: false,
  };
}

export async function revertOverallRatingsForMatch(
  matchId: number,
  db: SupabaseClient = supabase
): Promise<void> {
  const { data: summaries } = await db
    .from("match_player_rating_summary")
    .select("player_id, rating_before")
    .eq("match_id", matchId);

  for (const row of summaries ?? []) {
    if (row.rating_before == null) continue;

    await db
      .from("players")
      .update({ rating: row.rating_before })
      .eq("id", row.player_id);
  }
}
