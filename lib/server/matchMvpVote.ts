import type { SupabaseClient } from "@supabase/supabase-js";
import {
  filterParticipatingPlayerIds,
  getMatchRatingVoterIds,
  type MatchParticipationRow,
} from "@/lib/matchParticipation";
import {
  aggregateMatchMvpResults,
  resolveEffectiveVotingStatus,
  toMatchMvpVoteMatchInfo,
  type MatchMvpCandidate,
  type MatchMvpVoteMatchInfo,
  type MatchMvpVoteResult,
  type MatchVoteRow,
  type MatchVotingSession,
  type MatchVotingStatus,
} from "@/lib/matchMvpVote";
import type { Match } from "@/lib/matches";
import {
  getActiveVoterProgress,
  getLatestOpenMatchForVoting,
  hasSubmittedRatingBallot,
  isVotingDeadlinePassed,
  type MatchRatingVote,
} from "@/lib/matchRatings";

type DbClient = SupabaseClient;

type PlayerRow = {
  id: number;
  name: string;
  position: string;
  rating: number;
  photo_url?: string | null;
};

type StatRow = {
  player_id: number;
  goals?: number | null;
  assists?: number | null;
};

function isMissingRelationError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("match_votes") ||
    message.includes("match_voting_sessions") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

export async function openMatchMvpVotingSession(
  db: DbClient,
  matchId: number
): Promise<{ ok: boolean; error: string | null; schemaMissing?: boolean }> {
  const { data: existing, error: existingError } = await db
    .from("match_voting_sessions")
    .select("id, status")
    .eq("match_id", matchId)
    .maybeSingle();

  if (existingError) {
    if (isMissingRelationError(existingError.message)) {
      return { ok: false, error: existingError.message, schemaMissing: true };
    }
    return { ok: false, error: existingError.message };
  }

  if (existing) {
    if (existing.status === "closed") {
      const { error } = await db
        .from("match_voting_sessions")
        .update({ status: "open", closed_at: null, opened_at: new Date().toISOString() })
        .eq("match_id", matchId);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true, error: null };
  }

  const { error } = await db.from("match_voting_sessions").insert({
    match_id: matchId,
    status: "open",
  });

  if (error) {
    if (isMissingRelationError(error.message)) {
      return { ok: false, error: error.message, schemaMissing: true };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

async function loadMvpVotingSession(
  db: DbClient,
  matchId: number,
  match: Match
): Promise<{
  session: MatchVotingSession | null;
  error: string | null;
  schemaMissing?: boolean;
}> {
  const { data: sessionRow, error: sessionError } = await db
    .from("match_voting_sessions")
    .select("id, match_id, status, opened_at, closed_at")
    .eq("match_id", matchId)
    .maybeSingle();

  if (sessionError) {
    if (isMissingRelationError(sessionError.message)) {
      return { session: null, error: sessionError.message, schemaMissing: true };
    }
    return { session: null, error: sessionError.message };
  }

  if (sessionRow) {
    return { session: sessionRow as MatchVotingSession, error: null };
  }

  const canAutoOpen = Boolean(match.is_played) && !isVotingDeadlinePassed(match);
  if (!canAutoOpen) {
    return {
      session: null,
      error: "Голосование для этого матча ещё не открыто",
    };
  }

  const opened = await openMatchMvpVotingSession(db, matchId);
  if (!opened.ok) {
    return {
      session: null,
      error: opened.schemaMissing
        ? "Выполните SQL: supabase/match_mvp_votes.sql"
        : opened.error ?? "Не удалось открыть голосование",
      schemaMissing: opened.schemaMissing,
    };
  }

  const { data: createdSession, error: reloadError } = await db
    .from("match_voting_sessions")
    .select("id, match_id, status, opened_at, closed_at")
    .eq("match_id", matchId)
    .maybeSingle();

  if (reloadError) {
    return { session: null, error: reloadError.message };
  }
  if (!createdSession) {
    return {
      session: null,
      error: "Не удалось открыть голосование",
    };
  }

  return { session: createdSession as MatchVotingSession, error: null };
}

export async function closeMatchMvpVotingSession(
  db: DbClient,
  matchId: number
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await db
    .from("match_voting_sessions")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("match_id", matchId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

async function ensureSessionClosedIfDeadlinePassed(
  db: DbClient,
  session: MatchVotingSession,
  ratingVotingEndsAt: string | null
): Promise<MatchVotingStatus> {
  const effective = resolveEffectiveVotingStatus({
    sessionStatus: session.status,
    ratingVotingEndsAt,
  });

  if (effective === "closed" && session.status === "open") {
    await closeMatchMvpVotingSession(db, session.match_id);
  }

  return effective;
}

async function loadMatchRow(
  db: DbClient,
  matchId: number
): Promise<{ match: Match | null; error: string | null }> {
  const { data, error } = await db
    .from("matches")
    .select(
      "id, opponent, date, time, location, ndfk_goals, opponent_goals, is_played, is_live, rating_voting_ends_at"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (error) return { match: null, error: error.message };
  return { match: (data as Match | null) ?? null, error: null };
}

export async function loadMatchMvpCandidates(
  db: DbClient,
  matchId: number
): Promise<{
  candidates: MatchMvpCandidate[];
  eligibleVoterIds: number[];
  error: string | null;
}> {
  const { data: playerData, error: playerError } = await db
    .from("players")
    .select("id, name, position, rating, photo_url")
    .order("name");

  if (playerError) {
    return { candidates: [], eligibleVoterIds: [], error: playerError.message };
  }

  const players = (playerData ?? []) as PlayerRow[];
  const allIds = players.map((p) => p.id);

  const { data: participationRows } = await db
    .from("match_player_participation")
    .select("player_id, participated, skipped_rating_vote")
    .eq("match_id", matchId);

  const participantIds = filterParticipatingPlayerIds(
    allIds,
    (participationRows ?? []) as MatchParticipationRow[]
  );
  const participantSet = new Set(participantIds);

  let statsRows: StatRow[] = [];
  const statsResult = await db
    .from("match_player_stats")
    .select("player_id, goals, assists")
    .eq("match_id", matchId);

  if (!statsResult.error) {
    statsRows = (statsResult.data ?? []) as StatRow[];
  }

  const statsMap = new Map(
    statsRows.map((row) => [Number(row.player_id), row])
  );

  const candidates: MatchMvpCandidate[] = players
    .filter((player) => participantSet.has(player.id))
    .map((player) => {
      const stats = statsMap.get(player.id);
      return {
        playerId: player.id,
        name: player.name,
        position: player.position,
        rating: Number(player.rating ?? 0),
        photoUrl: player.photo_url ?? null,
        goals: Number(stats?.goals ?? 0),
        assists: Number(stats?.assists ?? 0),
      };
    });

  return {
    candidates,
    eligibleVoterIds: participantIds,
    error: null,
  };
}

export type MatchMvpVotePageData = {
  schemaMissing: boolean;
  session: MatchVotingSession | null;
  status: MatchVotingStatus | null;
  match: MatchMvpVoteMatchInfo | null;
  candidates: MatchMvpCandidate[];
  votesCast: number;
  eligibleVoters: number;
  myVotedPlayerId: number | null;
  results: MatchMvpVoteResult[] | null;
  votes: MatchVoteRow[];
};

export async function getMatchMvpVotePageData(
  db: DbClient,
  matchId: number,
  voterPlayerId: number | null
): Promise<{ data: MatchMvpVotePageData; error: string | null }> {
  const empty: MatchMvpVotePageData = {
    schemaMissing: false,
    session: null,
    status: null,
    match: null,
    candidates: [],
    votesCast: 0,
    eligibleVoters: 0,
    myVotedPlayerId: null,
    results: null,
    votes: [],
  };

  const { match, error: matchError } = await loadMatchRow(db, matchId);
  if (matchError) return { data: empty, error: matchError };
  if (!match) return { data: empty, error: "Матч не найден" };

  const matchInfo = toMatchMvpVoteMatchInfo(match);

  const sessionLoad = await loadMvpVotingSession(db, matchId, match);
  if (sessionLoad.schemaMissing) {
    return {
      data: { ...empty, match: matchInfo, schemaMissing: true },
      error: null,
    };
  }
  if (sessionLoad.error || !sessionLoad.session) {
    return {
      data: { ...empty, match: matchInfo },
      error: sessionLoad.error ?? "Голосование для этого матча ещё не открыто",
    };
  }

  const session = sessionLoad.session;
  const status = await ensureSessionClosedIfDeadlinePassed(
    db,
    session,
    matchInfo.ratingVotingEndsAt
  );

  const { candidates, eligibleVoterIds, error: candidatesError } =
    await loadMatchMvpCandidates(db, matchId);
  if (candidatesError) {
    return { data: { ...empty, match: matchInfo, session }, error: candidatesError };
  }

  const { data: voteData, error: voteError } = await db
    .from("match_votes")
    .select("id, match_id, voter_player_id, voted_player_id, created_at")
    .eq("match_id", matchId);

  if (voteError) {
    if (isMissingRelationError(voteError.message)) {
      return {
        data: { ...empty, match: matchInfo, session, schemaMissing: true },
        error: null,
      };
    }
    return { data: { ...empty, match: matchInfo, session }, error: voteError.message };
  }

  const votes = (voteData ?? []) as MatchVoteRow[];
  const myVotedPlayerId =
    voterPlayerId == null
      ? null
      : votes.find((vote) => vote.voter_player_id === voterPlayerId)
          ?.voted_player_id ?? null;

  const results =
    status === "closed"
      ? aggregateMatchMvpResults(votes, candidates)
      : null;

  return {
    data: {
      schemaMissing: false,
      session: { ...session, status },
      status,
      match: matchInfo,
      candidates,
      votesCast: votes.length,
      eligibleVoters: eligibleVoterIds.length,
      myVotedPlayerId,
      results,
      votes,
    },
    error: null,
  };
}

export async function castMatchMvpVote(params: {
  db: DbClient;
  matchId: number;
  voterPlayerId: number;
  votedPlayerId: number;
}): Promise<{ ok: boolean; error: string | null; alreadyVoted?: boolean }> {
  const { db, matchId, voterPlayerId, votedPlayerId } = params;

  const page = await getMatchMvpVotePageData(db, matchId, voterPlayerId);
  if (page.error) return { ok: false, error: page.error };
  if (page.data.schemaMissing) {
    return {
      ok: false,
      error: "Выполните SQL: supabase/match_mvp_votes.sql",
    };
  }
  if (!page.data.session || page.data.status !== "open") {
    return { ok: false, error: "Голосование закрыто" };
  }
  if (page.data.myVotedPlayerId != null) {
    return { ok: false, error: "Вы уже проголосовали", alreadyVoted: true };
  }

  const eligible = new Set(page.data.candidates.map((c) => c.playerId));
  if (!eligible.has(votedPlayerId)) {
    return { ok: false, error: "Игрок не участвовал в матче" };
  }
  if (!eligible.has(voterPlayerId)) {
    return { ok: false, error: "Голосовать могут участники матча" };
  }

  const { error } = await db.from("match_votes").insert({
    match_id: matchId,
    voter_player_id: voterPlayerId,
    voted_player_id: votedPlayerId,
  });

  if (error) {
    if (
      error.code === "23505" ||
      error.message.toLowerCase().includes("duplicate") ||
      error.message.toLowerCase().includes("unique")
    ) {
      return { ok: false, error: "Вы уже проголосовали", alreadyVoted: true };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

export async function getLatestOpenMatchMvpVoteReminder(
  db: DbClient,
  voterPlayerId: number
): Promise<{
  matchId: number;
  matchLabel: string;
  votesCast: number;
  eligibleVoters: number;
} | null> {
  const { data: matchRows, error: matchesError } = await db
    .from("matches")
    .select("*")
    .order("date", { ascending: false });

  if (matchesError) return null;

  const latest = getLatestOpenMatchForVoting((matchRows ?? []) as Match[]);
  if (!latest || isVotingDeadlinePassed(latest)) return null;

  const { data: participation } = await db
    .from("match_player_participation")
    .select("player_id, participated, skipped_rating_vote")
    .eq("match_id", latest.id);

  const { data: playerRows } = await db.from("players").select("id").order("name");
  const participantIds = filterParticipatingPlayerIds(
    (playerRows ?? []).map((row) => Number(row.id)),
    (participation ?? []) as MatchParticipationRow[]
  );

  if (!participantIds.includes(voterPlayerId)) return null;

  const ratingVoterIds = getMatchRatingVoterIds(
    participantIds,
    (participation ?? []) as MatchParticipationRow[]
  );

  const { data: voteRows } = await db
    .from("match_player_rating_votes")
    .select("match_id, voter_player_id, rated_player_id, stars")
    .eq("match_id", latest.id);

  const votes = (voteRows ?? []) as MatchRatingVote[];
  if (hasSubmittedRatingBallot(voterPlayerId, votes)) return null;

  const voterProgress = getActiveVoterProgress(ratingVoterIds, votes);

  return {
    matchId: latest.id,
    matchLabel: `НДФК ${latest.ndfk_goals ?? 0}:${latest.opponent_goals ?? 0} ${latest.opponent}`,
    votesCast: voterProgress.votedCount,
    eligibleVoters: voterProgress.total,
  };
}
