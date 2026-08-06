import ChampionshipLeadersBoard from "@/components/championship/ChampionshipLeadersBoard";
import { getActiveChampionshipBundle } from "@/lib/championship/server";

export const dynamic = "force-dynamic";

export default async function ChampionshipLeadersPage() {
  const { data } = await getActiveChampionshipBundle();

  return (
    <section>
      <ChampionshipLeadersBoard
        scorers={data?.scorers ?? []}
        assisters={data?.assisters ?? []}
        mvpBoard={data?.mvpBoard ?? []}
      />
    </section>
  );
}
