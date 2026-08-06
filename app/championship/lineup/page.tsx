import LineupBoard from "@/components/LineupBoard";
import { getUserProfile } from "@/lib/auth";
import { formatMatchDate } from "@/lib/matches";
import { getTeamPageData } from "@/lib/server/teamData";

export const dynamic = "force-dynamic";

export default async function ChampionshipLineupPage() {
  const [
    {
      players,
      playersError,
      latestPlayed,
      ratingSummaryMap,
      playerAttributesMap,
    },
    profile,
  ] = await Promise.all([getTeamPageData(), getUserProfile()]);

  if (playersError) {
    return (
      <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-4 text-sm text-rose-200">
        Ошибка загрузки состава
      </p>
    );
  }

  const canEditLineup =
    profile?.role === "admin" ||
    (profile?.role === "player" && profile.player_id != null);

  const lastMatchLabel = latestPlayed
    ? `vs ${latestPlayed.opponent} · ${formatMatchDate(latestPlayed.date)}`
    : null;

  return (
    <section>
      <LineupBoard
        initialPlayers={players}
        matchRatings={ratingSummaryMap}
        playerAttributesMap={playerAttributesMap}
        lastMatchLabel={lastMatchLabel}
        readOnly={!canEditLineup}
      />
    </section>
  );
}
