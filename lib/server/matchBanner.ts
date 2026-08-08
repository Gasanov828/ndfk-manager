import {
  getLiveMatch,
  getNextUpcomingMatch,
  type MatchWithLive,
} from "@/lib/matchStatus";
import { createClient } from "@/lib/supabase/server";

export type MatchBannerData = {
  liveMatch: MatchWithLive | null;
  upcomingMatch: MatchWithLive | null;
};

export async function getMatchBannerData(): Promise<MatchBannerData> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("matches").select("*");
    const rows = (data ?? []) as MatchWithLive[];
    const liveMatch = getLiveMatch(rows);

    return {
      liveMatch,
      upcomingMatch: liveMatch ? null : getNextUpcomingMatch(rows),
    };
  } catch {
    return { liveMatch: null, upcomingMatch: null };
  }
}
