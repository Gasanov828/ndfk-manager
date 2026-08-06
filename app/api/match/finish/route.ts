import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { finishClubMatchWithChampionship } from "@/lib/championship/finishClubMatch";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Body = {
  matchId?: number;
  ndfkGoals?: number;
  opponentGoals?: number;
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

function revalidateMatchPages() {
  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/live");
  revalidatePath("/championship");
  revalidatePath("/championship", "layout");
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const matchId = Number(body.matchId);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    return NextResponse.json({ error: "Укажите матч" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const result = await finishClubMatchWithChampionship({
    db: auth.db!,
    matchId,
    ndfkGoals: body.ndfkGoals,
    opponentGoals: body.opponentGoals,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Ошибка" }, { status: 500 });
  }

  revalidateMatchPages();

  return NextResponse.json({
    ok: true,
    votingEndsAt: result.votingEndsAt,
    championshipSynced: result.championshipSynced,
  });
}
