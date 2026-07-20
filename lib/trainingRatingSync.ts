import type { SupabaseClient } from "@supabase/supabase-js";

import {

  aggregateVotes,

  computeNewOverallAfterTraining,

  isRatingVotingComplete,

  isTrainingVotingDeadlinePassed,

  shouldFinalizeTrainingRatings,

  type TrainingRatingVote,

} from "@/lib/trainingRatings";

import {

  filterTrainingParticipatingPlayerIds,

  filterTrainingVotesByParticipants,

  filterTrainingVotesByRatingVoters,

  getTrainingRatingVoterIds,

} from "@/lib/trainingParticipation";

import { supabase } from "@/lib/supabase";



async function loadRatingBeforeMap(

  trainingId: number,

  db: SupabaseClient

): Promise<Record<number, number>> {

  const { data: oldSummaries } = await db

    .from("training_rating_summary")

    .select("player_id, rating_before")

    .eq("training_id", trainingId);



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



export async function getTrainingParticipantIds(

  trainingId: number,

  db: SupabaseClient = supabase

): Promise<number[]> {

  const { data: allPlayers } = await db.from("players").select("id").order("name");



  const allIds = (allPlayers ?? []).map((row) => row.id);



  const { data: participation, error } = await db

    .from("training_player_participation")

    .select("player_id, participated")

    .eq("training_id", trainingId);



  if (error?.message.includes("training_player_participation")) {

    return allIds;

  }



  return filterTrainingParticipatingPlayerIds(allIds, participation ?? []);

}



export async function recalculateTrainingRatings(

  trainingId: number,

  db: SupabaseClient = supabase

): Promise<{

  teamVotingComplete: boolean;

  ratingsApplied: boolean;

  votingClosed: boolean;

  finalizedByDeadline?: boolean;

}> {

  const { data: sessionRow } = await db

    .from("training_sessions")

    .select("id, date, time, is_completed, rating_voting_ends_at")

    .eq("id", trainingId)

    .single();



  const participantIds = await getTrainingParticipantIds(trainingId, db);



  const { data: participation } = await db

    .from("training_player_participation")

    .select("player_id, participated, skipped_rating_vote")

    .eq("training_id", trainingId);



  const ratingVoterIds = getTrainingRatingVoterIds(

    participantIds,

    participation ?? []

  );



  const { data: votes, error } = await db

    .from("training_rating_votes")

    .select("voter_player_id, rated_player_id, stars")

    .eq("training_id", trainingId);



  if (error) throw error;



  const voteRows = (votes ?? []) as TrainingRatingVote[];

  const validVotes = filterTrainingVotesByRatingVoters(

    filterTrainingVotesByParticipants(voteRows, participantIds),

    participantIds,

    ratingVoterIds

  );

  const teamVotingComplete = isRatingVotingComplete(

    participantIds,

    ratingVoterIds,

    validVotes

  );

  const deadlinePassed = sessionRow

    ? isTrainingVotingDeadlinePassed(sessionRow)

    : false;

  const votingClosed = deadlinePassed;

  const shouldApply = shouldFinalizeTrainingRatings(

    teamVotingComplete,

    deadlinePassed

  );



  if (!shouldApply) {

    await revertOverallRatingsForTraining(trainingId, db);

    await db.from("training_rating_summary").delete().eq("training_id", trainingId);



    return {

      teamVotingComplete,

      ratingsApplied: false,

      votingClosed,

      finalizedByDeadline: false,

    };

  }



  const ratingBeforeMap = await loadRatingBeforeMap(trainingId, db);

  await revertOverallRatingsForTraining(trainingId, db);



  await db.from("training_rating_summary").delete().eq("training_id", trainingId);



  const aggregatedBase = aggregateVotes(

    validVotes as Parameters<typeof aggregateVotes>[0]

  );



  if (aggregatedBase.length === 0) {

    return {

      teamVotingComplete,

      ratingsApplied: false,

      votingClosed,

      finalizedByDeadline: deadlinePassed && !teamVotingComplete,

    };

  }



  const rowsWithRatings = await Promise.all(

    aggregatedBase.map(async (row) => {

      const ratingBefore = await resolveRatingBefore(

        row.player_id,

        ratingBeforeMap,

        db

      );

      const ratingAfter = computeNewOverallAfterTraining(

        ratingBefore,

        row.match_rating

      );



      return {

        training_id: trainingId,

        player_id: row.player_id,

        avg_stars: row.avg_stars,

        training_rating: row.match_rating,

        vote_count: row.vote_count,

        rating_before: ratingBefore,

        rating_after: ratingAfter,

      };

    })

  );



  const { error: insertError } = await db

    .from("training_rating_summary")

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

    teamVotingComplete,

    ratingsApplied: true,

    votingClosed,

    finalizedByDeadline: deadlinePassed && !teamVotingComplete,

  };

}



export async function revertOverallRatingsForTraining(

  trainingId: number,

  db: SupabaseClient = supabase

): Promise<void> {

  const { data: summaries } = await db

    .from("training_rating_summary")

    .select("player_id, rating_before")

    .eq("training_id", trainingId);



  for (const row of summaries ?? []) {

    if (row.rating_before == null) continue;



    await db

      .from("players")

      .update({ rating: row.rating_before })

      .eq("id", row.player_id);

  }

}


