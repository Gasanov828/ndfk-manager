/**
 * Типы LIVE-событий матча.
 * Новые типы (карточки, пенальти и т.д.) добавляются сюда + в registry,
 * без переписывания консоли.
 */

export type LiveEventType =
  | "goal"
  | "assist"
  | "substitution"
  // reserved for future:
  | "yellow_card"
  | "red_card"
  | "penalty"
  | "own_goal";

export type AssistStatus = "pending" | "linked" | "none";

export type LiveEventMeta = {
  assistStatus?: AssistStatus;
  /** Слот ушедшего / вышедшего при замене */
  slotOut?: string | null;
  slotIn?: string | null;
  note?: string;
};

export type LiveMatchEvent = {
  id: number;
  match_id: number;
  event_type: LiveEventType;
  player_id: number | null;
  related_player_id: number | null;
  related_event_id: number | null;
  meta: LiveEventMeta;
  created_at: string;
  /** Подставляется на клиенте */
  player_name?: string | null;
  related_player_name?: string | null;
};

export type LivePlayerStat = {
  player_id: number;
  goals: number;
  assists: number;
  saves: number;
};

export type LiveMatchScore = {
  ndfk_goals: number;
  opponent_goals: number;
};
