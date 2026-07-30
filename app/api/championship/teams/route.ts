import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  revalidatePath("/championship", "layout");
  revalidatePath("/admin/championship");
  revalidatePath("/admin/championship/teams");
}

export async function POST(request: Request) {
  let body: {
    name?: string;
    logoUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    addToActiveChampionship?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Укажите название" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const db = auth.db!;

  const { data, error } = await db
    .from("championship_teams")
    .insert({
      name,
      logo_url: body.logoUrl?.trim() || null,
      primary_color: body.primaryColor?.trim() || "#fbbf24",
      secondary_color: body.secondaryColor?.trim() || "#78350f",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.addToActiveChampionship !== false) {
    const { data: champ } = await db
      .from("championships")
      .select("id")
      .eq("status", "active")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (champ) {
      await db.from("championship_participants").upsert({
        championship_id: champ.id,
        team_id: data.id,
      });
    }
  }

  revalidateChampionship();
  return NextResponse.json({ ok: true, team: data });
}

export async function PATCH(request: Request) {
  let body: {
    id?: number;
    name?: string;
    logoUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Укажите id" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const db = auth.db!;

  const patch: Record<string, unknown> = {};
  if (body.name != null) patch.name = String(body.name).trim();
  if (body.logoUrl !== undefined) {
    patch.logo_url = body.logoUrl?.trim() || null;
  }
  if (body.primaryColor != null) {
    patch.primary_color = String(body.primaryColor).trim();
  }
  if (body.secondaryColor != null) {
    patch.secondary_color = String(body.secondaryColor).trim();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  const { data, error } = await db
    .from("championship_teams")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateChampionship();
  return NextResponse.json({ ok: true, team: data });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Укажите id" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const db = auth.db!;

  const { error } = await db.from("championship_teams").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateChampionship();
  return NextResponse.json({ ok: true });
}
