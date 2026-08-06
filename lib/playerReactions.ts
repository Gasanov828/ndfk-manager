import type { Match } from "@/lib/matches";
import { sortMatchesByDate } from "@/lib/matches";
import { getLatestPlayedMatch } from "@/lib/matchRatings";

export type ReactionCode =
  | "form"
  | "machine"
  | "accurate"
  | "wall"
  | "smart_pass"
  | "legend"
  | "soul"
  | "speed";

export type ReactionDef = {
  code: ReactionCode;
  emoji: string;
  label: string;
};

export const PLAYER_REACTIONS: ReactionDef[] = [
  { code: "form", emoji: "🔥", label: "Отличная форма" },
  { code: "machine", emoji: "💪", label: "Машина" },
  { code: "accurate", emoji: "🎯", label: "Точный" },
  { code: "wall", emoji: "🛡", label: "Стена" },
  { code: "smart_pass", emoji: "🧠", label: "Умный пас" },
  { code: "legend", emoji: "👏", label: "Красавчик" },
  { code: "soul", emoji: "❤️", label: "Душа команды" },
  { code: "speed", emoji: "⚡", label: "Скорость" },
];

export const REACTION_BY_CODE: Record<ReactionCode, ReactionDef> =
  Object.fromEntries(
    PLAYER_REACTIONS.map((item) => [item.code, item])
  ) as Record<ReactionCode, ReactionDef>;

export function isReactionCode(value: string): value is ReactionCode {
  return value in REACTION_BY_CODE;
}

/**
 * Матч для реакций = последний сыгранный.
 * Окно записи открыто, пока админ не создал матч с id больше этого.
 */
export function getReactionMatchContext(matches: Match[]): {
  match: Match | null;
  open: boolean;
} {
  const sorted = sortMatchesByDate(matches);
  const match = getLatestPlayedMatch(sorted);
  if (!match) return { match: null, open: false };

  const hasNewerMatch = sorted.some((row) => row.id > match.id);
  return { match, open: !hasNewerMatch };
}

export type ReactionCountMap = Record<number, Partial<Record<ReactionCode, number>>>;

export function aggregateReactionCounts(
  rows: Array<{ to_player_id: number; reaction_code: string }>
): ReactionCountMap {
  const map: ReactionCountMap = {};
  for (const row of rows) {
    if (!isReactionCode(row.reaction_code)) continue;
    const bucket = map[row.to_player_id] ?? {};
    bucket[row.reaction_code] = (bucket[row.reaction_code] ?? 0) + 1;
    map[row.to_player_id] = bucket;
  }
  return map;
}

export type MyReactionMap = Record<number, ReactionCode>;

export function buildMyReactionMap(
  rows: Array<{ to_player_id: number; reaction_code: string }>
): MyReactionMap {
  const map: MyReactionMap = {};
  for (const row of rows) {
    if (!isReactionCode(row.reaction_code)) continue;
    map[row.to_player_id] = row.reaction_code;
  }
  return map;
}

export type ReputationRow = {
  code: ReactionCode;
  emoji: string;
  label: string;
  count: number;
};

export function formatReputationRows(
  totals: Array<{ reaction_code: string; count: number }>
): ReputationRow[] {
  const byCode = new Map(
    totals.map((row) => [row.reaction_code, Number(row.count) || 0])
  );

  return PLAYER_REACTIONS.map((def) => ({
    code: def.code,
    emoji: def.emoji,
    label: def.label,
    count: byCode.get(def.code) ?? 0,
  })).filter((row) => row.count > 0);
}
