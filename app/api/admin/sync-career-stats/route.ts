import { syncPlayerCareerTotals } from "@/lib/playerCareerSync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Пересчёт голы/пассы игроков + очистка осиротевшей статистики матчей.
 * Капитан (admin) или service role.
 */
export async function POST() {
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

  const admin = createAdminClient();
  const db = admin ?? supabase;

  try {
    const result = await syncPlayerCareerTotals(db);
    revalidatePath("/");
    revalidatePath("/players");
    revalidatePath("/career");
    revalidatePath("/admin/matches");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
