import { notifyMatchStarted } from "@/lib/matchStatus";
import { supabase } from "@/lib/supabase";

export async function startLiveMatch(
  matchId: number
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from("matches")
    .update({ is_live: true })
    .eq("id", matchId);

  if (error) {
    return { ok: false, error: error.message };
  }

  notifyMatchStarted();
  return { ok: true, error: null };
}
