import {
  countCompletedVoters,
  getAttributesForPosition,
  isEpisodeVotingComplete,
  RATING_EPISODE_MAX_SCORE,
  RATING_EPISODE_MIN_SCORE,
} from "@/lib/ratingEpisode";
import {
  beginRevealPhase,
  loadEpisodeContext,
} from "@/lib/server/ratingEpisode";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type VoteBody = {
  episodeId?: string;
  ratedPlayerId?: number;
  scores?: Record<string, number>;
};

export async function POST(request: Request) {
  let body: VoteBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const episodeId = body.episodeId?.trim() ?? "";
  const ratedPlayerId = Number(body.ratedPlayerId);
  const scores = body.scores ?? {};

  if (!episodeId || !Number.isFinite(ratedPlayerId) || ratedPlayerId <= 0) {
    return NextResponse.json({ error: "Укажите эпизод и игрока" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите как игрок" }, { status: 401 });
  }

  const { data: profileRows } = await supabase.rpc("get_my_profile");
  const profile = profileRows?.[0] as
    | { role: string; player_id: number | null }
    | undefined;

  if (!profile?.player_id) {
    return NextResponse.json(
      { error: "Голосовать может только игрок с аккаунтом" },
      { status: 403 }
    );
  }

  const voterPlayerId = profile.player_id;

  if (voterPlayerId === ratedPlayerId) {
    return NextResponse.json({ error: "Нельзя оценивать себя" }, { status: 400 });
  }

  const { data: episode } = await supabase
    .from("rating_episodes")
    .select("id, status")
    .eq("id", episodeId)
    .maybeSingle();

  if (!episode) {
    return NextResponse.json({ error: "Опрос не найден" }, { status: 404 });
  }

  if (episode.status !== "open") {
    return NextResponse.json({ error: "Голосование уже завершено" }, { status: 400 });
  }

  const { data: ratedPlayer } = await supabase
    .from("players")
    .select("id, position")
    .eq("id", ratedPlayerId)
    .maybeSingle();

  if (!ratedPlayer) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const attributes = getAttributesForPosition(ratedPlayer.position);
  const rows = attributes
    .map((attribute) => {
      const score = Number(scores[attribute.key]);
      if (!Number.isFinite(score) || score < RATING_EPISODE_MIN_SCORE || score > RATING_EPISODE_MAX_SCORE) return null;
      return {
        episode_id: episodeId,
        voter_player_id: voterPlayerId,
        rated_player_id: ratedPlayerId,
        attribute_key: attribute.key,
        score,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length !== attributes.length) {
    return NextResponse.json(
      { error: `Оцените все характеристики от ${RATING_EPISODE_MIN_SCORE} до ${RATING_EPISODE_MAX_SCORE}` },
      { status: 400 }
    );
  }

  await supabase
    .from("rating_episode_votes")
    .delete()
    .eq("episode_id", episodeId)
    .eq("voter_player_id", voterPlayerId)
    .eq("rated_player_id", ratedPlayerId);

  const { error: insertError } = await supabase
    .from("rating_episode_votes")
    .insert(rows);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { players, votes, voterIds, previews } = await loadEpisodeContext(episodeId);
  const completedVoters = countCompletedVoters(voterIds, players, votes);
  let revealing = false;

  if (isEpisodeVotingComplete(voterIds, players, votes)) {
    const reveal = await beginRevealPhase(episodeId);
    revealing = reveal.ok;
  }

  return NextResponse.json({
    ok: true,
    revealing,
    preview: previews[ratedPlayerId] ?? null,
    progress: {
      completedVoters,
      totalVoters: voterIds.length,
    },
  });
}
