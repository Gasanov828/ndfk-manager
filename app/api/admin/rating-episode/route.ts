import {
  countAcknowledgedPlayers,
  countCompletedVoters,
  generateEpisodeToken,
  isEpisodeRevealComplete,
  isEpisodeVotingComplete,
} from "@/lib/ratingEpisode";
import {
  beginRevealPhase,
  loadEpisodeContext,
  publishRatingEpisode,
} from "@/lib/server/ratingEpisode";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("get_my_profile");
  const role = rows?.[0]?.role as string | undefined;

  if (role !== "admin") {
    return { supabase, error: NextResponse.json({ error: "not_admin" }, { status: 403 }) };
  }

  return { supabase, error: null as NextResponse | null };
}

function isActiveEpisode(status: string) {
  return status === "open" || status === "revealing";
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { supabase } = auth;

  const { data: episodes, error } = await supabase
    .from("rating_episodes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    const message = error.message;
    const sqlHint =
      message.includes("rating_episodes") &&
      (message.includes("does not exist") || message.includes("schema cache"))
        ? " Выполните supabase/rating_episode.sql в Supabase SQL Editor."
        : "";
    return NextResponse.json({ error: message + sqlHint }, { status: 500 });
  }

  const activeEpisode =
    (episodes ?? []).find((row) => isActiveEpisode(row.status)) ?? null;

  let progress = null;
  if (activeEpisode) {
    const { players, votes, voterIds, acknowledgedPlayerIds } =
      await loadEpisodeContext(activeEpisode.id);
    progress = {
      completedVoters: countCompletedVoters(voterIds, players, votes),
      totalVoters: voterIds.length,
      votingComplete: isEpisodeVotingComplete(voterIds, players, votes),
      acknowledgedPlayers: countAcknowledgedPlayers(voterIds, acknowledgedPlayerIds),
      revealComplete: isEpisodeRevealComplete(voterIds, acknowledgedPlayerIds),
    };
  }

  return NextResponse.json({
    episodes: episodes ?? [],
    activeEpisode,
    openEpisode: activeEpisode,
    progress,
  });
}

type EpisodeBody = {
  action?: "create" | "reveal" | "publish" | "close";
  title?: string;
  episodeId?: string;
  force?: boolean;
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { supabase } = auth;

  let body: EpisodeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (body.action === "create") {
    const { data: existingActive } = await supabase
      .from("rating_episodes")
      .select("id, status")
      .in("status", ["open", "revealing"])
      .maybeSingle();

    if (existingActive) {
      return NextResponse.json(
        { error: "Уже есть активный опрос. Завершите его перед новым." },
        { status: 409 }
      );
    }

    const token = generateEpisodeToken();
    const title = body.title?.trim() || "Оценка характеристик";

    const { data, error } = await supabase
      .from("rating_episodes")
      .insert({ token, title, status: "open" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ episode: data });
  }

  if (body.action === "reveal") {
    const episodeId = body.episodeId?.trim();
    if (!episodeId) {
      return NextResponse.json({ error: "Укажите episodeId" }, { status: 400 });
    }

    const result = await beginRevealPhase(episodeId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Не удалось" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "publish" || body.action === "close") {
    const episodeId = body.episodeId?.trim();
    if (!episodeId) {
      return NextResponse.json({ error: "Укажите episodeId" }, { status: 400 });
    }

    const result = await publishRatingEpisode(episodeId, {
      force: body.force === true,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Не удалось опубликовать" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, results: result.results });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
