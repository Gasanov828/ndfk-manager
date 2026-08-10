import type { ChampionshipStandingRow } from "@/lib/championship/types";

export type StandingsContext = {
  ourPlace: number | null;
  ourPoints: number;
  ourName: string | null;
  leader: { name: string; points: number } | null;
  pointsToLeader: number | null;
  rivalAbove: { name: string; points: number; gap: number } | null;
  rivalBelow: { name: string; points: number; gap: number } | null;
};

/** Контекст таблицы для нашей команды: место, отрыв от лидера и соседей. */
export function getStandingsContext(
  standings: ChampionshipStandingRow[],
  homeClubTeamId: number | null
): StandingsContext | null {
  if (homeClubTeamId == null || standings.length === 0) return null;

  const ourIndex = standings.findIndex((row) => row.teamId === homeClubTeamId);
  if (ourIndex < 0) return null;

  const our = standings[ourIndex];
  const leader = standings[0] ?? null;
  const above = ourIndex > 0 ? standings[ourIndex - 1] : null;
  const below =
    ourIndex < standings.length - 1 ? standings[ourIndex + 1] : null;

  return {
    ourPlace: ourIndex + 1,
    ourPoints: our.points,
    ourName: our.teamName,
    leader: leader
      ? { name: leader.teamName, points: leader.points }
      : null,
    pointsToLeader:
      leader && ourIndex > 0 ? leader.points - our.points : ourIndex === 0 ? 0 : null,
    rivalAbove:
      above && ourIndex > 0
        ? {
            name: above.teamName,
            points: above.points,
            gap: above.points - our.points,
          }
        : null,
    rivalBelow: below
      ? {
          name: below.teamName,
          points: below.points,
          gap: our.points - below.points,
        }
      : null,
  };
}
