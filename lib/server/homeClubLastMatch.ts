import {
  getMatchAssisters,
  getMatchGoalScorers,
  type MatchPlayerStat,
} from "@/lib/matchHistory";
import type { Match } from "@/lib/matches";
import { createClient } from "@/lib/supabase/server";

export type HomeClubLastMatchPlayerStat = {
  playerId: number;
  name: string;
  count: number;
};

export type HomeClubLastMatchStrip = {
  opponent: string;
  ndfkGoals: number;
  opponentGoals: number;
  scorers: HomeClubLastMatchPlayerStat[];
  assisters: HomeClubLastMatchPlayerStat[];
};

function toStatRows(
  rows: MatchPlayerStat[],
  field: "goals" | "assists"
): HomeClubLastMatchPlayerStat[] {
  return rows.slice(0, 3).map((row) => ({
    playerId: row.player_id,
    name: row.player?.name ?? "—",
    count: field === "goals" ? row.goals : row.assists,
  }));
}

/** Клубный товарищеский матч из admin matches — блок под таблицей чемпионата. */
export async function loadHomeClubLastMatchStrip(
  latestPlayed: Match | null
): Promise<HomeClubLastMatchStrip | null> {
  if (
    !latestPlayed?.is_played ||
    latestPlayed.ndfk_goals == null ||
    latestPlayed.opponent_goals == null
  ) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("match_player_stats")
    .select("goals, assists, player_id, player:players(name)")
    .eq("match_id", latestPlayed.id);

  const stats = (data ?? []) as unknown as MatchPlayerStat[];

  return {
    opponent: latestPlayed.opponent,
    ndfkGoals: latestPlayed.ndfk_goals,
    opponentGoals: latestPlayed.opponent_goals,
    scorers: toStatRows(getMatchGoalScorers(stats), "goals"),
    assisters: toStatRows(getMatchAssisters(stats), "assists"),
  };
}
