import LineupTacticsView from "@/components/lineup/LineupTacticsView";
import type { ChampionshipLineupPlayer } from "@/lib/championship/lineup";
import type { HomeChampionshipDashboardData } from "@/lib/championship/homeDashboard";
import {
  CHAMPIONSHIP_LINEUP_FORMATION_STORAGE_KEY,
} from "@/lib/lineupFormations";
import {
  mapChampionshipFieldPlayers,
  mapChampionshipNextMatch,
} from "@/lib/tactics/lineupTactics";

type ChampionshipTacticsViewProps = {
  nextMatch: HomeChampionshipDashboardData["nextMatch"];
  fieldPlayers: ChampionshipLineupPlayer[];
  viewerPlayerId: number | null;
};

export default function ChampionshipTacticsView({
  nextMatch,
  fieldPlayers,
  viewerPlayerId,
}: ChampionshipTacticsViewProps) {
  return (
    <LineupTacticsView
      formationStorageKey={CHAMPIONSHIP_LINEUP_FORMATION_STORAGE_KEY}
      fieldPlayers={mapChampionshipFieldPlayers(fieldPlayers)}
      nextMatch={mapChampionshipNextMatch(nextMatch)}
      viewerPlayerId={viewerPlayerId}
    />
  );
}
