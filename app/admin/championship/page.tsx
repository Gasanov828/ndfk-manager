import Link from "next/link";
import AdminChampionshipBoard from "@/components/admin/AdminChampionshipBoard";
import {
  getActiveChampionshipBundle,
  getChampionshipRounds,
} from "@/lib/championship/server";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

export const dynamic = "force-dynamic";

export default async function AdminChampionshipPage() {
  const [{ data, error, schemaMissing }, rounds] = await Promise.all([
    getActiveChampionshipBundle(),
    getChampionshipRounds(),
  ]);
  const supabase = createPublicSupabaseClient();
  const { data: players } = supabase
    ? await supabase
        .from("players")
        .select("id, name")
        .order("name", { ascending: true })
    : { data: [] as { id: number; name: string }[] };

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white">🏆 Чемпионат</h2>
          <p className="mt-1 text-[12px] text-slate-400">
            {data
              ? `${data.championship.name} · сезон ${data.championship.season}`
              : "Активный сезон не найден"}
          </p>
        </div>
        <Link
          href="/admin/championship/teams"
          className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-100"
        >
          Команды →
        </Link>
      </div>
      <AdminChampionshipBoard
        teams={data?.teams ?? []}
        matches={data?.matches ?? []}
        standings={data?.standings ?? []}
        rounds={rounds}
        players={(players ?? []).map((p) => ({
          id: Number(p.id),
          name: String(p.name),
        }))}
        homeTeamId={data?.homeClubTeamId ?? null}
        schemaHint={schemaMissing || error ? error : null}
      />
    </section>
  );
}
