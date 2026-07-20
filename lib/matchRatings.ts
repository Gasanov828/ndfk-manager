import { getMatchDateTime, type MatchDateTimeInput } from "@/lib/matchCountdown";
import { getPlayedMatches, type MatchWithResult } from "@/lib/matchHistory";
import type { Match } from "@/lib/matches";

/** ������� ����� ����� ����� ������� ����������� */
export const RATING_VOTING_HOURS = 12;

export type MatchRatingVote = {
  id: number;
  match_id: number;
  voter_player_id: number;
  rated_player_id: number;
  stars: number;
};

/** ����������� ���� ������ � ��� ������ � ���������� */
export type RatingVoteLike = Pick<
  MatchRatingVote,
  "voter_player_id" | "rated_player_id"
>;

export type MatchRatingSummary = {
  id: number;
  match_id: number;
  player_id: number;
  avg_stars: number;
  match_rating: number;
  vote_count: number;
  is_mvp: boolean;
  rating_before?: number | null;
  rating_after?: number | null;
  rating_delta?: number | null;
};

export type PlayerMatchRating = {
  match_rating: number;
  is_mvp: boolean;
  vote_count: number;
  rating_before?: number | null;
  rating_after?: number | null;
  rating_delta?: number | null;
};

export type MatchMvpInfo = {
  playerId: number;
  playerName: string;
  avgScore: number;
  voteCount: number;
  opponent: string;
  matchDate: string;
  /** true only after the voting deadline */
  isConfirmedMvp: boolean;
  photoUrl?: string | null;
  /** MVP goals in that match */
  matchGoals?: number | null;
  /** MVP assists in that match */
  matchAssists?: number | null;
};

export const MAX_VOTE_SCORE = 10;

/** ������������ ��������� ������ ? �� ���� (��� ������� ������ 10/10) */
export const MAX_OVERALL_DELTA = 0.5;

/** ������� ������ 1�10 ? ��������� ������ ?. 10 = +maxDelta, ~5.5 = 0, 1 = ?maxDelta */
export function score10ToOverallDelta(
  avgScore: number,
  maxDelta: number = MAX_OVERALL_DELTA
): number {
  const normalized = (avgScore - 1) / (MAX_VOTE_SCORE - 1);
  const delta = normalized * (maxDelta * 2) - maxDelta;
  return Math.round(delta * 10) / 10;
}

/** ������� ���������� ��� �������� ���� �� ���� ������ */
export function getMatchRatingCoverage(
  participantIds: number[],
  votes: Pick<MatchRatingVote, "rated_player_id">[]
): { ratedCount: number; total: number } {
  const participantSet = new Set(participantIds);
  const rated = new Set(
    votes
      .filter((vote) => participantSet.has(vote.rated_player_id))
      .map((vote) => vote.rated_player_id)
  );

  return {
    ratedCount: rated.size,
    total: participantIds.length,
  };
}

/** ����� ����� ������� ����� ����������� */
export function computeNewOverallRating(
  ratingBefore: number,
  avgScore: number
): number {
  const next = ratingBefore + score10ToOverallDelta(avgScore);
  return Math.min(99, Math.max(1, Math.round(next * 10) / 10));
}

export function formatVoteScore(score: number): string {
  return score.toFixed(1);
}

export function formatOverallRating(rating: number): string {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

/** @deprecated ����������� formatVoteScore */
export function formatMatchRating(rating: number): string {
  return formatVoteScore(rating);
}

export function formatVoteCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} голосов`;
  if (mod10 === 1) return `${count} голос`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} голоса`;
  return `${count} голосов`;
}

export function getMatchMvpFromSummaries(
  summaries: MatchRatingSummary[],
  players: { id: number; name: string }[],
  match: Match
): MatchMvpInfo | null {
  if (summaries.length === 0) return null;

  const deadlinePassed = isVotingDeadlinePassed(match);
  const ranked = [...summaries]
    .filter((row) => row.vote_count > 0)
    .sort(
      (a, b) =>
        Number(b.match_rating) - Number(a.match_rating) ||
        b.vote_count - a.vote_count
    );

  if (ranked.length === 0) return null;

  const mvpRow = deadlinePassed
    ? summaries.find((row) => row.is_mvp) ?? ranked[0]
    : ranked[0];

  const player = players.find((entry) => entry.id === mvpRow.player_id);
  if (!player) return null;

  const isConfirmedMvp =
    deadlinePassed &&
    (Boolean(mvpRow.is_mvp) || mvpRow.player_id === ranked[0].player_id);

  return {
    playerId: mvpRow.player_id,
    playerName: player.name,
    avgScore: Number(mvpRow.match_rating),
    voteCount: mvpRow.vote_count,
    opponent: match.opponent,
    matchDate: match.date,
    isConfirmedMvp,
  };
}

