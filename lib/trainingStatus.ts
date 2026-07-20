export const TRAINING_FINISHED_EVENT = "ndfk:training-finished";

export function notifyTrainingFinished(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TRAINING_FINISHED_EVENT));
}
