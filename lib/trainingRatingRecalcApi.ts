export type TrainingRatingRecalcResult = {
  teamVotingComplete: boolean;
  ratingsApplied: boolean;
  votingClosed: boolean;
  finalizedByDeadline?: boolean;
};

export async function recalculateTrainingRatingsViaApi(
  trainingId: number
): Promise<TrainingRatingRecalcResult> {
  const response = await fetch("/api/training-rating/recalculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trainingId }),
  });

  const payload = (await response.json()) as TrainingRatingRecalcResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Ошибка пересчёта оценок тренировки");
  }

  return payload;
}
