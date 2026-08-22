import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  castMatchMvpVote,
  closeMatchMvpVotingSession,
  getMatchMvpVotePageData,
  openMatchMvpVotingSession,
} from "@/lib/server/matchMvpVote";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteParams = {
  params: Promise<{ matchId: string }>;
};

function parseMatchId(raw: string): number | null {
  const matchId = Number(raw);
  if (!Number.isFinite(matchId) || matchId <= 0) return null;
  return matchId;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { matchId: raw } = await params;
  const matchId = parseMatchId(raw);
  if (matchId == null) {
    return NextResponse.json({ error: "Неверный матч" }, { status: 400 });
  }

  const { profile } = await getAuthSession();
  const supabase = await createClient();
  const db = createAdminClient() ?? supabase;

  const { data, error } = await getMatchMvpVotePageData(
    db,
    matchId,
    profile?.player_id ?? null
  );

  if (error) {
    return NextResponse.json({ error }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    ...data,
    isAdmin: profile?.role === "admin",
    myPlayerId: profile?.player_id ?? null,
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { matchId: raw } = await params;
  const matchId = parseMatchId(raw);
  if (matchId == null) {
    return NextResponse.json({ error: "Неверный матч" }, { status: 400 });
  }

  const { user, profile } = await getAuthSession();
  if (!user) {
    return NextResponse.json({ error: "Войдите, чтобы голосовать" }, { status: 401 });
  }
  if (!profile?.player_id) {
    return NextResponse.json(
      { error: "Голосовать может только привязанный игрок" },
      { status: 403 }
    );
  }

  let body: { votedPlayerId?: number; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const supabase = await createClient();
  const db = createAdminClient() ?? supabase;

  if (body.action === "close") {
    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Только капитан" }, { status: 403 });
    }
    const closed = await closeMatchMvpVotingSession(db, matchId);
    if (!closed.ok) {
      return NextResponse.json({ error: closed.error ?? "Ошибка" }, { status: 500 });
    }
    const { data } = await getMatchMvpVotePageData(db, matchId, profile.player_id);
    return NextResponse.json({ ok: true, ...data });
  }

  if (body.action === "open") {
    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Только капитан" }, { status: 403 });
    }
    const opened = await openMatchMvpVotingSession(db, matchId);
    if (!opened.ok) {
      return NextResponse.json(
        {
          error: opened.schemaMissing
            ? "Выполните SQL: supabase/match_mvp_votes.sql"
            : opened.error ?? "Ошибка",
        },
        { status: 500 }
      );
    }
    const { data } = await getMatchMvpVotePageData(db, matchId, profile.player_id);
    return NextResponse.json({ ok: true, ...data });
  }

  const votedPlayerId = Number(body.votedPlayerId);
  if (!Number.isFinite(votedPlayerId) || votedPlayerId <= 0) {
    return NextResponse.json({ error: "Выберите игрока" }, { status: 400 });
  }

  const result = await castMatchMvpVote({
    db,
    matchId,
    voterPlayerId: profile.player_id,
    votedPlayerId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Ошибка", alreadyVoted: result.alreadyVoted === true },
      { status: result.alreadyVoted ? 409 : 400 }
    );
  }

  const { data } = await getMatchMvpVotePageData(db, matchId, profile.player_id);
  return NextResponse.json({ ok: true, ...data });
}
