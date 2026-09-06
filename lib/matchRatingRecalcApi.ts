export type MatchRatingRecalcResult = {
  teamVotingComplete: boolean;
  ratingsApplied: boolean;
  votingClosed: boolean;
  finalizedByDeadline?: boolean;
};

function formatRecalcFetchError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("load failed")
  ) {
    return "Сервер не успел пересчитать рейтинги (таймаут или сеть). Оценки сохранены — обновите страницу через минуту.";
  }

  return message || "Ошибка пересчёта оценок матча";
}

export async function recalculateMatchRatingsViaApi(
  matchId: number
): Promise<MatchRatingRecalcResult> {
  let response: Response;

  try {
    response = await fetch("/api/match-rating/recalculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
  } catch (error) {
    throw new Error(formatRecalcFetchError(error));
  }

  let payload: MatchRatingRecalcResult & { error?: string };

  try {
    payload = (await response.json()) as MatchRatingRecalcResult & {
      error?: string;
    };
  } catch {
    throw new Error(
      response.ok
        ? "Некорректный ответ сервера при пересчёте оценок"
        : formatRecalcFetchError(new Error(`HTTP ${response.status}`))
    );
  }

  if (!response.ok) {
    throw new Error(payload.error ?? "Ошибка пересчёта оценок матча");
  }

  return payload;
}
