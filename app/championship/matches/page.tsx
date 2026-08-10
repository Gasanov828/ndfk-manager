import ChampionshipMatchesList from "@/components/championship/ChampionshipBoards";
import ChampionshipStandingsContext from "@/components/championship/ChampionshipStandingsContext";
import {
  getActiveChampionshipBundle,
  getChampionshipRounds,
} from "@/lib/championship/server";
import { getStandingsContext } from "@/lib/championship/standingsContext";

export const dynamic = "force-dynamic";

export default async function ChampionshipMatchesPage() {
  const [{ data }, rounds] = await Promise.all([
    getActiveChampionshipBundle(),
    getChampionshipRounds(),
  ]);

  const standingsContext = getStandingsContext(
    data?.standings ?? [],
    data?.homeClubTeamId ?? null
  );

  return (
    <section>
      <h2 className="mb-2 text-sm font-bold text-amber-50 sm:text-base">
        Матчи чемпионата
      </h2>
      <ChampionshipStandingsContext context={standingsContext} />
      <ChampionshipMatchesList matches={data?.matches ?? []} rounds={rounds} />
    </section>
  );
}
