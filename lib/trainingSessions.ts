import { getMatchDateTime } from "@/lib/matchCountdown";
import { isTrainingVotingDeadlinePassed } from "@/lib/trainingRatings";

export type TrainingSession = {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string | null;
  notes: string | null;
  is_completed: boolean;
  rating_voting_ends_at: string | null;
  created_at: string;
};

export function sortTrainingsByDate(
  sessions: TrainingSession[]
): TrainingSession[] {
  return [...sessions].sort((a, b) => {
    const dateA = getMatchDateTime(a)?.getTime() ?? 0;
    const dateB = getMatchDateTime(b)?.getTime() ?? 0;
    return dateB - dateA || b.id - a.id;
  });
}

export function getCompletedTrainings(
  sessions: TrainingSession[]
): TrainingSession[] {
  return sortTrainingsByDate(sessions.filter((session) => session.is_completed));
}

export function getLatestCompletedTraining(
  sessions: TrainingSession[]
): TrainingSession | null {
  return getCompletedTrainings(sessions)[0] ?? null;
}

/** Последняя завершённая тренировка с ещё открытым голосованием (для кнопки «Дома») */
export function getLatestOpenTrainingForVoting(
  sessions: TrainingSession[]
): TrainingSession | null {
  for (const session of getCompletedTrainings(sessions)) {
    if (!isTrainingVotingDeadlinePassed(session)) {
      return session;
    }
  }

  return null;
}

export function formatTrainingHeader(session: TrainingSession): string {
  const date = session.date.includes(".")
    ? session.date
    : new Date(session.date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      });

  return `${session.title} · ${date} · ${session.time}`;
}
