import {
  aggregateEpisodeRatings,
  isEpisodeRevealComplete,
  isEpisodeVotingComplete,
  type RatingEpisodeRow,
  type RatingVoteRow,
} from "@/lib/ratingEpisode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PlayerRow = { id: number; position: string; name: string; rating: number };

export async function getRegisteredVoterIds(): Promise<number[]> {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  const { data } = await supabase
    .from("profiles")
    .select("player_id, role")
    .not("player_id", "is", null);

  return (data ?? [])
    .filter((row) => row.role === "player" && row.player_id != null)
    .map((row) => Number(row.player_id));
}

export async function loadEpisodeByToken(token: string) {
  const normalized = token.trim().toLowerCase();
  if (!normalized) return null;

  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  const { data, error } = await supabase
    .from("rating_episodes")
    .select("*")
    .eq("token", normalized)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as RatingEpisodeRow | null;
}

export async function loadEpisodeContext(episodeId: string) {
  const supabase = await createClient();

  const [{ data: players }, { data: votes }, { data: acks }, voterIds] =
    await Promise.all([
      supabase.from("players").select("id, name, position, rating").order("name"),
      supabase
        .from("rating_episode_votes")
        .select("voter_player_id, rated_player_id, attribute_key, score")
        .eq("episode_id", episodeId),
      supabase
        .from("rating_episode_acknowledgments")
        .select("player_id")
        .eq("episode_id", episodeId),
      getRegisteredVoterIds(),
    ]);

  const acknowledgedPlayerIds = (acks ?? []).map((row) => Number(row.player_id));

  return {
    players: (players ?? []) as PlayerRow[],
    votes: (votes ?? []) as RatingVoteRow[],
    voterIds,
    acknowledgedPlayerIds,
    previews: aggregateEpisodeRatings(
      (players ?? []) as PlayerRow[],
      (votes ?? []) as RatingVoteRow[]
    ),
  };
}

export async function beginRevealPhase(episodeId: string): Promise<{
  ok: boolean;
  error?: string;
  alreadyRevealing?: boolean;
}> {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  const { data: episode, error: episodeError } = await supabase
    .from("rating_episodes")
    .select("*")
    .eq("id", episodeId)
    .maybeSingle();

  if (episodeError || !episode) {
    return { ok: false, error: "Эпизод не найден" };
  }

  if (episode.status === "revealing" || episode.status === "closed") {
    return { ok: true, alreadyRevealing: true };
  }

  if (episode.status !== "open") {
    return { ok: false, error: "Опрос не в фазе голосования" };
  }

  const { players, votes, voterIds } = await loadEpisodeContext(episodeId);

  if (!isEpisodeVotingComplete(voterIds, players, votes)) {
    return { ok: false, error: "Не все игроки ещё проголосовали" };
  }

  const { error: updateError } = await supabase
    .from("rating_episodes")
    .update({ status: "revealing" })
    .eq("id", episodeId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

export async function acknowledgeRatingEpisode(
  episodeId: string,
  playerId: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: episode } = await supabase
    .from("rating_episodes")
    .select("id, status")
    .eq("id", episodeId)
    .maybeSingle();

  if (!episode) {
    return { ok: false, error: "Опрос не найден" };
  }

  if (episode.status !== "revealing") {
    return { ok: false, error: "Сейчас нельзя подтвердить просмотр" };
  }

  const { error } = await supabase.from("rating_episode_acknowledgments").upsert(
    {
      episode_id: episodeId,
      player_id: playerId,
      acknowledged_at: new Date().toISOString(),
    },
    { onConflict: "episode_id,player_id" }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function publishRatingEpisode(
  episodeId: string,
  options?: { force?: boolean }
): Promise<{
  ok: boolean;
  error?: string;
  results?: Record<number, { attrs: Record<string, number>; overall: number }>;
}> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "На сервере нет SUPABASE_SERVICE_ROLE_KEY — нельзя обновить рейтинги. Добавьте ключ в .env.local",
    };
  }

  const supabase = admin;

  const { data: episode, error: episodeError } = await supabase
    .from("rating_episodes")
    .select("*")
    .eq("id", episodeId)
    .maybeSingle();

  if (episodeError || !episode) {
    return { ok: false, error: "Эпизод не найден" };
  }

  if (episode.status === "closed") {
    return { ok: true };
  }

  if (episode.status !== "revealing" && !options?.force) {
    return {
      ok: false,
      error:
        episode.status === "open"
          ? "Сначала все должны проголосовать — тогда откроются результаты"
          : "Опрос в неожиданном статусе",
    };
  }

  const { players, votes, voterIds, acknowledgedPlayerIds } =
    await loadEpisodeContext(episodeId);

  if (
    !options?.force &&
    episode.status === "revealing" &&
    !isEpisodeRevealComplete(voterIds, acknowledgedPlayerIds)
  ) {
    return {
      ok: false,
      error: "Не все игроки ещё подтвердили, что видели свой рейтинг",
    };
  }

  if (
    !options?.force &&
    episode.status === "open" &&
    !isEpisodeVotingComplete(voterIds, players, votes)
  ) {
    return { ok: false, error: "Не все игроки ещё проголосовали" };
  }

  const results = aggregateEpisodeRatings(players, votes);

  for (const player of players) {
    const result = results[player.id];
    if (!result || Object.keys(result.attrs).length === 0) continue;

    const { error: playerError } = await supabase
      .from("players")
      .update({ rating: result.overall })
      .eq("id", player.id);

    if (playerError) {
      return { ok: false, error: playerError.message };
    }

    const { error: attrsError } = await supabase.from("player_attributes").upsert(
      {
        player_id: player.id,
        attrs: result.attrs,
        episode_id: episodeId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_id" }
    );

    if (attrsError) {
      return { ok: false, error: attrsError.message };
    }
  }

  const { error: closeError } = await supabase
    .from("rating_episodes")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("id", episodeId);

  if (closeError) {
    return { ok: false, error: closeError.message };
  }

  return { ok: true, results };
}

/** @deprecated use publishRatingEpisode */
export async function finalizeRatingEpisode(
  episodeId: string,
  options?: { force?: boolean }
) {
  return publishRatingEpisode(episodeId, options);
}
