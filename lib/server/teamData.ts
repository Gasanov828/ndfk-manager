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
import { syncChampionshipGoalsAssistsFromClubMatch } from "@/lib/championship/syncVotingProgress";
import {
  enrichMatchMvpInfo,
  getActiveVoterProgress,
  getMatchMvpFromSummaries,
  type MatchMvpInfo,
} from "@/lib/matchRatings";
import {
  filterParticipatingPlayerIds,
  getMatchRatingVoterIds,
} from "@/lib/matchParticipation";
import { getCanViewPlayerPhotos } from "@/lib/server/photoVisibility";
import { maskPlayersPhotos } from "@/lib/playerPhotoPrivacy";

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

async function fetchRatedMatchIds(): Promise<number[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("match_player_rating_summary")
    .select("match_id");

  return [...new Set((data ?? []).map((row) => row.match_id))];
}

async function fetchRatingSummaries(matchId: number): Promise<MatchRatingSummary[]> {
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

async function fetchPlayerAttributes(): Promise<
  Record<number, Record<string, number>>
> {
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
}

export type TeamPageData = {
  players: Player[];
  matches: Match[];
  playersError: string | null;
  latestPlayed: Match | null;
  summaries: MatchRatingSummary[];
  ratingSummaryMap: ReturnType<typeof buildRatingSummaryMap>;
  playerAttributesMap: Record<number, Record<string, number>>;
  latestMatchMvp: MatchMvpInfo | null;
  /** Точное число проголосовавших за latestPlayed — считается один раз и переиспользуется
   * везде, где раньше был неточный max(vote_count) из getMatchMvpFromSummaries. */
  latestMatchVoterCount: number | null;
};

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
    fetchPlayerAttributes(),
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

  const ratedMatchIds = await fetchRatedMatchIds();
  const latestRatedMatch = getLatestPlayedMatchWithRatings(
    matches,
    ratedMatchIds
  );
  const latestPlayed = latestRatedMatch ?? getLatestPlayedMatch(matches);
  let summaries = latestRatedMatch
    ? await fetchRatingSummaries(latestRatedMatch.id)
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
        fetchRatingSummaries(latestRatedMatch.id),
      ]);

      if (!freshPlayers.error && freshPlayers.players.length > 0) {
        players = freshPlayers.players;
      }
      summaries = freshSummaries;
    } catch (error) {
      console.error("finalize match ratings failed", error);
    }
  }

  if (admin && latestPlayed?.is_played) {
    try {
      await syncChampionshipGoalsAssistsFromClubMatch(admin, latestPlayed.id);
    } catch (error) {
      console.error("syncChampionshipGoalsAssistsFromClubMatch failed", error);
    }
  }

  let latestMatchMvp: MatchMvpInfo | null = null;
  let latestMatchVoterCount: number | null = null;
  const liveMatch = matches.find((match) => match.is_live) ?? null;
  if (latestPlayed && summaries.length > 0 && !liveMatch) {
    latestMatchMvp = getMatchMvpFromSummaries(
      summaries,
      players.map((player) => ({ id: player.id, name: player.name })),
      latestPlayed
    );

    const statsClient = admin ?? publicClient;
    if (statsClient) {
      const [{ data: participationRows }, { data: voteRows }] = await Promise.all([
        statsClient
          .from("match_player_participation")
          .select("player_id, participated, skipped_rating_vote")
          .eq("match_id", latestPlayed.id),
        statsClient
          .from("match_player_rating_votes")
          .select("voter_player_id")
          .eq("match_id", latestPlayed.id),
      ]);

      // Точное число проголосовавших — вместо приближения по max(vote_count),
      // которое стало неточным после разрешения частичных бюллетеней.
      const participantIds = filterParticipatingPlayerIds(
        players.map((player) => player.id),
        participationRows ?? []
      );
      const ratingVoterIds = getMatchRatingVoterIds(
        participantIds,
        participationRows ?? []
      );
      const exactVoterProgress = getActiveVoterProgress(
        ratingVoterIds,
        (voteRows ?? []).map((row) => ({
          voter_player_id: Number(row.voter_player_id),
        }))
      );
      latestMatchVoterCount =
        exactVoterProgress.total > 0 ? exactVoterProgress.votedCount : null;
    }

    if (latestMatchMvp) {
      const mvpPlayer = players.find(
        (player) => player.id === latestMatchMvp!.playerId
      );
      if (statsClient) {
        const { data: statRows } = await statsClient
          .from("match_player_stats")
          .select("player_id, goals, assists")
          .eq("match_id", latestPlayed.id)
          .eq("player_id", latestMatchMvp.playerId)
          .maybeSingle();

        latestMatchMvp = enrichMatchMvpInfo(latestMatchMvp, {
          photoUrl: mvpPlayer?.photo_url ?? null,
          matchGoals: statRows ? Number(statRows.goals) || 0 : null,
          matchAssists: statRows ? Number(statRows.assists) || 0 : null,
          voterTotal: latestMatchVoterCount,
        });
      }
    }
  }

  const canViewPhotos = await getCanViewPlayerPhotos();

  return {
    players: maskPlayersPhotos(players, canViewPhotos),
    matches,
    playersError,
    latestPlayed,
    summaries,
    ratingSummaryMap: buildRatingSummaryMap(summaries),
    playerAttributesMap,
    latestMatchMvp,
    latestMatchVoterCount,
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
