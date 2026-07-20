import { getPositionGroup, type PositionGroup } from "@/lib/positionStyles";
import { formatOverallRating } from "@/lib/matchRatings";

export type RatingAttribute = {
  key: string;
  label: string;
  emoji: string;
};

export const RATING_EPISODE_MIN_SCORE = 1;
/** 10 — точнее при усреднении голосов всей команды; 5 — быстрее, но грубее */
export const RATING_EPISODE_MAX_SCORE = 10;

export const POSITION_RATING_ATTRIBUTES: Record<PositionGroup, RatingAttribute[]> = {
  НАП: [
    { key: "pace", label: "Скорость", emoji: "💨" },
    { key: "shooting", label: "Удар", emoji: "🎯" },
    { key: "dribbling", label: "Дриблинг", emoji: "🕺" },
    { key: "passing", label: "Пас", emoji: "🅰️" },
    { key: "physical", label: "Физика", emoji: "💪" },
  ],
  ЦП: [
    { key: "passing", label: "Пас", emoji: "🅰️" },
    { key: "pace", label: "Скорость", emoji: "💨" },
    { key: "defending", label: "Отбор", emoji: "🛡️" },
    { key: "shooting", label: "Удар", emoji: "🎯" },
    { key: "physical", label: "Физика", emoji: "💪" },
  ],
  ЗАЩ: [
    { key: "defending", label: "Отбор", emoji: "🛡️" },
    { key: "pace", label: "Скорость", emoji: "💨" },
    { key: "heading", label: "Игра головой", emoji: "🧠" },
    { key: "passing", label: "Пас", emoji: "🅰️" },
    { key: "shooting", label: "Удар", emoji: "🎯" },
    { key: "physical", label: "Физика", emoji: "💪" },
  ],
  ВРТ: [
    { key: "reflexes", label: "Реакция", emoji: "⚡" },
    { key: "handling", label: "Игра руками", emoji: "🧤" },
    { key: "positioning", label: "Позиция", emoji: "📍" },
    { key: "kicking", label: "Игра ногами", emoji: "🦶" },
  ],
};

export type RatingEpisodeStatus = "open" | "revealing" | "closed";

export type RatingEpisodeRow = {
  id: string;
  token: string;
  title: string;
  status: RatingEpisodeStatus;
  created_at: string;
  closed_at: string | null;
};

export type RatingVoteRow = {
  voter_player_id: number;
  rated_player_id: number;
  attribute_key: string;
  score: number;
};

export type PlayerAttributesRow = {
  player_id: number;
  attrs: Record<string, number>;
  episode_id: string | null;
  updated_at: string;
};

export function getAttributesForPosition(position: string): RatingAttribute[] {
  const group = getPositionGroup(null, position);
  return POSITION_RATING_ATTRIBUTES[group];
}

