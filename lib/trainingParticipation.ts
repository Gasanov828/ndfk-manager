export type TrainingParticipationRow = {
  player_id: number;
  participated: boolean;
  skipped_rating_vote?: boolean;
};

export function getTrainingRatingVoterIds(
  participantIds: number[],
  rows: TrainingParticipationRow[] | null | undefined
): number[] {
  if (!rows || rows.length === 0) return participantIds;

  const skipMap = new Map(
    rows.map((row) => [row.player_id, Boolean(row.skipped_rating_vote)])
  );
  return participantIds.filter((id) => !skipMap.get(id));
}

export function filterTrainingVotesByRatingVoters<
  T extends { voter_player_id: number; rated_player_id: number }
>(votes: T[], participantIds: number[], ratingVoterIds: number[]): T[] {
  const participantSet = new Set(participantIds);
  const voterSet = new Set(ratingVoterIds);
  return votes.filter(
    (vote) =>
      voterSet.has(vote.voter_player_id) &&
      participantSet.has(vote.rated_player_id)
  );
}

/** Если записей нет — все игроки считаются участниками (обратная совместимость) */
export function filterTrainingParticipatingPlayerIds(
  allPlayerIds: number[],
  rows: TrainingParticipationRow[] | null | undefined
): number[] {
  if (!rows || rows.length === 0) return allPlayerIds;

  const map = new Map(rows.map((row) => [row.player_id, row.participated]));
  return allPlayerIds.filter((id) => map.get(id) !== false);
}

export function filterTrainingVotesByParticipants<
  T extends { voter_player_id: number; rated_player_id: number }
>(votes: T[], participantIds: number[]): T[] {
  const set = new Set(participantIds);
  return votes.filter(
    (vote) =>
      set.has(vote.voter_player_id) && set.has(vote.rated_player_id)
  );
}

export function getTrainingVotingProgress(
  participantIds: number[],
  ratingVoterIds: number[],
  votes: { voter_player_id: number; rated_player_id: number }[]
): { votedCount: number; total: number } {
  const skippedCount = participantIds.length - ratingVoterIds.length;
  const expectedTargets = participantIds.length - 1;

  const fullyVotedCount = ratingVoterIds.filter((voterId) => {
    const voterVotes = votes.filter((vote) => vote.voter_player_id === voterId);
    if (voterVotes.length !== expectedTargets) return false;

    const ratedIds = new Set(voterVotes.map((vote) => vote.rated_player_id));
    return participantIds
      .filter((id) => id !== voterId)
      .every((id) => ratedIds.has(id));
  }).length;

  return {
    votedCount: fullyVotedCount + skippedCount,
    total: participantIds.length,
  };
}
