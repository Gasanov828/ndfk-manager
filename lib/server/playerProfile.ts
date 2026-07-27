import type { Player } from "@/lib/lineup";
import { getRatingDelta, type MatchRatingSummary } from "@/lib/matchRatings";
import type { Match } from "@/lib/matches";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";
import type { TrainingRatingSummary } from "@/lib/trainingRatings";
import { getTeamPageData } from "@/lib/server/teamData";

type Relation<T> = T | T[] | null | undefined;

export type PlayerMatchStatRow = {
  id: number;
  match_id: number;
  player_id: number;
  goals: number;
  assists: number;
  saves: number | null;
  match?: Relation<Match>;
};

export type PlayerMatchRatingRow = MatchRatingSummary & {
  match?: Relation<Match>;
};

export type PlayerTrainingRatingRow = TrainingRatingSummary & {
  training?: Relation<{
    id: number;
    title: string;
    date: string;
    time: string;
    location?: string | null;
    is_completed?: boolean | null;
  }>;
};

export type PlayerCareerRow = {
  xp: number;
  level: number;
  title: string;
  matches_rated: number;
};

export type PlayerSeasonStatRow = {
  season: number;
  matches_rated: number;
  avg_rating: number;
};

export type PlayerAchievementRow = {
  achievement_key: string;
  earned_at: string;
  match_id: number | null;
};

export type PlayerProfileData = {
  player: Player;
  players: Player[];
  playerAttributes: Record<string, number> | null;
  matchStats: PlayerMatchStatRow[];
  matchRatings: PlayerMatchRatingRow[];
  trainingRatings: PlayerTrainingRatingRow[];
  career: PlayerCareerRow | null;
  seasonStats: PlayerSeasonStatRow[];
  achievements: PlayerAchievementRow[];
  loadError: string | null;
};

export function normalizeRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getPlayerProfileData(
  playerId: number
): Promise<PlayerProfileData | null> {
  const teamData = await getTeamPageData();
  const player = teamData.players.find((item) => item.id === playerId);

  if (!player) return null;

  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return {
      player,
      players: teamData.players,
      playerAttributes: teamData.playerAttributesMap[playerId] ?? null,
      matchStats: [],
      matchRatings: [],
      trainingRatings: [],
      career: null,
      seasonStats: [],
      achievements: [],
      loadError: "Supabase не настроен",
    };
  }

  const [
    statsResult,
    matchRatingsResult,
    trainingRatingsResult,
    careerResult,
    seasonResult,
    achievementsResult,
  ] = await Promise.all([
      supabase
        .from("match_player_stats")
        .select(
          "id, match_id, player_id, goals, assists, saves, match:matches(id, opponent, date, time, location, is_played, is_live, ndfk_goals, opponent_goals, rating_voting_ends_at)"
        )
        .eq("player_id", playerId),
      supabase
        .from("match_player_rating_summary")
        .select(
          "id, match_id, player_id, avg_stars, match_rating, vote_count, is_mvp, rating_before, rating_after, match:matches(id, opponent, date, time, location, is_played, is_live, ndfk_goals, opponent_goals, rating_voting_ends_at)"
        )
        .eq("player_id", playerId),
      supabase
        .from("training_rating_summary")
        .select(
          "id, training_id, player_id, avg_stars, training_rating, vote_count, rating_before, rating_after, training:training_sessions(id, title, date, time, location, is_completed)"
        )
        .eq("player_id", playerId),
      supabase
        .from("player_career")
        .select("xp, level, title, matches_rated")
        .eq("player_id", playerId)
        .maybeSingle(),
      supabase
        .from("player_season_stats")
        .select("season, matches_rated, avg_rating")
        .eq("player_id", playerId)
        .order("season", { ascending: false }),
      supabase
        .from("player_achievements")
        .select("achievement_key, earned_at, match_id")
        .eq("player_id", playerId)
        .order("earned_at", { ascending: false }),
    ]);

  // Gamification tables are optional (may not be migrated on hosted yet).
  const career = careerResult.error
    ? null
    : ((careerResult.data as PlayerCareerRow | null) ?? null);
  const seasonStats = careerResult.error
    ? []
    : ((seasonResult.data ?? []) as unknown as PlayerSeasonStatRow[]).map(
        (row) => ({
          season: Number(row.season),
          matches_rated: Number(row.matches_rated),
          avg_rating: Number(row.avg_rating),
        })
      );
  const achievements = achievementsResult.error
    ? []
    : ((achievementsResult.data ?? []) as unknown as PlayerAchievementRow[]);

  const loadError =
    statsResult.error?.message ??
    matchRatingsResult.error?.message ??
    trainingRatingsResult.error?.message ??
    null;

  return {
    player,
    players: teamData.players,
    playerAttributes: teamData.playerAttributesMap[playerId] ?? null,
    matchStats: ((statsResult.data ?? []) as unknown as PlayerMatchStatRow[])
      .map((row) => ({ ...row, saves: row.saves ?? 0 }))
      .sort((a, b) => {
        const matchA = normalizeRelation(a.match);
        const matchB = normalizeRelation(b.match);
        return (matchB?.date ?? "").localeCompare(matchA?.date ?? "");
      }),
    matchRatings: (
      (matchRatingsResult.data ?? []) as unknown as PlayerMatchRatingRow[]
    )
      .map((row) => ({
        ...row,
        match_rating: Number(row.match_rating),
        rating_before:
          row.rating_before != null ? Number(row.rating_before) : null,
        rating_after: row.rating_after != null ? Number(row.rating_after) : null,
        rating_delta:
          row.rating_delta != null
            ? Number(row.rating_delta)
            : getRatingDelta(row.rating_before, row.rating_after),
      }))
      .sort((a, b) => {
        const matchA = normalizeRelation(a.match);
        const matchB = normalizeRelation(b.match);
        return (matchB?.date ?? "").localeCompare(matchA?.date ?? "");
      }),
    trainingRatings: (
      (trainingRatingsResult.data ?? []) as unknown as PlayerTrainingRatingRow[]
    )
      .map((row) => ({
        ...row,
        training_rating: Number(row.training_rating),
        rating_before:
          row.rating_before != null ? Number(row.rating_before) : null,
        rating_after: row.rating_after != null ? Number(row.rating_after) : null,
      }))
      .sort((a, b) => {
        const trainingA = normalizeRelation(a.training);
        const trainingB = normalizeRelation(b.training);
        return (trainingB?.date ?? "").localeCompare(trainingA?.date ?? "");
      }),
    career,
    seasonStats,
    achievements,
    loadError,
  };
}
