import type { SupabaseClient } from "@supabase/supabase-js";
import { findChampionshipMatchForVoting, syncChampionshipGoalsAssistsFromClubMatch } from "@/lib/championship/syncVotingProgress";
import { openRatingVotingEndsAt } from "@/lib/matchRatings";

type DbClient = SupabaseClient;

type ClubMatchRow = {
  id: number;
  opponent: string;
  date: string;
  time: string;
  is_played: boolean;
  is_live?: boolean;
  ndfk_goals?: number | null;
  opponent_goals?: number | null;
  rating_voting_ends_at?: string | null;
};

export async function finishClubMatchWithChampionship(params: {
  db: DbClient;
  matchId: number;
  ndfkGoals?: number;
  opponentGoals?: number;
}): Promise<{
  ok: boolean;
  error: string | null;
  votingEndsAt: string | null;
  championshipSynced: boolean;
}> {
  const { db, matchId } = params;

  const { data: row, error: loadError } = await db
    .from("matches")
    .select(
      "id, opponent, date, time, is_played, is_live, ndfk_goals, opponent_goals, rating_voting_ends_at"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (loadError) {
    return { ok: false, error: loadError.message, votingEndsAt: null, championshipSynced: false };
  }
  if (!row) {
    return { ok: false, error: "Матч не найден", votingEndsAt: null, championshipSynced: false };
  }

  const match = row as ClubMatchRow;
  if (match.is_played) {
    return {
      ok: true,
      error: null,
      votingEndsAt: match.rating_voting_ends_at ?? null,
      championshipSynced: false,
    };
  }

  const ndfkGoals = Math.max(
    0,
    Math.floor(
      params.ndfkGoals ?? Number(match.ndfk_goals) ?? 0
    )
  );
  const opponentGoals = Math.max(
    0,
    Math.floor(
      params.opponentGoals ?? Number(match.opponent_goals) ?? 0
    )
  );

  const votingEndsAt = openRatingVotingEndsAt(match);

  const { error: updateError } = await db
    .from("matches")
    .update({
      is_played: true,
      is_live: false,
      ndfk_goals: ndfkGoals,
      opponent_goals: opponentGoals,
      rating_voting_ends_at: votingEndsAt,
    })
    .eq("id", matchId);

  if (updateError) {
    return { ok: false, error: updateError.message, votingEndsAt: null, championshipSynced: false };
  }

  let championshipSynced = false;
  const link = await findChampionshipMatchForVoting(db, match);

  if (link) {
    const { data: champMatch, error: champLoadError } = await db
      .from("championship_matches")
      .select("id, home_team_id, away_team_id")
      .eq("id", link.championshipMatchId)
      .maybeSingle();

    if (champLoadError) {
      return { ok: false, error: champLoadError.message, votingEndsAt, championshipSynced: false };
    }

    if (champMatch) {
      const weAreHome = Number(champMatch.home_team_id) === link.teamId;
      const homeGoals = weAreHome ? ndfkGoals : opponentGoals;
      const awayGoals = weAreHome ? opponentGoals : ndfkGoals;

      const { error: champError } = await db
        .from("championship_matches")
        .update({
          home_goals: homeGoals,
          away_goals: awayGoals,
          is_played: true,
          is_live: false,
        })
        .eq("id", link.championshipMatchId);

      if (champError) {
        return { ok: false, error: champError.message, votingEndsAt, championshipSynced: false };
      }

      championshipSynced = true;

      try {
        await syncChampionshipGoalsAssistsFromClubMatch(db, matchId);
      } catch (syncError) {
        console.error("syncChampionshipGoalsAssistsFromClubMatch failed", syncError);
      }
    }
  }

  return { ok: true, error: null, votingEndsAt, championshipSynced };
}
