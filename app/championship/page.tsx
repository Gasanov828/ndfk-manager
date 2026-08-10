import ChampionshipOverview from "@/components/championship/ChampionshipOverview";
import ChampionshipStandingsContext from "@/components/championship/ChampionshipStandingsContext";
import ChampionshipTable from "@/components/championship/ChampionshipTable";
import {
  getActiveChampionshipBundle,
  getHomeChampionshipDashboard,
} from "@/lib/championship/server";
import { getStandingsContext } from "@/lib/championship/standingsContext";

export const dynamic = "force-dynamic";

export default async function ChampionshipTablePage() {
  const [{ data: dash, active }, { data: bundle }] = await Promise.all([
    getHomeChampionshipDashboard(),
    getActiveChampionshipBundle(),
  ]);

  const standingsContext = getStandingsContext(
    bundle?.standings ?? [],
    bundle?.homeClubTeamId ?? null
  );

  return (
    <section>
      <ChampionshipStandingsContext context={standingsContext} />
      <ChampionshipTable rows={bundle?.standings ?? []} />
      {active && dash ? (
        <ChampionshipOverview
          data={dash}
          standings={bundle?.standings ?? []}
          topScorers={(bundle?.scorers ?? []).map((row) => ({
            name: row.name,
            value: row.value,
            teamName: row.teamName,
          }))}
        />
      ) : null}
    </section>
  );
}