/** Attach photo / match goals / assists for richer MVP cards */
export function enrichMatchMvpInfo(
  mvp: MatchMvpInfo | null,
  extras: {
    photoUrl?: string | null;
    matchGoals?: number | null;
    matchAssists?: number | null;
  }
): MatchMvpInfo | null {
  if (!mvp) return null;
  return {
    ...mvp,
    photoUrl: extras.photoUrl ?? mvp.photoUrl ?? null,
    matchGoals: extras.matchGoals ?? mvp.matchGoals ?? null,
    matchAssists: extras.matchAssists ?? mvp.matchAssists ?? null,
  };
}

export function getMatchRatingColorClass(rating: number): string {
  if (rating >= 9) return "text-emerald-300";
  if (rating >= 8) return "text-lime-300";
  if (rating >= 7) return "text-yellow-300";
  if (rating >= 6) return "text-orange-300";
  return "text-red-300";
}

export function getMatchRatingGlowClass(rating: number): string {
  if (rating >= 9) return "shadow-[0_0_12px_rgba(52,211,153,0.45)]";
  if (rating >= 8) return "shadow-[0_0_10px_rgba(163,230,53,0.35)]";
  if (rating >= 7) return "shadow-[0_0_10px_rgba(250,204,21,0.35)]";
  return "";
}

export function getLatestPlayedMatch(
  matches: Match[] | MatchWithResult[]
): MatchWithResult | null {
  const played = getPlayedMatches(matches as MatchWithResult[]);
  return played[0] ?? null;
}

/** ��������� ��������� ����, �� �������� ��� ���� ����� ����������� */
export function getLatestPlayedMatchWithRatings(
  matches: Match[] | MatchWithResult[],
  ratedMatchIds: Iterable<number>
): MatchWithResult | null {
  const ratedSet = new Set(ratedMatchIds);
  if (ratedSet.size === 0) return null;

  const played = getPlayedMatches(matches as MatchWithResult[]);
  return played.find((match) => ratedSet.has(match.id)) ?? null;
}

/** ��������� ��������� ���� � ��� �������� ������������ (��� ������ ������) */
export function getLatestOpenMatchForVoting(
  matches: Match[] | MatchWithResult[]
): MatchWithResult | null {
  const played = getPlayedMatches(matches as MatchWithResult[]);

  for (const match of played) {
    if (!isVotingDeadlinePassed(match)) {
      return match;
    }
  }

  return null;
}

export type RatingVotingMatch = MatchDateTimeInput & {
  is_played?: boolean;
  rating_voting_ends_at?: string | null;
};

export type VotingDeadlineOptions = {
  hasSummaries?: boolean;
};

const LEGACY_RATING_VOTING_HOURS = 24;
const MS_PER_HOUR = 60 * 60 * 1000;

export function buildRatingVotingEndsAt(fromDate = new Date()): string {
  return new Date(
    fromDate.getTime() + RATING_VOTING_HOURS * MS_PER_HOUR
  ).toISOString();
}

/**
 * Old matches may still store a 24h deadline. Shrink to the current window
 * so the countdown matches RATING_VOTING_HOURS (12).
 */
export function normalizeStoredRatingVotingEndsAt(
  stored: Date,
  match?: Pick<RatingVotingMatch, "date" | "time">
): Date {
  const legacyExtraMs =
    (LEGACY_RATING_VOTING_HOURS - RATING_VOTING_HOURS) * MS_PER_HOUR;
  if (legacyExtraMs <= 0) return stored;

  const kickoff = match ? getMatchDateTime(match) : null;
  if (kickoff) {
    const offsetMs = stored.getTime() - kickoff.getTime();
    // finish+24h is usually >= ~22h from kickoff; finish+12h is lower
    if (offsetMs >= (LEGACY_RATING_VOTING_HOURS - 2) * MS_PER_HOUR) {
      return new Date(stored.getTime() - legacyExtraMs);
    }
  }

  if (stored.getTime() - Date.now() > RATING_VOTING_HOURS * MS_PER_HOUR) {
    return new Date(stored.getTime() - legacyExtraMs);
  }

  return stored;
}

/** Keep existing deadline if valid; otherwise now + 12h. Caps legacy 24h. */
export function resolveRatingVotingEndsAt(
  existingEndsAt: string | null | undefined,
  match?: Pick<RatingVotingMatch, "date" | "time">
): string {
  if (existingEndsAt) {
    const stored = new Date(existingEndsAt);
    if (!Number.isNaN(stored.getTime())) {
      return normalizeStoredRatingVotingEndsAt(stored, match).toISOString();
    }
  }

  return buildRatingVotingEndsAt();
}

