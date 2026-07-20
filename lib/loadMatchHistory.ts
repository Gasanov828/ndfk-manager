import {
  getPlayedMatches,
  type MatchHistoryEntry,
  type MatchPlayerStat,
  type MatchWithResult,
} from "@/lib/matchHistory";
import { createClient } from "@/lib/supabase/server";

export async function loadMatchHistory(): Promise<{
  history: MatchHistoryEntry[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("*");

  if (matchesError) {
    return {
      history: [],
      error: matchesError.message.includes("ndfk_goals")
        ? "Нужно выполнить SQL-миграцию из supabase/match_history.sql"
        : matchesError.message,
    };
  }

  const played = getPlayedMatches((matches ?? []) as MatchWithResult[]);

  if (played.length === 0) {
    return { history: [], error: null };
  }

  const matchIds = played.map((match) => match.id);
  const { data: stats, error: statsError } = await supabase
    .from("match_player_stats")
    .select("*, player:players(id, name, position, rating)")
    .in("match_id", matchIds)
    .order("goals", { ascending: false });

  if (statsError) {
    return {
      history: [],
      error: statsError.message.includes("match_player_stats")
        ? "Нужно выполнить SQL-миграцию из supabase/match_history.sql"
        : statsError.message,
    };
  }

  const statsByMatch = new Map<number, MatchPlayerStat[]>();
  for (const row of stats ?? []) {
    const stat = row as MatchPlayerStat;
    const list = statsByMatch.get(stat.match_id) ?? [];
    list.push(stat);
    statsByMatch.set(stat.match_id, list);
  }

  const history = played.map((match) => ({
    ...match,
    stats: statsByMatch.get(match.id) ?? [],
  }));

  return { history, error: null };
}
