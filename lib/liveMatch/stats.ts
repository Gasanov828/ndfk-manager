import type { SupabaseClient } from "@supabase/supabase-js";
import type { LivePlayerStat } from "@/lib/liveMatch/types";

export async function loadMatchPlayerStats(
  matchId: number,
  db: SupabaseClient
): Promise<Record<number, LivePlayerStat>> {
  const { data, error } = await db
    .from("match_player_stats")
    .select("player_id, goals, assists, saves")
    .eq("match_id", matchId);

  if (error) return {};

  const map: Record<number, LivePlayerStat> = {};
  for (const row of data ?? []) {
    map[row.player_id] = {
      player_id: row.player_id,
      goals: Number(row.goals) || 0,
      assists: Number(row.assists) || 0,
      saves: Number(row.saves) || 0,
    };
  }
  return map;
}

async function bumpMatchStat(
  matchId: number,
  playerId: number,
  field: "goals" | "assists",
  db: SupabaseClient
): Promise<void> {
  const { data: existing } = await db
    .from("match_player_stats")
    .select("id, goals, assists, saves")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing) {
    await db
      .from("match_player_stats")
      .update({
        [field]: (Number(existing[field]) || 0) + 1,
      })
      .eq("id", existing.id);
  } else {
    await db.from("match_player_stats").insert({
      match_id: matchId,
      player_id: playerId,
      goals: field === "goals" ? 1 : 0,
      assists: field === "assists" ? 1 : 0,
      saves: 0,
    });
  }
}

async function bumpCareerStat(
  playerId: number,
  field: "goals" | "assists",
  db: SupabaseClient
): Promise<void> {
  const { data: player } = await db
    .from("players")
    .select("goals, assists")
    .eq("id", playerId)
    .maybeSingle();

  if (!player) return;

  const current = Number(player[field]) || 0;
  await db
    .from("players")
    .update({ [field]: current + 1 })
    .eq("id", playerId);
}

export async function recordGoalStat(
  matchId: number,
  playerId: number,
  db: SupabaseClient
): Promise<void> {
  await bumpMatchStat(matchId, playerId, "goals", db);
  await bumpCareerStat(playerId, "goals", db);
}

export async function recordAssistStat(
  matchId: number,
  playerId: number,
  db: SupabaseClient
): Promise<void> {
  await bumpMatchStat(matchId, playerId, "assists", db);
  await bumpCareerStat(playerId, "assists", db);
}

export async function incrementTeamScore(
  matchId: number,
  currentGoals: number,
  db: SupabaseClient
): Promise<number> {
  const next = currentGoals + 1;
  const { error } = await db
    .from("matches")
    .update({ ndfk_goals: next })
    .eq("id", matchId);

  if (error) throw new Error(error.message);
  return next;
}