/** First finish always opens a fresh RATING_VOTING_HOURS window. */
export function openRatingVotingEndsAt(
  match?: Pick<
    RatingVotingMatch,
    "is_played" | "rating_voting_ends_at" | "date" | "time"
  > | null
): string {
  if (match?.is_played && match.rating_voting_ends_at) {
    return resolveRatingVotingEndsAt(match.rating_voting_ends_at, match);
  }
  return buildRatingVotingEndsAt();
}

export function getMatchVotingDeadline(
  match: RatingVotingMatch,
  _options?: VotingDeadlineOptions
): Date | null {
  if (match.rating_voting_ends_at) {
    const stored = new Date(match.rating_voting_ends_at);
    if (!Number.isNaN(stored.getTime())) {
      return normalizeStoredRatingVotingEndsAt(stored, match);
    }
  }

  const kickoff = getMatchDateTime(match);
  if (!kickoff) return null;

  return new Date(kickoff.getTime() + RATING_VOTING_HOURS * MS_PER_HOUR);
}

export function isVotingDeadlinePassed(
  match: RatingVotingMatch,
  _options?: VotingDeadlineOptions
): boolean {
  const deadline = getMatchVotingDeadline(match);
  if (!deadline) return !match.is_played;
  return Date.now() >= deadline.getTime();
}

export function getVotingTimeRemainingMs(
  match: RatingVotingMatch,
  _options?: VotingDeadlineOptions
): number | null {
  const deadline = getMatchVotingDeadline(match);
  if (!deadline) return null;

  return Math.max(0, deadline.getTime() - Date.now());
}

