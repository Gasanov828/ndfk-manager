import Link from "next/link";
import AdminChampionshipTeamsBoard from "@/components/admin/AdminChampionshipTeamsBoard";
import { getAllChampionshipTeams } from "@/lib/championship/server";

export const dynamic = "force-dynamic";

export default async function AdminChampionshipTeamsPage() {
  const { teams, error } = await getAllChampionshipTeams();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white">
            Управление командами
          </h2>
          <p className="mt-1 text-[12px] text-slate-400">
            Команды из базы · без хардкода · любое количество
          </p>
        </div>
        <Link
          href="/admin/championship"
          className="rounded-xl border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300"
        >
          ← Матчи
        </Link>
      </div>
      {error ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          {error}
        </p>
      ) : null}
      <AdminChampionshipTeamsBoard teams={teams} />
    </section>
  );
}
