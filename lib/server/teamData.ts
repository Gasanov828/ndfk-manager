import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";
import {
  buildRatingSummaryMap,
  getLatestPlayedMatch,
  getLatestPlayedMatchWithRatings,
  type MatchRatingSummary,
} from "@/lib/matchRatings";
import type { Match } from "@/lib/matches";
import type { Player } from "@/lib/lineup";
import { unstable_cache } from "next/cache";

const PLAYER_COLUMNS =
  "id, name, position, rating, goals, assists, status, lineup_position, photo_url";

const MATCH_COLUMNS =
  "id, opponent, date, time, location, is_played, is_live, ndfk_goals, opponent_goals, rating_voting_ends_at";

function createPublicClient() {
  return createPublicSupabaseClient();
}

const getCachedPlayers = unstable_cache(
  async (): Promise<{ players: Player[]; error: string | null }> => {
    const supabase = createPublicClient();
    if (!supabase) {
      return {
        players: [],
        error: "Supabase не настроен (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)",
      };
    }
    const { data, error } = await supabase
      .from("players")
      .select(PLAYER_COLUMNS)
      .order("rating", { ascending: false });

    return {
      players: (data ?? []) as Player[],
      error: error?.message ?? null,
    };
  },
  ["public-players"],
  { revalidate: 30 }
);

async function fetchMatches(): Promise<Match[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .order("date", { ascending: false });

  return (data ?? []) as Match[];
}

const getCachedRatedMatchIds = unstable_cache(
  async (): Promise<number[]> => {
    const supabase = createPublicClient();
    if (!supabase) return [];

    const { data } = await supabase
      .from("match_player_rating_summary")
      .select("match_id");

    return [...new Set((data ?? []).map((row) => row.match_id))];
  },
  ["public-rated-match-ids"],
  { revalidate: 30 }
);

const getCachedRatingSummaries = unstable_cache(
  async (matchId: number) => {
    const supabase = createPublicClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("match_player_rating_summary")
      .select(
        "player_id, match_rating, rating_before, rating_after, is_mvp, vote_count"
      )
      .eq("match_id", matchId);

    return (data ?? []) as unknown as MatchRatingSummary[];
  },
  ["public-rating-summaries"],
  { revalidate: 30 }
);

export type TeamPageData = {
  players: Player[];
  matches: Match[];
  playersError: string | null;
  latestPlayed: Match | null;
  summaries: MatchRatingSummary[];
  ratingSummaryMap: ReturnType<typeof buildRatingSummaryMap>;
  playerAttributesMap: Record<number, Record<string, number>>;
};

const getCachedPlayerAttributes = unstable_cache(
  async (): Promise<Record<number, Record<string, number>>> => {
    const supabase = createPublicClient();
    if (!supabase) return {};

    const { data } = await supabase
      .from("player_attributes")
      .select("player_id, attrs");

    const map: Record<number, Record<string, number>> = {};
    for (const row of data ?? []) {
      map[row.player_id] = row.attrs as Record<string, number>;
    }

    return map;
  },
  ["public-player-attributes"],
  { revalidate: 30 }
);

export async function getTeamPageData(): Promise<TeamPageData> {
  const [
    { players, error: playersError },
    matches,
    playerAttributesMap,
  ] = await Promise.all([
    getCachedPlayers(),
    fetchMatches(),
    getCachedPlayerAttributes(),
  ]);

  const ratedMatchIds = await getCachedRatedMatchIds();
  const latestRatedMatch = getLatestPlayedMatchWithRatings(
    matches,
    ratedMatchIds
  );
  const latestPlayed = latestRatedMatch ?? getLatestPlayedMatch(matches);
  const summaries = latestRatedMatch
    ? await getCachedRatingSummaries(latestRatedMatch.id)
    : [];

  return {
    players,
    matches,
    playersError,
    latestPlayed,
    summaries,
    ratingSummaryMap: buildRatingSummaryMap(summaries),
    playerAttributesMap,
  };
}

export function getRatingDeltas(
  ratingSummaryMap: ReturnType<typeof buildRatingSummaryMap>
): Record<number, number | null | undefined> {
  const ratingDeltas: Record<number, number | null | undefined> = {};

  for (const [playerId, row] of Object.entries(ratingSummaryMap)) {
    ratingDeltas[Number(playerId)] = row.rating_delta;
  }

  return ratingDeltas;
}
