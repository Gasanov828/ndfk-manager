import LineupBoard from "@/components/LineupBoard";
import { getUserProfile } from "@/lib/auth";
import { formatMatchDate } from "@/lib/matches";
import {
  aggregateReactionCounts,
  buildMyReactionMap,
  getReactionMatchContext,
  type MyReactionMap,
  type ReactionCountMap,
} from "@/lib/playerReactions";
import { getTeamPageData } from "@/lib/server/teamData";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

export const dynamic = "force-dynamic";

export default async function LineupPage() {
  const [
    { players, playersError, matches, latestPlayed, ratingSummaryMap, playerAttributesMap },
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

  const reactionCtx = getReactionMatchContext(matches);
  let reactionCounts: ReactionCountMap = {};
  let myReactions: MyReactionMap = {};

  if (reactionCtx.match) {
    const supabase = createPublicSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("match_player_reactions")
        .select("from_player_id, to_player_id, reaction_code")
        .eq("match_id", reactionCtx.match.id);

      const rows = data ?? [];
      reactionCounts = aggregateReactionCounts(rows);

      if (profile?.player_id != null) {
        myReactions = buildMyReactionMap(
          rows.filter((row) => row.from_player_id === profile.player_id)
        );
      }
    }
  }

  return (
    <div className="-mt-1 sm:-mt-2">
      <LineupBoard
        initialPlayers={players}
        matchRatings={ratingSummaryMap}
        playerAttributesMap={playerAttributesMap}
        lastMatchLabel={lastMatchLabel}
        readOnly={!canEditLineup}
        reactionMatchId={reactionCtx.match?.id ?? null}
        reactionsOpen={reactionCtx.open}
        initialReactionCounts={reactionCounts}
        initialMyReactions={myReactions}
        viewerPlayerId={profile?.player_id ?? null}
      />
    </div>
  );
}
