import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncClubMatchVotingFromChampionship } from "@/lib/championship/syncClubMatchVoting";

type Body = {
  homeGoals?: number;
  awayGoals?: number;
  played?: boolean;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Войдите" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Только капитан" }, { status: 403 }),
    };
  }

  return { db: createAdminClient() ?? supabase };
}

function revalidateChampionship() {
  revalidatePath("/");
  revalidatePath("/championship");
  revalidatePath("/championship", "layout");
  revalidatePath("/championship/matches");
  revalidatePath("/admin/championship");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = Number(id);

  if (!Number.isFinite(matchId) || matchId <= 0) {
    return NextResponse.json({ error: "Неверный матч" }, { status: 400 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const homeGoals = Number(body.homeGoals);
  const awayGoals = Number(body.awayGoals);

  if (
    !Number.isFinite(homeGoals) ||
    !Number.isFinite(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0
  ) {
    return NextResponse.json({ error: "Укажите корректный счёт" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const db = auth.db!;

  const { data: match, error: loadError } = await db
    .from("championship_matches")
    .select("id, is_live")
    .eq("id", matchId)
    .maybeSingle();

  if (loadError || !match) {
    return NextResponse.json(
      { error: loadError?.message ?? "Матч не найден" },
      { status: 404 }
    );
  }

  if (match.is_live) {
    return NextResponse.json(
      { error: "LIVE-матч сначала завершите через live-пульт" },
      { status: 400 }
    );
  }

  const { error } = await db
    .from("championship_matches")
    .update({
      home_goals: Math.floor(homeGoals),
      away_goals: Math.floor(awayGoals),
      is_played: body.played ?? true,
    })
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const votingSync = await syncClubMatchVotingFromChampionship({
    db,
    championshipMatchId: matchId,
    homeGoals: Math.floor(homeGoals),
    awayGoals: Math.floor(awayGoals),
  });

  if (votingSync.error) {
    return NextResponse.json({ error: votingSync.error }, { status: 500 });
  }

  revalidateChampionship();
  revalidatePath("/matches");
  revalidatePath("/live");
  return NextResponse.json({ ok: true, votingOpened: votingSync.synced });
}