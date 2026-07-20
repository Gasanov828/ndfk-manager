import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { acknowledgeRatingEpisode } from "@/lib/server/ratingEpisode";

type AckBody = {
  episodeId?: string;
};

export async function POST(request: Request) {
  let body: AckBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const episodeId = body.episodeId?.trim() ?? "";
  if (!episodeId) {
    return NextResponse.json({ error: "Укажите episodeId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите как игрок" }, { status: 401 });
  }

  const { data: profileRows } = await supabase.rpc("get_my_profile");
  const profile = profileRows?.[0] as { player_id: number | null } | undefined;

  if (!profile?.player_id) {
    return NextResponse.json({ error: "Нужен аккаунт игрока" }, { status: 403 });
  }

  const result = await acknowledgeRatingEpisode(episodeId, profile.player_id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Не удалось" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
