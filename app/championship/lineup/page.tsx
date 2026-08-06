import ChampionshipLineupBoard from "@/components/championship/ChampionshipLineupBoard";
import { getUserProfile } from "@/lib/auth";
import type { ChampionshipLineupPlayer } from "@/lib/championship/lineup";
import type { LineupPosition } from "@/lib/lineup";
import { getActiveChampionshipBundle } from "@/lib/championship/server";
import { type Match } from "@/lib/matches";
import {
  aggregateReactionCounts,
  buildMyReactionMap,
  getReactionMatchContext,
  type MyReactionMap,
  type ReactionCountMap,
} from "@/lib/playerReactions";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChampionshipLineupPage() {
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

  const [{ squad, schemaMissing }, reactionData] = await Promise.all([
    loadChampionshipSquad(bundle.championship.id, bundle.homeClubTeamId),
    loadReactionData(profile?.player_id ?? null),
  ]);

  const canEdit =
    profile?.role === "admin" ||
    (profile?.role === "player" && profile.player_id != null);

  return (
    <ChampionshipLineupBoard
      championshipId={bundle.championship.id}
      squad={squad}
      canEdit={canEdit}
      schemaMissing={schemaMissing}
      reactionMatchId={reactionData.matchId}
      reactionsOpen={reactionData.open}
      initialReactionCounts={reactionData.counts}
      initialMyReactions={reactionData.myReactions}
      viewerPlayerId={profile?.player_id ?? null}
    />
  );
}

async function loadReactionData(viewerPlayerId: number | null): Promise<{
  matchId: number | null;
  open: boolean;
  counts: ReactionCountMap;
  myReactions: MyReactionMap;
}> {
  const empty = {
    matchId: null as number | null,
    open: false,
    counts: {} as ReactionCountMap,
    myReactions: {} as MyReactionMap,
  };

  const supabase = createPublicSupabaseClient();
  if (!supabase) return empty;

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, opponent, date, time, location, is_played, is_live, ndfk_goals, opponent_goals, rating_voting_ends_at"
    )
    .order("date", { ascending: false });

  const ctx = getReactionMatchContext((matches ?? []) as Match[]);
  if (!ctx.match) return empty;

  const { data: rows } = await supabase
    .from("match_player_reactions")
    .select("from_player_id, to_player_id, reaction_code")
    .eq("match_id", ctx.match.id);

  const reactionRows = rows ?? [];
  const myReactions =
    viewerPlayerId != null
      ? buildMyReactionMap(
          reactionRows.filter((row) => row.from_player_id === viewerPlayerId)
        )
      : {};

  return {
    matchId: ctx.match.id,
    open: ctx.open,
    counts: aggregateReactionCounts(reactionRows),
    myReactions,
  };
}

async function loadChampionshipSquad(
  championshipId: number,
  homeTeamId: number
): Promise<{ squad: ChampionshipLineupPlayer[]; schemaMissing: boolean }> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return { squad: [], schemaMissing: false };

  const { data, error } = await supabase
    .from("championship_player_season_stats")
    .select(
      "player_id, lineup_slot, player:players(id, name, position, photo_url, rating)"
    )
    .eq("championship_id", championshipId)
    .eq("team_id", homeTeamId);

  if (error) {
    const missing =
      error.message.includes("lineup_slot") ||
      error.message.includes("schema cache") ||
      error.message.includes("does not exist");
    if (missing) {
      const fallback = await supabase
        .from("championship_player_season_stats")
        .select(
          "player_id, player:players(id, name, position, photo_url, rating)"
        )
        .eq("championship_id", championshipId)
        .eq("team_id", homeTeamId);

      const rows = fallback.data ?? [];
      return {
        schemaMissing: true,
        squad: rows.map((row) => mapRow(row as SeasonRow, null)),
      };
    }
    return { squad: [], schemaMissing: false };
  }

  return {
    schemaMissing: false,
    squad: (data ?? []).map((row) =>
      mapRow(row as SeasonRow, (row as SeasonRow).lineup_slot ?? null)
    ),
  };
}

type SeasonRow = {
  player_id: number;
  lineup_slot?: string | null;
  player:
    | {
        id: number;
        name: string;
        position: string;
        photo_url?: string | null;
        rating?: number;
      }
    | {
        id: number;
        name: string;
        position: string;
        photo_url?: string | null;
        rating?: number;
      }[]
    | null;
};

function mapRow(
  row: SeasonRow,
  slot: string | null
): ChampionshipLineupPlayer {
  const player = Array.isArray(row.player) ? row.player[0] ?? null : row.player;
  return {
    id: row.player_id,
    name: player?.name ?? `Игрок #${row.player_id}`,
    position: player?.position ?? "ЦП",
    rating: Number(player?.rating ?? 70),
    photo_url: player?.photo_url ?? null,
    lineup_slot: (slot as LineupPosition | null) ?? null,
  };
}
