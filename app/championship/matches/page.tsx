import ChampionshipMatchesList from "@/components/championship/ChampionshipBoards";
import {
  getActiveChampionshipBundle,
  getChampionshipRounds,
} from "@/lib/championship/server";

export const dynamic = "force-dynamic";

export default async function ChampionshipMatchesPage() {
  const [{ data }, rounds] = await Promise.all([
    getActiveChampionshipBundle(),
    getChampionshipRounds(),
  ]);

  return (
    <section>
      <h2 className="mb-2 text-sm font-bold text-amber-50 sm:text-base">
        Матчи чемпионата
      </h2>
      <ChampionshipMatchesList matches={data?.matches ?? []} rounds={rounds} />
    </section>
  );
}
