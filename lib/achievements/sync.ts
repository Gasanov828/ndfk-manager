import type { SupabaseClient } from "@supabase/supabase-js";
import { findNewlyEarnedAchievements } from "@/lib/achievements/evaluate";
import { getAchievementDefinition } from "@/lib/achievements/registry";
import { buildPlayerAchievementStats } from "@/lib/achievements/stats";
import type { UnlockedAchievement } from "@/lib/achievements/types";
import {
  filterParticipatingPlayerIds,
} from "@/lib/matchParticipation";
import { isVotingDeadlinePassed } from "@/lib/matchRatings";

export type AchievementSyncResult = {
  playerId: number;
  unlocked: UnlockedAchievement[];
};

async function loadParticipantIds(
  matchId: number,
  db: SupabaseClient
): Promise<number[]> {
  const { data: allPlayers } = await db.from("players").select("id").order("name");
  const allIds = (allPlayers ?? []).map((row) => row.id as number);

  const { data: participation, error } = await db
    .from("match_player_participation")
    .select("player_id, participated")
    .eq("match_id", matchId);

  if (error?.message.includes("match_player_participation")) {
    return allIds;
  }

  return filterParticipatingPlayerIds(allIds, participation ?? []);
}

async function loadUnlockedIds(
  playerId: number,
  db: SupabaseClient
): Promise<Set<string>> {
  const { data } = await db
    .from("player_achievements")
    .select("achievement_id")
    .eq("player_id", playerId);

  return new Set((data ?? []).map((row) => row.achievement_id as string));
}

/** Выдать игроку все новые достижения по текущей статистике */
export async function awardPlayerAchievements(
  playerId: number,
  db: SupabaseClient
): Promise<UnlockedAchievement[]> {
  const [stats, unlockedIds] = await Promise.all([
    buildPlayerAchievementStats(playerId, db),
    loadUnlockedIds(playerId, db),
  ]);

  const newly = findNewlyEarnedAchievements(stats, unlockedIds);
  if (newly.length === 0) return [];

  const now = new Date().toISOString();
  const unlocked: UnlockedAchievement[] = [];

  for (const def of newly) {
    const { error } = await db.from("player_achievements").insert({
      player_id: playerId,
      achievement_id: def.id,
      unlocked_at: now,
      xp_awarded: def.xp,
    });

    if (error) {
      // unique race — skip
      if (error.code === "23505") continue;
      // table missing — soft fail
      if (error.message?.includes("player_achievements")) return unlocked;
      throw error;
    }

    await db.from("player_achievement_events").insert({
      player_id: playerId,
      achievement_id: def.id,
      xp_awarded: def.xp,
      created_at: now,
    });

    unlocked.push({
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      rarity: def.rarity,
      xp: def.xp,
      unlockedAt: now,
    });
  }

  return unlocked;
}

/**
 * После закрытия голосования по матчу —
 * проверяем достижения у всех участников.
 */
export async function syncAchievementsForMatch(
  matchId: number,
  db: SupabaseClient
): Promise<AchievementSyncResult[]> {
  const { data: match, error: matchError } = await db
    .from("matches")
    .select(
      "id, date, time, is_played, rating_voting_ends_at, achievements_synced_at"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) return [];

  const closed = isVotingDeadlinePassed({
    date: match.date,
    time: match.time || "00:00",
    is_played: Boolean(match.is_played),
    rating_voting_ends_at: match.rating_voting_ends_at ?? null,
  });

  if (!closed || !match.is_played) return [];

  const participantIds = await loadParticipantIds(matchId, db);
  const results: AchievementSyncResult[] = [];

  for (const playerId of participantIds) {
    try {
      const unlocked = await awardPlayerAchievements(playerId, db);
      if (unlocked.length > 0) {
        results.push({ playerId, unlocked });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("player_achievements")) {
        // SQL ещё не применён — тихо выходим
        return [];
      }
      throw error;
    }
  }

  await db
    .from("matches")
    .update({ achievements_synced_at: new Date().toISOString() })
    .eq("id", matchId);

  return results;
}

/** Добить матчи, у которых дедлайн прошёл, а sync ещё не был */
export async function syncPendingMatchAchievements(
  db: SupabaseClient,
  limit = 5
): Promise<number> {
  const { data: matches } = await db
    .from("matches")
    .select("id, date, time, is_played, rating_voting_ends_at, achievements_synced_at")
    .eq("is_played", true)
    .is("achievements_synced_at", null)
    .limit(20);

  let synced = 0;
  for (const match of matches ?? []) {
    if (synced >= limit) break;
    const closed = isVotingDeadlinePassed({
      date: match.date,
      time: match.time || "00:00",
      is_played: true,
      rating_voting_ends_at: match.rating_voting_ends_at ?? null,
    });
    if (!closed) continue;
    await syncAchievementsForMatch(match.id, db);
    synced += 1;
  }
  return synced;
}

export function mapRowsToUnlocked(
  rows: { achievement_id: string; unlocked_at: string; xp_awarded: number }[]
): UnlockedAchievement[] {
  return rows
    .map((row) => {
      const def = getAchievementDefinition(row.achievement_id);
      if (!def) return null;
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        rarity: def.rarity,
        xp: row.xp_awarded || def.xp,
        unlockedAt: row.unlocked_at,
      };
    })
    .filter((item): item is UnlockedAchievement => item != null);
}