export function formatVotingTimeRemaining(ms: number): string {
  if (ms <= 0) return "время вышло";

  const totalMinutes = Math.ceil(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days} д ${hours} ч` : `${days} д`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  }
  return `${minutes} мин`;
}

/** �������� ������ ��� ������� �����������: 23:59:59 */
export function formatVotingCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export type VotingUrgencyLevel = "normal" | "soon" | "urgent" | "critical";

export function getVotingUrgency(remainingMs: number): {
  level: VotingUrgencyLevel;
  headline: string;
  hint: string;
} {
  const hour = 60 * 60 * 1000;
  const thirtyMin = 30 * 60 * 1000;

  if (remainingMs <= thirtyMin) {
    return {
      level: "critical",
      headline: "Скоро закроется!",
      hint: "Успейте поставить оценки до завершения голосования",
    };
  }
  if (remainingMs <= 2 * hour) {
    return {
      level: "urgent",
      headline: "Меньше 2 часов",
      hint: "Самое время открыть оценки и выбрать лучших игроков",
    };
  }
  if (remainingMs <= 6 * hour) {
    return {
      level: "soon",
      headline: "Голосование открыто",
      hint: "Поставьте оценки сейчас и не откладывайте на потом",
    };
  }

  return {
    level: "normal",
    headline: "Голосование открыто",
    hint: `У вас ${RATING_VOTING_HOURS} ч, чтобы оценить игроков после матча`,
  };
}

export function formatVotingDeadline(
  match: RatingVotingMatch,
  options?: VotingDeadlineOptions
): string | null {
  const deadline = getMatchVotingDeadline(match, options);
  if (!deadline) return null;

  return deadline.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ������� ������� ��� ��������� ���� �� ���� ������ */
export function getActiveVoterProgress(
  voterIds: number[],
  votes: Pick<MatchRatingVote, "voter_player_id">[]
): { votedCount: number; total: number } {
  const votersWithVotes = new Set(
    votes
      .filter((vote) => voterIds.includes(vote.voter_player_id))
      .map((vote) => vote.voter_player_id)
  );

  return {
    votedCount: voterIds.filter((id) => votersWithVotes.has(id)).length,
    total: voterIds.length,
  };
}

export function getMatchVotingProgress(
  participantIds: number[],
  ratingVoterIds: number[],
  votes: Pick<MatchRatingVote, "voter_player_id" | "rated_player_id">[]
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

/** ����� ����� ��������, ����� ��� ������������� ��� ���� ������� */
export function shouldFinalizeRatings(
  teamComplete: boolean,
  deadlinePassed: boolean
): boolean {
  return teamComplete || deadlinePassed;
}

export function getRatingDelta(
  ratingBefore?: number | null,
  ratingAfter?: number | null
): number | null {
  if (ratingBefore == null || ratingAfter == null) return null;
  const delta = ratingAfter - ratingBefore;
  return Math.round(delta * 10) / 10;
}

export function buildRatingSummaryMap(
  summaries: MatchRatingSummary[]
): Record<number, PlayerMatchRating> {
  return summaries.reduce<Record<number, PlayerMatchRating>>((acc, row) => {
    const ratingBefore =
      row.rating_before != null ? Number(row.rating_before) : null;
    const ratingAfter =
      row.rating_after != null ? Number(row.rating_after) : null;

    const computedDelta = getRatingDelta(ratingBefore, ratingAfter);
    const storedDelta =
      row.rating_delta != null ? Number(row.rating_delta) : null;

    acc[row.player_id] = {
      match_rating: Number(row.match_rating),
      is_mvp: row.is_mvp,
      vote_count: row.vote_count,
      rating_before: ratingBefore,
      rating_after: ratingAfter,
      rating_delta: storedDelta ?? computedDelta,
    };
    return acc;
  }, {});
}

export function aggregateVotes(
  votes: Pick<MatchRatingVote, "rated_player_id" | "stars">[]
): {
  player_id: number;
  avg_stars: number;
  match_rating: number;
  vote_count: number;
}[] {
  const grouped = votes.reduce<
    Record<number, { total: number; count: number }>
  >((acc, vote) => {
    if (!acc[vote.rated_player_id]) {
      acc[vote.rated_player_id] = { total: 0, count: 0 };
    }
    acc[vote.rated_player_id].total += vote.stars;
    acc[vote.rated_player_id].count += 1;
    return acc;
  }, {});

  return Object.entries(grouped).map(([playerId, data]) => {
    const avgScore = data.total / data.count;
    const roundedAvg = Math.round(avgScore * 10) / 10;

    return {
      player_id: Number(playerId),
      avg_stars: roundedAvg,
      match_rating: roundedAvg,
      vote_count: data.count,
    };
  });
}

export function countPendingRatingVotes(
  participantIds: number[],
  voterId: number | null,
  existingVotes: RatingVoteLike[]
): number {
  if (!voterId) return participantIds.length;

  const ratedIds = new Set(
    existingVotes
      .filter((vote) => vote.voter_player_id === voterId)
      .map((vote) => vote.rated_player_id)
  );

  return participantIds.filter(
    (id) => id !== voterId && !ratedIds.has(id)
  ).length;
}

export function hasCompletedRatingVote(
  participantIds: number[],
  voterId: number | null,
  existingVotes: RatingVoteLike[]
): boolean {
  return countPendingRatingVotes(participantIds, voterId, existingVotes) === 0;
}

/** ��� ������� �������������: ������ ������ ���� ��������� ���������� ����� */
export function isTeamVotingComplete(
  participantIds: number[],
  votes: RatingVoteLike[]
): boolean {
  if (participantIds.length < 2) return false;

  const expectedVotesPerVoter = participantIds.length - 1;

  return participantIds.every((voterId) => {
    const voterVotes = votes.filter((vote) => vote.voter_player_id === voterId);
    if (voterVotes.length !== expectedVotesPerVoter) return false;

    const ratedIds = new Set(voterVotes.map((vote) => vote.rated_player_id));
    return participantIds
      .filter((id) => id !== voterId)
      .every((id) => ratedIds.has(id));
  });
}

/** ���, ��� ������ ����������, ��������� ������ ���� ���������� ����� */
export function isRatingVotingComplete(
  participantIds: number[],
  ratingVoterIds: number[],
  votes: RatingVoteLike[]
): boolean {
  if (participantIds.length < 2 || ratingVoterIds.length === 0) return false;

  const expectedTargets = participantIds.length - 1;

  return ratingVoterIds.every((voterId) => {
    const voterVotes = votes.filter((vote) => vote.voter_player_id === voterId);
    if (voterVotes.length !== expectedTargets) return false;

    const ratedIds = new Set(voterVotes.map((vote) => vote.rated_player_id));
    return participantIds
      .filter((id) => id !== voterId)
      .every((id) => ratedIds.has(id));
  });
}

export function getTeamVotingProgress(
  participantIds: number[],
  votes: RatingVoteLike[]
): { votedCount: number; total: number; isComplete: boolean } {
  const total = participantIds.length;
  const expectedPerVoter = Math.max(0, total - 1);

  const votedCount = participantIds.filter(
    (voterId) =>
      votes.filter((vote) => vote.voter_player_id === voterId).length >=
      expectedPerVoter
  ).length;

  return {
    votedCount,
    total,
    isComplete: isTeamVotingComplete(participantIds, votes),
  };
}
