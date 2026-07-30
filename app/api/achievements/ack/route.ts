import { getAuthSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Body = {
  eventIds?: number[];
};

/** Пометить тосты достижений как просмотренные */
export async function POST(request: Request) {
  const { user, profile } = await getAuthSession();
  if (!user || !profile?.player_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const eventIds = (body.eventIds ?? []).filter(
    (id) => Number.isFinite(id) && id > 0
  );
  if (eventIds.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  await supabase
    .from("player_achievement_events")
    .update({ seen_at: new Date().toISOString() })
    .eq("player_id", profile.player_id)
    .in("id", eventIds);

  return NextResponse.json({ ok: true });
}
