import {
  aggregateEpisodeRatings,
  countAcknowledgedPlayers,
  countCompletedVoters,
  isEpisodeRevealComplete,
  isEpisodeVotingComplete,
  normalizeEpisodeToken,
} from "@/lib/ratingEpisode";
import {
  loadEpisodeByToken,
  loadEpisodeContext,
} from "@/lib/server/ratingEpisode";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const normalized = normalizeEpisodeToken(token);

  if (!normalized) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  try {
    const episode = await loadEpisodeByToken(normalized);

    if (!episode) {
      return NextResponse.json(
        {
          error: "not_found",
          hint: "Опрос не найден. Админ должен создать его в разделе «Рейтинг» и скопировать ссылку заново.",
        },
        { status: 404 }
      );
    }

    const { players, votes, voterIds, acknowledgedPlayerIds, previews } =
      await loadEpisodeContext(episode.id);
    const completedVoters = countCompletedVoters(voterIds, players, votes);
    const acknowledgedPlayers = countAcknowledgedPlayers(
      voterIds,
      acknowledgedPlayerIds
    );

    return NextResponse.json({
      episode,
      players,
      votes,
      previews,
      acknowledgedPlayerIds,
      progress: {
        completedVoters,
        totalVoters: voterIds.length,
        votingComplete: isEpisodeVotingComplete(voterIds, players, votes),
        acknowledgedPlayers,
        revealComplete: isEpisodeRevealComplete(voterIds, acknowledgedPlayerIds),
      },
      results: episode.status === "closed" ? previews : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const dbMissing =
      message.includes("rating_episodes") ||
      message.includes("rating_episode_acknowledgments") ||
      message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("Could not find");

    if (dbMissing) {
      return NextResponse.json(
        {
          error: "db_not_ready",
          hint: "Выполните supabase/rating_episode.sql и supabase/rating_episode_reveal.sql в Supabase",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
