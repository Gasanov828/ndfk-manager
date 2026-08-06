import { createClient } from "@/lib/supabase/server";
import type { AdminPlayer } from "@/lib/server/adminPlayers";

export type AdminTechniquePageData = {
  players: AdminPlayer[];
  attributesMap: Record<number, Record<string, number>>;
  loadError: string | null;
};

const PLAYER_COLUMNS =
  "id, name, position, rating, goals, assists, status, lineup_position, photo_url";

export async function getAdminTechniquePageData(): Promise<AdminTechniquePageData> {
  const supabase = await createClient();

  const [playersResult, attrsResult] = await Promise.all([
    supabase
      .from("players")
      .select(PLAYER_COLUMNS)
      .order("rating", { ascending: false }),
    supabase.from("player_attributes").select("player_id, attrs"),
  ]);

  const loadError =
    playersResult.error?.message ?? attrsResult.error?.message ?? null;

  const attributesMap: Record<number, Record<string, number>> = {};
  for (const row of attrsResult.data ?? []) {
    attributesMap[row.player_id] = (row.attrs ?? {}) as Record<string, number>;
  }

  return {
    players: (playersResult.data ?? []) as AdminPlayer[],
    attributesMap,
    loadError,
  };
}
