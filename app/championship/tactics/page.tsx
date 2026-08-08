import ChampionshipTacticsView from "@/components/championship/ChampionshipTacticsView";
import { getUserProfile } from "@/lib/auth";
import { getNextChampionshipMatch } from "@/lib/championship/homeDashboard";
import { loadChampionshipSquad } from "@/lib/championship/lineup";
import { getActiveChampionshipBundle } from "@/lib/championship/server";
import { getPositionGroup } from "@/lib/positionStyles";

export const dynamic = "force-dynamic";

export default async function ChampionshipTacticsPage() {
  const [{ data: bundle, error }, profile] = await Promise.all([
    getActiveChampionshipBundle(),
    getUserProfile(),
  ]);

  if (error || !bundle) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-slate-400">
        {error ?? "Чемпионат не найден"}
      </p>
    );
  }

  if (bundle.homeClubTeamId == null) {
    return (
      <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-4 text-sm text-amber-100">
        Команда «Дженгутай» не найдена
      </p>
    );
  }

  const squad = (
    await loadChampionshipSquad(
      bundle.championship.id,
      bundle.homeClubTeamId
    )
  ).squad;

  const nextMatch = getNextChampionshipMatch(bundle);
  const viewerPlayerId = profile?.player_id ?? null;
  const myPlayer =
    viewerPlayerId != null
      ? squad.find((player) => player.id === viewerPlayerId) ?? null
      : null;
  const isInStartingLineup = Boolean(myPlayer?.lineup_slot);
  const positionGroup =
    myPlayer?.lineup_slot != null
      ? getPositionGroup(myPlayer.lineup_slot, myPlayer.position)
      : null;

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-bold text-amber-50">⚽ Тактика</h2>
      <p className="mb-2 text-[10px] text-slate-500">
        Установка на ближайший матч · из текущего состава
      </p>
      <ChampionshipTacticsView
        nextMatch={nextMatch}
        playerName={myPlayer?.name ?? null}
        positionGroup={positionGroup}
        hasLineupAssignment={viewerPlayerId != null}
        isInStartingLineup={isInStartingLineup}
      />
    </section>
  );
}
