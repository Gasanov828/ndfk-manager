import { ChampionshipStatsGrid } from "@/components/championship/ChampionshipLeaderboard";
import { getActiveChampionshipBundle } from "@/lib/championship/server";

export const dynamic = "force-dynamic";

export default async function ChampionshipStatsPage() {
  const { data } = await getActiveChampionshipBundle();
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold text-amber-50 sm:text-base">
        Статистика чемпионата
      </h2>
      <ChampionshipStatsGrid cards={data?.stats ?? []} />
    </section>
  );
}
