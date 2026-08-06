import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthSession } from "@/lib/auth";
import {
  isReactionCode,
  type ReactionCode,
} from "@/lib/playerReactions";
import { awardPlayerAchievements } from "@/lib/achievements/sync";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { user, profile } = await getAuthSession();
  if (!user || !profile?.player_id) {
    return NextResponse.json({ error: "Нужен вход игрока" }, { status: 401 });
  }

  const body = (await request.json()) as {
    matchId?: number;
    toPlayerId?: number;
    reactionCode?: string;
  };

  const matchId = Number(body.matchId);
  const toPlayerId = Number(body.toPlayerId);
  const reactionCode = body.reactionCode;

  if (!matchId || !toPlayerId || !reactionCode || !isReactionCode(reactionCode)) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  if (toPlayerId === profile.player_id) {
    return NextResponse.json(
      { error: "Нельзя поставить реакцию себе" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const totalsDb = admin ?? supabase;

  const { data: match } = await supabase
    .from("matches")
    .select("id, is_played")
    .eq("id", matchId)
    .maybeSingle();

  if (!match?.is_played) {
    return NextResponse.json({ error: "Матч ещё не завершён" }, { status: 400 });
  }

  const { data: newer } = await supabase
    .from("matches")
    .select("id")
    .gt("id", matchId)
    .limit(1)
    .maybeSingle();

  if (newer) {
    return NextResponse.json(
      { error: "Реакции закрыты — уже есть следующий матч" },
      { status: 400 }
    );
  }

  const fromPlayerId = profile.player_id;

  const { data: existing } = await supabase
    .from("match_player_reactions")
    .select("id, reaction_code")
    .eq("match_id", matchId)
    .eq("from_player_id", fromPlayerId)
    .eq("to_player_id", toPlayerId)
    .maybeSingle();

  const previousCode = existing?.reaction_code as ReactionCode | undefined;

  if (previousCode === reactionCode) {
    return NextResponse.json({ ok: true, unchanged: true, reactionCode });
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("match_player_reactions")
      .update({
        reaction_code: reactionCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: insertError } = await supabase
      .from("match_player_reactions")
      .insert({
        match_id: matchId,
        from_player_id: fromPlayerId,
        to_player_id: toPlayerId,
        reaction_code: reactionCode,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  if (previousCode) {
    await adjustTotal(totalsDb, toPlayerId, previousCode, -1);
  }
  await adjustTotal(totalsDb, toPlayerId, reactionCode, 1);

  try {
    await awardPlayerAchievements(toPlayerId, totalsDb);
  } catch {
    // реакции важнее sync
  }

  return NextResponse.json({
    ok: true,
    reactionCode,
    previousCode: previousCode ?? null,
  });
}

async function adjustTotal(
  db: SupabaseClient,
  playerId: number,
  code: ReactionCode,
  delta: number
) {
  const { data: row } = await db
    .from("player_reaction_totals")
    .select("count")
    .eq("player_id", playerId)
    .eq("reaction_code", code)
    .maybeSingle();

  const next = Math.max(0, (Number(row?.count) || 0) + delta);

  if (row) {
    await db
      .from("player_reaction_totals")
      .update({ count: next })
      .eq("player_id", playerId)
      .eq("reaction_code", code);
  } else if (delta > 0) {
    await db.from("player_reaction_totals").insert({
      player_id: playerId,
      reaction_code: code,
      count: next,
    });
  }
}
