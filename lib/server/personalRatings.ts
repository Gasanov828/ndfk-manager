import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";
import { isVotingDeadlinePassed } from "@/lib/matchRatings";
import {
  buildPersonalRatingStats,
  type PersonalRatingMatch,
  type PersonalRatingStats,
} from "@/lib/personalAchievements";

type SummaryRow = {
  match_id: number;
  match_rating: number;
  vote_count: number;
  is_mvp: boolean;
  match:
    | {
        opponent: string;
        date: string;
        time?: string | null;
        is_played?: boolean | null;
        rating_voting_ends_at?: string | null;
      }
    | {
        opponent: string;
        date: string;
        time?: string | null;
        is_played?: boolean | null;
        rating_voting_ends_at?: string | null;
      }[]
    | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * Оценки игрока только после закрытия голосования —
 * в копилку идут уже итоговые матчи.
 */
export async function getPersonalRatingStats(
  playerId: number
): Promise<PersonalRatingStats> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return buildPersonalRatingStats([]);
  }

  const { data, error } = await supabase
    .from("match_player_rating_summary")
    .select(
      "match_id, match_rating, vote_count, is_mvp, match:matches(opponent, date, time, is_played, rating_voting_ends_at)"
    )
    .eq("player_id", playerId);

  if (error || !data) {
    return buildPersonalRatingStats([]);
  }

  const matches: PersonalRatingMatch[] = [];

  for (const row of data as SummaryRow[]) {
    const match = one(row.match);
    if (!match) continue;

    const deadlinePassed = isVotingDeadlinePassed({
      date: match.date,
      time: match.time || "00:00",
      is_played: Boolean(match.is_played),
      rating_voting_ends_at: match.rating_voting_ends_at ?? null,
    });

    if (!deadlinePassed) continue;
    if ((row.vote_count ?? 0) <= 0) continue;

    matches.push({
      matchId: row.match_id,
      matchRating: Number(row.match_rating) || 0,
      voteCount: row.vote_count ?? 0,
      isMvp: Boolean(row.is_mvp),
      opponent: match.opponent,
      matchDate: match.date,
    });
  }

  return buildPersonalRatingStats(matches);
}
