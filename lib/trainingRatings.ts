import { getMatchDateTime } from "@/lib/matchCountdown";
import {
  aggregateVotes,
  countPendingRatingVotes,
  formatVoteScore,
  formatVotingDeadline,
  formatVotingTimeRemaining,
  getActiveVoterProgress,
  getRatingDelta,
  getTeamVotingProgress,
  hasCompletedRatingVote,
  isRatingVotingComplete,
  isTeamVotingComplete,
  MAX_VOTE_SCORE,
} from "@/lib/matchRatings";

/** Сколько часов открыто голосование после тренировки */
export const TRAINING_VOTING_HOURS = 48;

/** Макс. изменение ★ за тренировку (матч — 0.5) */
export const TRAINING_MAX_OVERALL_DELTA = 0.15;

export type TrainingRatingVote = {
  id?: number;
  training_id: number;
  voter_player_id: number;
  rated_player_id: number;
  stars: number;
};

export type TrainingRatingSummary = {
  id: number;
  training_id: number;
  player_id: number;
  avg_stars: number;
  training_rating: number;
  vote_count: number;
  rating_before?: number | null;
  rating_after?: number | null;
};

export type TrainingVotingSession = {
  date: string;
  time: string;
  is_completed?: boolean;
  rating_voting_ends_at?: string | null;
};

export type PlayerTrainingRating = {
  training_rating: number;
  vote_count: number;
  rating_before?: number | null;
  rating_after?: number | null;
  rating_delta?: number | null;
};

export function buildTrainingVotingEndsAt(fromDate = new Date()): string {
  return new Date(
    fromDate.getTime() + TRAINING_VOTING_HOURS * 60 * 60 * 1000
  ).toISOString();
}

export function getTrainingVotingDeadline(
  session: TrainingVotingSession,
  _options?: { hasSummaries?: boolean }
): Date | null {
  if (session.rating_voting_ends_at) {
    const stored = new Date(session.rating_voting_ends_at);
    if (!Number.isNaN(stored.getTime())) return stored;
  }

  const kickoff = getMatchDateTime(session);
  if (!kickoff) return null;

  return new Date(
    kickoff.getTime() + TRAINING_VOTING_HOURS * 60 * 60 * 1000
  );
}

export function isTrainingVotingDeadlinePassed(
  session: TrainingVotingSession,
  _options?: { hasSummaries?: boolean }
): boolean {
  if (session.rating_voting_ends_at) {
    const stored = new Date(session.rating_voting_ends_at);
    if (!Number.isNaN(stored.getTime())) {
      return Date.now() >= stored.getTime();
    }
  }

  const deadline = getTrainingVotingDeadline(session);
  if (!deadline) return !session.is_completed;
  return Date.now() >= deadline.getTime();
}

export function getTrainingVotingTimeRemainingMs(
  session: TrainingVotingSession,
  _options?: { hasSummaries?: boolean }
): number | null {
  const deadline = getTrainingVotingDeadline(session);
  if (!deadline) return null;

  return Math.max(0, deadline.getTime() - Date.now());
}

export function shouldFinalizeTrainingRatings(
  teamComplete: boolean,
  deadlinePassed: boolean
): boolean {
  return teamComplete || deadlinePassed;
}

export function score10ToTrainingDelta(avgScore: number): number {
  const normalized = (avgScore - 1) / (MAX_VOTE_SCORE - 1);
  const delta =
    normalized * (TRAINING_MAX_OVERALL_DELTA * 2) - TRAINING_MAX_OVERALL_DELTA;
  return Math.round(delta * 10) / 10;
}

export function computeNewOverallAfterTraining(
  ratingBefore: number,
  avgScore: number
): number {
  const next = ratingBefore + score10ToTrainingDelta(avgScore);
  return Math.min(99, Math.max(1, Math.round(next * 10) / 10));
}

export function buildTrainingRatingSummaryMap(
  summaries: TrainingRatingSummary[]
): Record<number, PlayerTrainingRating> {
  return summaries.reduce<Record<number, PlayerTrainingRating>>((acc, row) => {
    const ratingBefore =
      row.rating_before != null ? Number(row.rating_before) : null;
    const ratingAfter =
      row.rating_after != null ? Number(row.rating_after) : null;

    acc[row.player_id] = {
      training_rating: Number(row.training_rating),
      vote_count: row.vote_count,
      rating_before: ratingBefore,
      rating_after: ratingAfter,
      rating_delta: getRatingDelta(ratingBefore, ratingAfter),
    };
    return acc;
  }, {});
}

export {
  aggregateVotes,
  countPendingRatingVotes,
  formatVoteScore,
  formatVotingDeadline,
  formatVotingTimeRemaining,
  getActiveVoterProgress,
  getRatingDelta,
  getTeamVotingProgress,
  hasCompletedRatingVote,
  isRatingVotingComplete,
  isTeamVotingComplete,
  MAX_VOTE_SCORE,
};
