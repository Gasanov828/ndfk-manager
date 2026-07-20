export type MatchRatingRecalcResult = {
  teamVotingComplete: boolean;
  ratingsApplied: boolean;
  votingClosed: boolean;
  finalizedByDeadline?: boolean;
};

export async function recalculateMatchRatingsViaApi(
  matchId: number
): Promise<MatchRatingRecalcResult> {
  const response = await fetch("/api/match-rating/recalculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchId }),
  });

  const payload = (await response.json()) as MatchRatingRecalcResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Ошибка пересчёта оценок матча");
  }

  return payload;
}
