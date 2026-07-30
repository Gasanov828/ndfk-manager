import { getMatchDateTime } from "@/lib/matchCountdown";
import type { Match } from "@/lib/matches";

export type PlayerBase = {
  id: number;
  name: string;
  position: string;
  goals: number;
  assists: number;
  rating?: number;
  photo_url?: string | null;
};

export type PlayerAward = {
  player: PlayerBase;
  primaryValue: number;
  secondaryValue?: number;
};

export type MatchStatRow = {
  player_id: number;
  goals: number;
  assists: number;
  saves?: number;
  match?: Pick<Match, "date" | "is_played"> | null;
};

type RawMatchStatRow = {
  player_id: number;
  goals: number;
  assists: number;
  saves?: number | null;
  match?:
    | Pick<Match, "date" | "is_played">
    | Pick<Match, "date" | "is_played">[]
    | null;
};

export function normalizeMatchStatRows(
  rows: RawMatchStatRow[] | null | undefined
): MatchStatRow[] {
  return (rows ?? []).map((row) => {
    const match = Array.isArray(row.match) ? row.match[0] ?? null : row.match;
    return {
      player_id: row.player_id,
      goals: row.goals ?? 0,
      assists: row.assists ?? 0,
      saves: row.saves ?? 0,
      match: match ?? null,
    };
  });
}

export function getTopScorer(players: PlayerBase[]): PlayerAward | null {
  const sorted = [...players].sort(
    (a, b) => b.goals - a.goals || b.assists - a.assists
  );
  const player = sorted[0];
  if (!player || player.goals === 0) return null;

  return {
    player,
    primaryValue: player.goals,
    secondaryValue: player.assists,
  };
}

export function getTopAssister(players: PlayerBase[]): PlayerAward | null {
  const sorted = [...players].sort(
    (a, b) => b.assists - a.assists || b.goals - a.goals
  );
  const player = sorted[0];
  if (!player || player.assists === 0) return null;

  return {
    player,
    primaryValue: player.assists,
    secondaryValue: player.goals,
  };
}

export function getTopRated(players: PlayerBase[]): PlayerAward | null {
  const withRating = players.filter(
    (player) => typeof player.rating === "number" && Number.isFinite(player.rating)
  );
  if (withRating.length === 0) return null;

  const sorted = [...withRating].sort(
    (a, b) =>
      Number(b.rating) - Number(a.rating) ||
      b.goals - a.goals ||
      b.assists - a.assists
  );
  const player = sorted[0];
  if (!player) return null;

  return {
    player,
    primaryValue: Number(Number(player.rating).toFixed(1)),
    secondaryValue: player.goals + player.assists,
  };
}

/** Лучший по гол+пас */
export function getTopContributor(players: PlayerBase[]): PlayerAward | null {
  const sorted = [...players].sort(
    (a, b) =>
      b.goals + b.assists - (a.goals + a.assists) ||
      b.goals - a.goals ||
      b.assists - a.assists
  );
  const player = sorted[0];
  if (!player || player.goals + player.assists <= 0) return null;

  return {
    player,
    primaryValue: player.goals + player.assists,
    secondaryValue: player.goals,
  };
}

export function getCurrentMonthLabel(date = new Date()): string {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export function isInCurrentMonth(matchDate: string, now = new Date()): boolean {
  const parsed = getMatchDateTime({
    date: matchDate,
    time: "00:00",
  });

  if (!parsed) return false;

  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth()
  );
}

export function getPlayerOfMonth(
  players: PlayerBase[],
  stats: MatchStatRow[],
  now = new Date()
): PlayerAward | null {
  const totals = new Map<number, { goals: number; assists: number }>();

  for (const row of stats) {
    if (!row.match?.is_played || !row.match.date) continue;
    if (!isInCurrentMonth(row.match.date, now)) continue;

    const current = totals.get(row.player_id) ?? { goals: 0, assists: 0 };
    current.goals += row.goals;
    current.assists += row.assists;
    totals.set(row.player_id, current);
  }

  let bestPlayerId: number | null = null;
  let bestScore = -1;
  let bestGoals = 0;
  let bestAssists = 0;

  for (const [playerId, value] of totals) {
    const score = value.goals * 2 + value.assists;
    if (score > bestScore) {
      bestScore = score;
      bestPlayerId = playerId;
      bestGoals = value.goals;
      bestAssists = value.assists;
    }
  }

  if (!bestPlayerId || bestScore <= 0) return null;

  const player = players.find((item) => item.id === bestPlayerId);
  if (!player) return null;

  return {
    player,
    primaryValue: bestGoals,
    secondaryValue: bestAssists,
  };
}

/** Fallback: if month is empty, use season G+A leader as «форма сезона» */
export function getSeasonFormLeader(players: PlayerBase[]): PlayerAward | null {
  return getTopContributor(players);
}
