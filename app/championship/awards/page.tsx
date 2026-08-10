import SeasonPrizesBoard from "@/components/championship/SeasonPrizesBoard";
import SeasonPrizesTeamOverview from "@/components/championship/SeasonPrizesTeamOverview";
import { getSeasonPrizesBoard } from "@/lib/championship/server";

export const dynamic = "force-dynamic";

export default async function ChampionshipAwardsPage() {
  const { collection, teamOverview, isAdmin, viewingHint, error, schemaHint } =
    await getSeasonPrizesBoard();

  return (
    <section>
      {error || schemaHint ? (
        <p className="mb-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] text-amber-100">
          {schemaHint ?? error}
        </p>
      ) : null}
      {isAdmin && collection ? (
        <SeasonPrizesTeamOverview
          rows={teamOverview}
          activePlayerId={collection.playerId}
        />
      ) : null}
      {collection ? (
        <SeasonPrizesBoard
          collection={collection}
          viewingHint={viewingHint}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="tournament-panel rounded-2xl px-3 py-6 text-center">
          <p className="text-2xl" aria-hidden>
            🏅
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            Коллекция призов
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Появится после подключения сезона
          </p>
        </div>
      )}
    </section>
  );
}
