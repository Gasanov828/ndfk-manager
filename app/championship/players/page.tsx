import ChampionshipPlayersBoard from "@/components/championship/ChampionshipPlayersBoard";
import { getUserProfile } from "@/lib/auth";
import { getActiveChampionshipBundle } from "@/lib/championship/server";
import { getTeamPageData } from "@/lib/server/teamData";

export const dynamic = "force-dynamic";

export default async function ChampionshipPlayersPage() {
  const [{ data: bundle, error }, teamData, profile] = await Promise.all([
    getActiveChampionshipBundle(),
    getTeamPageData(),
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
        Команда «Дженгутай» не найдена в чемпионате
      </p>
    );
  }

  const homeId = bundle.homeClubTeamId;
  const seasonStats = await loadHomeSeasonPlayers(bundle.championship.id, homeId);

  const enrolled = seasonStats.map((row) => ({
    id: row.player_id,
    name: row.player?.name ?? `Игрок #${row.player_id}`,
    position: row.player?.position ?? "ЦП",
    rating: Number(row.player?.rating ?? 70),
    photo_url: row.player?.photo_url ?? null,
  }));

  const clubPlayers = (teamData.players ?? []).map((player) => ({
    id: player.id,
    name: player.name,
    position: player.position,
    rating: player.rating,
    photo_url: player.photo_url ?? null,
  }));

  const canManage = profile?.role === "admin";

  return (
    <ChampionshipPlayersBoard
      championshipId={bundle.championship.id}
      homeTeamId={homeId}
      enrolled={enrolled}
      clubPlayers={clubPlayers}
      canManage={canManage}
    />
  );
}

async function loadHomeSeasonPlayers(
  championshipId: number,
  homeTeamId: number
) {
  const { createPublicSupabaseClient } = await import(
    "@/lib/supabase/publicClient"
  );
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("championship_player_season_stats")
    .select(
      "player_id, player:players(id, name, position, photo_url, rating)"
    )
    .eq("championship_id", championshipId)
    .eq("team_id", homeTeamId);

  type Row = {
    player_id: number;
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

  return ((data ?? []) as Row[]).map((row) => ({
    player_id: row.player_id,
    player: Array.isArray(row.player) ? row.player[0] ?? null : row.player,
  }));
}
