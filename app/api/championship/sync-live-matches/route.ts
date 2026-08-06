import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncChampionshipLiveMatches } from "@/lib/championship/syncLiveMatches";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 500 });
  }

  const { created, error } = await syncChampionshipLiveMatches(db);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (created > 0) {
    revalidatePath("/");
    revalidatePath("/matches");
    revalidatePath("/live");
  }

  return NextResponse.json({ ok: true, created });
}
