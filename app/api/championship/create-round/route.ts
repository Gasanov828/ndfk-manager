import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Body = {
  roundNumber?: number;
  title?: string;
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

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const db = auth.db!;

  const { data: championship, error: champError } = await db
    .from("championships")
    .select("id")
    .eq("status", "active")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (champError || !championship) {
    return NextResponse.json(
      {
        error:
          champError?.message ??
          "Нет активного чемпионата. Выполните supabase/championship.sql",
      },
      { status: 400 }
    );
  }

  const { data: existingRounds, error: roundsError } = await db
    .from("championship_rounds")
    .select("id, round_number, status")
    .eq("championship_id", championship.id)
    .order("round_number", { ascending: true });

  if (roundsError) {
    return NextResponse.json({ error: roundsError.message }, { status: 500 });
  }

  const rounds = existingRounds ?? [];
  const maxRoundNumber =
    rounds.length > 0
      ? Math.max(...rounds.map((round) => Number(round.round_number)))
      : 0;

  const requestedNumber =
    body.roundNumber != null && Number.isFinite(Number(body.roundNumber))
      ? Math.floor(Number(body.roundNumber))
      : maxRoundNumber + 1;

  if (requestedNumber < 1) {
    return NextResponse.json({ error: "Номер тура должен быть ≥ 1" }, { status: 400 });
  }

  if (rounds.some((round) => Number(round.round_number) === requestedNumber)) {
    return NextResponse.json(
      { error: `Тур ${requestedNumber} уже существует` },
      { status: 400 }
    );
  }

  if (requestedNumber > maxRoundNumber + 1) {
    return NextResponse.json(
      {
        error: `Сначала создайте тур ${maxRoundNumber + 1}. Нельзя пропускать номера.`,
      },
      { status: 400 }
    );
  }

  const title =
    String(body.title ?? "").trim() || `Тур ${requestedNumber}`;
  const previousRound = rounds.find(
    (round) => Number(round.round_number) === requestedNumber - 1
  );
  const status =
    requestedNumber === 1 || previousRound?.status === "finished"
      ? "active"
      : "upcoming";

  const { data: created, error } = await db
    .from("championship_rounds")
    .insert({
      championship_id: championship.id,
      round_number: requestedNumber,
      title,
      status,
    })
    .select("id, round_number, title, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateChampionship();
  return NextResponse.json({
    ok: true,
    round: {
      id: Number(created.id),
      round_number: Number(created.round_number),
      title: String(created.title ?? title),
      status: String(created.status ?? status),
    },
  });
}
