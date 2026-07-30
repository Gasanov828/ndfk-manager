import ChampionshipOverview from "@/components/championship/ChampionshipOverview";
import ChampionshipTable from "@/components/championship/ChampionshipTable";
import {
  getActiveChampionshipBundle,
  getHomeChampionshipDashboard,
} from "@/lib/championship/server";

export const dynamic = "force-dynamic";

export default async function ChampionshipTablePage() {
  const [{ data: dash, active }, { data: bundle }] = await Promise.all([
    getHomeChampionshipDashboard(),
    getActiveChampionshipBundle(),
  ]);

  return (
    <section>
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
