import {
  deriveLevelFromTotalXp,
  progressBarPercent,
} from "@/lib/championship/progressFormula";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

export type PlayerSeasonProgressSnapshot = {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNext: number;
  percent: number;
  seasonRating: number;
};

export async function fetchPlayerSeasonProgress(
  playerId: number
): Promise<PlayerSeasonProgressSnapshot | null> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;

  const { data: championship } = await supabase
    .from("championships")
    .select("id")
    .eq("status", "active")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!championship) return null;

  const { data: row, error } = await supabase
    .from("championship_player_progress")
    .select("season_xp, season_level, season_rating")
    .eq("championship_id", championship.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (error || !row) return null;

  const totalXp = Number(row.season_xp) || 0;
  const derived = deriveLevelFromTotalXp(totalXp);

  return {
    level: Number(row.season_level) || derived.level,
    totalXp,
    xpIntoLevel: derived.xpIntoLevel,
    xpForNext: derived.xpForNext,
    percent: progressBarPercent(derived.xpIntoLevel, derived.xpForNext),
    seasonRating: Number(row.season_rating) || 0,
  };
}
