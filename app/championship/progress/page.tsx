import { getChampionshipProgressBoard } from "@/lib/championship/server";
import ChampionshipProgressBoard from "@/components/championship/ChampionshipProgressBoard";

export const dynamic = "force-dynamic";

export default async function ChampionshipProgressPage() {
  const { rows, error } = await getChampionshipProgressBoard();

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-bold text-amber-50">
        ⭐ Прогресс сезона
      </h2>
      <p className="mb-2 text-[10px] text-slate-500">
        XP за оценку · сброс с новым сезоном
      </p>
      {error ? (
        <p className="mb-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
          {error}
        </p>
      ) : null}
      <ChampionshipProgressBoard rows={rows} />
    </section>
  );
}
