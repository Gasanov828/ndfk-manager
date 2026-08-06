import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";
import type { CareerMvpRecord } from "@/lib/careerMvp";

type MvpSummaryRow = {
  player_id: number;
  match_id: number;
  match_rating: number;
  match:
    | { opponent: string; date: string }
    | { opponent: string; date: string }[]
    | null;
  player: { name: string } | { name: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function fetchConfirmedMvpRecords(): Promise<CareerMvpRecord[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("match_player_rating_summary")
    .select(
      "player_id, match_id, match_rating, match:matches(opponent, date), player:players(name)"
    )
    .eq("is_mvp", true);

  if (error || !data) return [];

  const records: CareerMvpRecord[] = [];
  for (const row of data as MvpSummaryRow[]) {
    const match = one(row.match);
    const player = one(row.player);
    if (!match || !player) continue;

    records.push({
      matchId: row.match_id,
      playerId: row.player_id,
      playerName: player.name,
      opponent: match.opponent,
      matchDate: match.date,
      matchRating: Number(row.match_rating),
    });
  }

  return records.sort((a, b) => {
    const byDate = b.matchDate.localeCompare(a.matchDate);
    if (byDate !== 0) return byDate;
    return b.matchId - a.matchId;
  });
}

export async function getConfirmedMvpRecords(): Promise<CareerMvpRecord[]> {
  return fetchConfirmedMvpRecords();
}
