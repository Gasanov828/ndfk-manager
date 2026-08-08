import type { SupabaseClient } from "@supabase/supabase-js";

type DbClient = SupabaseClient<any, "public", any>;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Удаляет матч чемпионата и связанные записи (в т.ч. сыгранный тестовый). */
export async function removeChampionshipMatch(
  db: DbClient,
  matchId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: match, error: loadError } = await db
    .from("championship_matches")
    .select(
      "id, championship_id, home_team_id, away_team_id, match_date, match_time, is_live, tour_results_applied, home_team:championship_teams!championship_matches_home_team_id_fkey(name), away_team:championship_teams!championship_matches_away_team_id_fkey(name)"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (loadError || !match) {
    return { ok: false, error: loadError?.message ?? "Матч не найден" };
  }

  if (match.is_live) {
    return {
      ok: false,
      error: "LIVE-матч сначала завершите через live-пульт",
    };
  }

  const { data: homeClubTeam } = await db
    .from("championship_teams")
    .select("id, name")
    .eq("name", "Дженгутай")
    .maybeSingle();

  const homeClubId = homeClubTeam ? Number(homeClubTeam.id) : null;
  const home = one(match.home_team as { name: string } | { name: string }[] | null);
  const away = one(match.away_team as { name: string } | { name: string }[] | null);
  const weAreHome = homeClubId != null && Number(match.home_team_id) === homeClubId;
  const weAreAway = homeClubId != null && Number(match.away_team_id) === homeClubId;

  if (weAreHome || weAreAway) {
    const opponent = (weAreHome ? away?.name : home?.name) ?? null;
    if (opponent) {
      const { data: clubMatch } = await db
        .from("matches")
        .select("id, is_played")
        .eq("date", String(match.match_date))
        .eq("time", String(match.match_time || "18:00"))
        .eq("opponent", opponent)
        .maybeSingle();

      if (clubMatch) {
        const { error: clubDeleteError } = await db
          .from("matches")
          .delete()
          .eq("id", clubMatch.id);

        if (clubDeleteError) {
          return { ok: false, error: clubDeleteError.message };
        }
      }
    }
  }

  const { error: statsError } = await db
    .from("championship_match_player_stats")
    .delete()
    .eq("match_id", matchId);

  if (statsError) {
    return { ok: false, error: statsError.message };
  }

  const { error: deleteError } = await db
    .from("championship_matches")
    .delete()
    .eq("id", matchId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  return { ok: true };
}

/** Сбрасывает результат матча, оставляя его в расписании. */
export async function resetChampionshipMatchResult(
  db: DbClient,
  matchId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: match, error: loadError } = await db
    .from("championship_matches")
    .select(
      "id, home_team_id, away_team_id, match_date, match_time, is_live, home_team:championship_teams!championship_matches_home_team_id_fkey(name), away_team:championship_teams!championship_matches_away_team_id_fkey(name)"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (loadError || !match) {
    return { ok: false, error: loadError?.message ?? "Матч не найден" };
  }

  if (match.is_live) {
    return {
      ok: false,
      error: "LIVE-матч сначала завершите через live-пульт",
    };
  }

  const { error: statsError } = await db
    .from("championship_match_player_stats")
    .delete()
    .eq("match_id", matchId);

  if (statsError) {
    return { ok: false, error: statsError.message };
  }

  const { error: updateError } = await db
    .from("championship_matches")
    .update({
      home_goals: null,
      away_goals: null,
      is_played: false,
      tour_results_applied: false,
    })
    .eq("id", matchId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const { data: homeClubTeam } = await db
    .from("championship_teams")
    .select("id")
    .eq("name", "Дженгутай")
    .maybeSingle();

  const homeClubId = homeClubTeam ? Number(homeClubTeam.id) : null;
  const home = one(match.home_team as { name: string } | { name: string }[] | null);
  const away = one(match.away_team as { name: string } | { name: string }[] | null);
  const weAreHome = homeClubId != null && Number(match.home_team_id) === homeClubId;
  const weAreAway = homeClubId != null && Number(match.away_team_id) === homeClubId;

  if (weAreHome || weAreAway) {
    const opponent = (weAreHome ? away?.name : home?.name) ?? null;
    if (opponent) {
      await db
        .from("matches")
        .update({
          is_played: false,
          is_live: false,
          ndfk_goals: 0,
          opponent_goals: 0,
          rating_voting_ends_at: null,
        })
        .eq("date", String(match.match_date))
        .eq("time", String(match.match_time || "18:00"))
        .eq("opponent", opponent);
    }
  }

  return { ok: true };
}
