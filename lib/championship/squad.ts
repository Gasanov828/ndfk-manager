import type { SupabaseClient } from "@supabase/supabase-js";
import type { AddPlayerAttributesPayload } from "@/lib/playerCreateRating";

export const CHAMPIONSHIP_SQUAD_TARGET = 13;

export async function createPlayerWithAttributes(
  db: SupabaseClient,
  payload: AddPlayerAttributesPayload
): Promise<{ id: number }> {
  const { data: inserted, error } = await db
    .from("players")
    .insert([
      {
        name: payload.name,
        position: payload.position,
        rating: payload.rating,
        goals: 0,
        assists: 0,
        status: "ready",
        lineup_position: null,
      },
    ])
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Не удалось добавить игрока");
  }

  const { error: attrsError } = await db.from("player_attributes").upsert(
    {
      player_id: inserted.id,
      attrs: payload.attrs,
      episode_id: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "player_id" }
  );

  if (attrsError) {
    // Игрок уже создан — не валим полностью, но сообщаем
    console.warn("player_attributes upsert failed", attrsError.message);
  }

  return { id: inserted.id as number };
}

export async function enrollChampionshipPlayer(
  db: SupabaseClient,
  params: {
    championshipId: number;
    teamId: number;
    playerId: number;
  }
): Promise<void> {
  const { championshipId, teamId, playerId } = params;

  const { error: statsError } = await db
    .from("championship_player_season_stats")
    .upsert(
      {
        championship_id: championshipId,
        player_id: playerId,
        team_id: teamId,
        matches_played: 0,
        goals: 0,
        assists: 0,
        mvp_count: 0,
        rating_sum: 0,
        rating_count: 0,
      },
      { onConflict: "championship_id,player_id", ignoreDuplicates: true }
    );

  if (statsError) {
    throw new Error(statsError.message);
  }

  const { error: progressError } = await db
    .from("championship_player_progress")
    .upsert(
      {
        championship_id: championshipId,
        player_id: playerId,
        team_id: teamId,
        season_xp: 0,
        season_level: 1,
        season_rating: 0,
        season_cards: 0,
        season_rewards: 0,
      },
      { onConflict: "championship_id,player_id", ignoreDuplicates: true }
    );

  if (progressError) {
    // Прогресс мог ещё не быть в БД — не блокируем состав
    console.warn("championship progress enroll", progressError.message);
  }
}

export async function unenrollChampionshipPlayer(
  db: SupabaseClient,
  params: {
    championshipId: number;
    playerId: number;
  }
): Promise<void> {
  const { championshipId, playerId } = params;

  const { data: stat } = await db
    .from("championship_player_season_stats")
    .select("matches_played, goals, assists")
    .eq("championship_id", championshipId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (stat && (stat.matches_played > 0 || stat.goals > 0 || stat.assists > 0)) {
    throw new Error(
      "Нельзя убрать игрока: уже есть статистика в сезоне"
    );
  }

  const { error: statsError } = await db
    .from("championship_player_season_stats")
    .delete()
    .eq("championship_id", championshipId)
    .eq("player_id", playerId);

  if (statsError) throw new Error(statsError.message);

  await db
    .from("championship_player_progress")
    .delete()
    .eq("championship_id", championshipId)
    .eq("player_id", playerId);
}