export function normalizeEpisodeToken(raw: string): string {
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function buildRatingEpisodeUrl(token: string): string {
  const normalized = normalizeEpisodeToken(token);
  if (typeof window !== "undefined") {
    return `${window.location.origin}/rate/${normalized}`;
  }
  return `/rate/${normalized}`;
}

export function generateEpisodeToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

/** Веса характеристик для OVR — как в FIFA по позиции (сумма = 1) */
export const POSITION_ATTRIBUTE_WEIGHTS: Record<
  PositionGroup,
  Record<string, number>
> = {
  НАП: {
    shooting: 0.3,
    dribbling: 0.25,
    pace: 0.2,
    passing: 0.15,
    physical: 0.1,
  },
  ЦП: {
    passing: 0.28,
    defending: 0.22,
    physical: 0.22,
    pace: 0.18,
    shooting: 0.1,
  },
  ЗАЩ: {
    defending: 0.32,
    heading: 0.18,
    physical: 0.18,
    pace: 0.14,
    passing: 0.1,
    shooting: 0.08,
  },
  ВРТ: {
    reflexes: 0.35,
    handling: 0.3,
    positioning: 0.25,
    kicking: 0.1,
  },
};

/** Оценка 1–10 с голосования → стат 1–99 как на карточке FIFA */
export function attributeVote10ToFifaStat(score10: number): number {
  const clamped = Math.min(10, Math.max(1, score10));
  return Math.round(((clamped - 1) / 9) * 98 + 1);
}

/** OVR по формуле FIFA: взвешенное среднее статов с учётом позиции */
export function computeOverallFromAttributes(
  attrs: Record<string, number>,
  position: string
): number {
  const group = getPositionGroup(null, position);
  const weights = POSITION_ATTRIBUTE_WEIGHTS[group];
  const attributeDefs = POSITION_RATING_ATTRIBUTES[group];

  let weightedSum = 0;
  let weightTotal = 0;

  for (const attribute of attributeDefs) {
    const score10 = attrs[attribute.key];
    if (!score10 || score10 <= 0) continue;

    const weight = weights[attribute.key] ?? 0;
    if (weight <= 0) continue;

    weightedSum += attributeVote10ToFifaStat(score10) * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return 70;

  const ovr = weightedSum / weightTotal;
  return Math.min(99, Math.max(1, Math.round(ovr * 10) / 10));
}

export function formatFifaStat(score10: number): string {
  return String(attributeVote10ToFifaStat(score10));
}

export function formatAttributeScore(score: number): string {
  return score.toFixed(1).replace(/\.0$/, "");
}

export function formatEpisodeOverall(rating: number): string {
  return formatOverallRating(rating);
}

export function getVotesForPlayerPair(
  votes: RatingVoteRow[],
  voterPlayerId: number,
  ratedPlayerId: number
): RatingVoteRow[] {
  return votes.filter(
    (vote) =>
      vote.voter_player_id === voterPlayerId &&
      vote.rated_player_id === ratedPlayerId
  );
}

export function isPairRatingComplete(
  voterPlayerId: number,
  ratedPlayerId: number,
  ratedPosition: string,
  votes: RatingVoteRow[]
): boolean {
  const attributes = getAttributesForPosition(ratedPosition);
  const pairVotes = getVotesForPlayerPair(votes, voterPlayerId, ratedPlayerId);
  const keys = new Set(pairVotes.map((vote) => vote.attribute_key));
  return attributes.every((attribute) => keys.has(attribute.key));
}

export function isVoterComplete(
  voterPlayerId: number,
  players: { id: number; position: string }[],
  votes: RatingVoteRow[]
): boolean {
  return players
    .filter((player) => player.id !== voterPlayerId)
    .every((player) =>
      isPairRatingComplete(voterPlayerId, player.id, player.position, votes)
    );
}

export function countCompletedVoters(
  voterIds: number[],
  players: { id: number; position: string }[],
  votes: RatingVoteRow[]
): number {
  return voterIds.filter((voterId) => isVoterComplete(voterId, players, votes))
    .length;
}

export function buildScoresMapFromVotes(
  pairVotes: RatingVoteRow[]
): Record<string, number> {
  return pairVotes.reduce<Record<string, number>>((acc, vote) => {
    acc[vote.attribute_key] = vote.score;
    return acc;
  }, {});
}

export function aggregateEpisodeRatings(
  players: { id: number; position: string }[],
  votes: RatingVoteRow[]
): Record<number, { attrs: Record<string, number>; overall: number }> {
  const result: Record<number, { attrs: Record<string, number>; overall: number }> =
    {};

  for (const player of players) {
    const attributes = getAttributesForPosition(player.position);
    const attrs: Record<string, number> = {};

    for (const attribute of attributes) {
      const scores = votes
        .filter(
          (vote) =>
            vote.rated_player_id === player.id &&
            vote.attribute_key === attribute.key &&
            vote.voter_player_id !== player.id
        )
        .map((vote) => vote.score);

      if (scores.length === 0) continue;

      const avg =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      attrs[attribute.key] = Math.round(avg * 10) / 10;
    }

    result[player.id] = {
      attrs,
      overall: computeOverallFromAttributes(attrs, player.position),
    };
  }

  return result;
}

export function isEpisodeVotingComplete(
  voterIds: number[],
  players: { id: number; position: string }[],
  votes: RatingVoteRow[]
): boolean {
  if (voterIds.length === 0 || players.length < 2) return false;
  return countCompletedVoters(voterIds, players, votes) === voterIds.length;
}

export function countAcknowledgedPlayers(
  voterIds: number[],
  acknowledgedPlayerIds: number[]
): number {
  const ackSet = new Set(acknowledgedPlayerIds);
  return voterIds.filter((id) => ackSet.has(id)).length;
}

export function isEpisodeRevealComplete(
  voterIds: number[],
  acknowledgedPlayerIds: number[]
): boolean {
  if (voterIds.length === 0) return false;
  return countAcknowledgedPlayers(voterIds, acknowledgedPlayerIds) === voterIds.length;
}

export function hasPreviewRating(
  playerId: number,
  previews: Record<number, { attrs: Record<string, number>; overall: number }> | null | undefined
): boolean {
  const preview = previews?.[playerId];
  return Boolean(preview && Object.keys(preview.attrs).length > 0);
}
