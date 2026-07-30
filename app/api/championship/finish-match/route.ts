import { finishChampionshipMatch } from "@/lib/championship/finishMatch";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = {
  matchId?: number;
  homeGoals?: number;
  awayGoals?: number;
  lines?: {
    playerId: number;
    teamId: number;
    goals?: number;
    assists?: number;
    isMvp?: boolean;
    matchRating?: number | null;
    redCards?: number;
  }[];
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const matchId = Number(body.matchId);
  const homeGoals = Number(body.homeGoals);
  const awayGoals = Number(body.awayGoals);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    return NextResponse.json({ error: "Укажите matchId" }, { status: 400 });
  }
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) {
    return NextResponse.json({ error: "Укажите счёт" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Войдите" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Только капитан" }, { status: 403 });
  }

  const db = createAdminClient() ?? supabase;
  const result = await finishChampionshipMatch(db, {
    matchId,
    homeGoals,
    awayGoals,
    lines: body.lines ?? [],
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  revalidatePath("/championship");
  revalidatePath("/championship", "layout");
  revalidatePath("/championship/progress");
  revalidatePath("/championship/cards");
  revalidatePath("/championship/awards");
  revalidatePath("/");
  revalidatePath("/players");
  revalidatePath("/career");
  revalidatePath("/api/career/club");

  return NextResponse.json({ ok: true });
}
