import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildRatingSummaryMap,
  getLatestPlayedMatch,
  getLatestPlayedMatchWithRatings,
  isVotingDeadlinePassed,
  type MatchRatingSummary,
} from "@/lib/matchRatings";
import type { Match } from "@/lib/matches";
import { recalculateMatchRatings } from "@/lib/matchRatingSync";
import type { Player } from "@/lib/lineup";
import {
  computePlayerCareerTotals,
  syncPlayerCareerTotals,
} from "@/lib/playerCareerSync";
import { syncChampionshipLiveMatches } from "@/lib/championship/syncLiveMatches";
import { unstable_cache } from "next/cache";

const PLAYER_COLUMNS =
  "id, name, position, rating, goals, assists, status, lineup_position, photo_url";

const MATCH_COLUMNS =
  "id, opponent, date, time, location, is_played, is_live, ndfk_goals, opponent_goals, rating_voting_ends_at";

function createPublicClient() {
  return createPublicSupabaseClient();
}

async function fetchPlayers(): Promise<{
  players: Player[];
  error: string | null;
}> {
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
}

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

async function fetchRatingSummariesFresh(matchId: number): Promise<MatchRatingSummary[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("match_player_rating_summary")
    .select(
      "player_id, match_rating, rating_before, rating_after, is_mvp, vote_count"
    )
    .eq("match_id", matchId);

  return (data ?? []) as unknown as MatchRatingSummary[];
}

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
  const admin = createAdminClient();
  const publicClient = createPublicClient();

  // Чиним залипшие голы/пассы (в т.ч. после удаления тестовых матчей).
  // С service role — надёжно; без него пробуем public (может не пройти RLS).
  if (admin) {
    try {
      await syncPlayerCareerTotals(admin);
    } catch (error) {
      console.error("syncPlayerCareerTotals failed", error);
    }

    try {
      await syncChampionshipLiveMatches(admin);
    } catch (error) {
      console.error("syncChampionshipLiveMatches failed", error);
    }
  }

  const [
    { players: rawPlayers, error: playersError },
    matches,
    playerAttributesMap,
  ] = await Promise.all([
    fetchPlayers(),
    fetchMatches(),
    getCachedPlayerAttributes(),
  ]);

  // Поверх кэша — актуальные голы/пассы только из существующих матчей
  let players = rawPlayers;
  const statsClient = admin ?? publicClient;
  if (statsClient && rawPlayers.length > 0) {
    try {
      const totals = await computePlayerCareerTotals(statsClient);
      players = rawPlayers.map((player) => {
        const next = totals.get(player.id) ?? { goals: 0, assists: 0 };
        if (player.goals === next.goals && player.assists === next.assists) {
          return player;
        }
        return { ...player, goals: next.goals, assists: next.assists };
      });
    } catch (error) {
      console.error("computePlayerCareerTotals failed", error);
    }
  }

  const ratedMatchIds = await getCachedRatedMatchIds();
  const latestRatedMatch = getLatestPlayedMatchWithRatings(
    matches,
    ratedMatchIds
  );
  const latestPlayed = latestRatedMatch ?? getLatestPlayedMatch(matches);
  let summaries = latestRatedMatch
    ? await getCachedRatingSummaries(latestRatedMatch.id)
    : [];

  const needsFinalMvp = Boolean(
    admin &&
      latestRatedMatch &&
      isVotingDeadlinePassed(latestRatedMatch) &&
      summaries.some((row) => row.vote_count > 0) &&
      !summaries.some((row) => row.is_mvp)
  );

  if (needsFinalMvp && latestRatedMatch && admin) {
    try {
      await recalculateMatchRatings(latestRatedMatch.id, admin);

      const [freshPlayers, freshSummaries] = await Promise.all([
        fetchPlayers(),
        fetchRatingSummariesFresh(latestRatedMatch.id),
      ]);

      if (!freshPlayers.error && freshPlayers.players.length > 0) {
        players = freshPlayers.players;
      }
      summaries = freshSummaries;
    } catch (error) {
      console.error("finalize match ratings failed", error);
    }
  }

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
