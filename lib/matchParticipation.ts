export type MatchParticipationRow = {
  player_id: number;
  participated: boolean;
  skipped_rating_vote?: boolean;
};

export function getMatchRatingVoterIds(
  participantIds: number[],
  rows: MatchParticipationRow[] | null | undefined
): number[] {
  if (!rows || rows.length === 0) return participantIds;

  const skipMap = new Map(
    rows.map((row) => [row.player_id, Boolean(row.skipped_rating_vote)])
  );
  return participantIds.filter((id) => !skipMap.get(id));
}

export function filterVotesByRatingVoters<
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
export function filterParticipatingPlayerIds(
  allPlayerIds: number[],
  rows: MatchParticipationRow[] | null | undefined
): number[] {
  if (!rows || rows.length === 0) return allPlayerIds;

  const map = new Map(rows.map((row) => [row.player_id, row.participated]));
  return allPlayerIds.filter((id) => map.get(id) !== false);
}

export function buildParticipationMap(
  playerIds: number[],
  rows: MatchParticipationRow[] | null | undefined
): Record<number, boolean> {
  const map: Record<number, boolean> = {};

  for (const id of playerIds) {
    map[id] = true;
  }

  for (const row of rows ?? []) {
    map[row.player_id] = row.participated;
  }

  return map;
}

export function filterVotesByParticipants<
  T extends { voter_player_id: number; rated_player_id: number }
>(votes: T[], participantIds: number[]): T[] {
  const set = new Set(participantIds);
  return votes.filter(
    (vote) =>
      set.has(vote.voter_player_id) && set.has(vote.rated_player_id)
  );
}
