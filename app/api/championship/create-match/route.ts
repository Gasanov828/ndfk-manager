import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Body = {
  homeTeamId?: number;
  awayTeamId?: number;
  matchDate?: string;
  matchTime?: string;
  location?: string;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Войдите" }, { status: 401 }) };

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
  return { supabase, db: createAdminClient() ?? supabase };
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const homeTeamId = Number(body.homeTeamId);
  const awayTeamId = Number(body.awayTeamId);
  const matchDate = String(body.matchDate ?? "").trim();
  const matchTime = String(body.matchTime ?? "18:00").trim() || "18:00";
  const location = String(body.location ?? "").trim();

  if (!Number.isFinite(homeTeamId) || !Number.isFinite(awayTeamId)) {
    return NextResponse.json({ error: "Выберите команды" }, { status: 400 });
  }
  if (homeTeamId === awayTeamId) {
    return NextResponse.json(
      { error: "Команды должны отличаться" },
      { status: 400 }
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) {
    return NextResponse.json({ error: "Укажите дату YYYY-MM-DD" }, { status: 400 });
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

  const { data: created, error } = await db
    .from("championship_matches")
    .insert({
      championship_id: championship.id,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      match_date: matchDate,
      match_time: matchTime,
      location,
      is_played: false,
      is_live: false,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/championship");
  revalidatePath("/championship/matches");
  revalidatePath("/admin/championship");

  return NextResponse.json({ ok: true, id: created.id });
}
