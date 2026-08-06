import LineupBoard from "@/components/LineupBoard";
import { getUserProfile } from "@/lib/auth";
import { formatMatchDate } from "@/lib/matches";
import { getTeamPageData } from "@/lib/server/teamData";

export const revalidate = 30;

export default async function LineupPage() {
  const [
    { players, playersError, latestPlayed, ratingSummaryMap, playerAttributesMap },
    profile,
  ] = await Promise.all([getTeamPageData(), getUserProfile()]);

  if (playersError) {
    return (
      <main className="p-8">
        <p className="text-red-400">
          {"\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0441\u043e\u0441\u0442\u0430\u0432\u0430"}
        </p>
        {playersError && (
          <p className="mt-2 text-sm text-red-300/90">{playersError}</p>
        )}
        <p className="mt-4 text-sm text-slate-400">
          {"\u0412 Supabase SQL Editor \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u0435 "}
          <code className="text-cyan-300">supabase/fix_rls_recursion.sql</code>
        </p>
      </main>
    );
  }

  const canEditLineup =
    profile?.role === "admin" ||
    (profile?.role === "player" && profile.player_id != null);

  const lastMatchLabel = latestPlayed
    ? `vs ${latestPlayed.opponent} \u00b7 ${formatMatchDate(latestPlayed.date)}`
    : null;

  return (
    <div className="-mt-1 sm:-mt-2">
      <LineupBoard
        initialPlayers={players}
        matchRatings={ratingSummaryMap}
        playerAttributesMap={playerAttributesMap}
        lastMatchLabel={lastMatchLabel}
        readOnly={!canEditLineup}
      />
    </div>
  );
}
