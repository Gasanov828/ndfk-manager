import { getConfirmedMvpRecords } from "@/lib/server/careerMvp";
import { getTeamPageData } from "@/lib/server/teamData";
import { loadMatchHistory } from "@/lib/loadMatchHistory";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";
import {
  buildTournamentBundle,
  type TournamentBundle,
} from "@/lib/tournament/build";

export async function getTournamentData(): Promise<{
  data: TournamentBundle;
  error: string | null;
}> {
  const [teamData, historyResult, mvpRecords] = await Promise.all([
    getTeamPageData(),
    loadMatchHistory(),
    getConfirmedMvpRecords(),
  ]);

  if (teamData.playersError) {
    return {
      data: emptyBundle(),
      error: teamData.playersError,
    };
  }

  const supabase = createPublicSupabaseClient();
  let ratingRows: { player_id: number; match_rating: number; is_mvp: boolean }[] =
    [];

  if (supabase) {
    const { data } = await supabase
      .from("match_player_rating_summary")
      .select("player_id, match_rating, is_mvp");
    ratingRows = (data ?? []).map((row) => ({
      player_id: Number(row.player_id),
      match_rating: Number(row.match_rating) || 0,
      is_mvp: Boolean(row.is_mvp),
    }));
  }

  return {
    data: buildTournamentBundle({
      players: teamData.players,
      matches: teamData.matches,
      history: historyResult.history,
      ratingRows,
      mvpRecords,
    }),
    error: historyResult.error,
  };
}

function emptyBundle(): TournamentBundle {
  return {
    standings: [],
    matches: [],
    scorers: [],
    assisters: [],
    mvpBoard: [],
    stats: [],
    awards: [],
  };
}
