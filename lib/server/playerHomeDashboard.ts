import { createClient } from "@/lib/supabase/server";
import {
  buildFormSeries,
  type PlayerFormPoint,
  type PlayerFormRatingRow,
} from "@/lib/playerHomeDashboard";

export async function getPlayerFormRatings(
  playerId: number,
  limit = 6
): Promise<PlayerFormPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_player_rating_summary")
    .select(
      "match_id, match_rating, vote_count, is_mvp, rating_before, rating_after, match:matches(opponent, date, is_played)"
    )
    .eq("player_id", playerId);

  if (error || !data) return [];

  return buildFormSeries(data as unknown as PlayerFormRatingRow[], limit);
}

export async function getPlayerMatchesPlayedCount(
  playerId: number
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_player_stats")
    .select("match_id")
    .eq("player_id", playerId);

  if (error || !data) return 0;

  return new Set(data.map((row) => row.match_id)).size;
}
