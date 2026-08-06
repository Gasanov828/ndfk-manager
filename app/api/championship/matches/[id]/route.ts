import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Body = {
  matchDate?: string;
  matchTime?: string;
  location?: string;
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
  revalidatePath("/championship");
  revalidatePath("/championship/matches");
  revalidatePath("/admin/championship");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = Number(id);

  if (!Number.isFinite(matchId)) {
    return NextResponse.json({ error: "Неверный матч" }, { status: 400 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const matchDate = String(body.matchDate ?? "").trim();
  const matchTime = String(body.matchTime ?? "18:00").trim() || "18:00";
  const location = String(body.location ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) {
    return NextResponse.json({ error: "Укажите дату YYYY-MM-DD" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const db = auth.db!;

  const { data: match, error: loadError } = await db
    .from("championship_matches")
    .select("id, is_played, is_live")
    .eq("id", matchId)
    .maybeSingle();

  if (loadError || !match) {
    return NextResponse.json(
      { error: loadError?.message ?? "Матч не найден" },
      { status: 404 }
    );
  }

  if (match.is_played || match.is_live) {
    return NextResponse.json(
      { error: "Можно менять только будущий матч, который ещё не LIVE и не сыгран" },
      { status: 400 }
    );
  }

  const { error } = await db
    .from("championship_matches")
    .update({
      match_date: matchDate,
      match_time: matchTime,
      location,
    })
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateChampionship();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = Number(id);

  if (!Number.isFinite(matchId)) {
    return NextResponse.json({ error: "Неверный матч" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const db = auth.db!;

  const { data: match, error: loadError } = await db
    .from("championship_matches")
    .select("id, is_played, is_live")
    .eq("id", matchId)
    .maybeSingle();

  if (loadError || !match) {
    return NextResponse.json(
      { error: loadError?.message ?? "Матч не найден" },
      { status: 404 }
    );
  }

  if (match.is_played || match.is_live) {
    return NextResponse.json(
      { error: "Можно удалить только будущий матч, который ещё не LIVE и не сыгран" },
      { status: 400 }
    );
  }

  const { error } = await db
    .from("championship_matches")
    .delete()
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateChampionship();
  return NextResponse.json({ ok: true });
}