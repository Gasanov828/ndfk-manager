import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type CareerTotals = { goals: number; assists: number };

/**
 * Сумма голов/пассов только по матчам, которые ещё существуют.
 * Игнорирует «осиротевшие» match_player_stats после удаления матча.
 */
export async function computePlayerCareerTotals(
  db: SupabaseClient = supabase
): Promise<Map<number, CareerTotals>> {
  const [{ data: matches }, { data: stats }] = await Promise.all([
    db.from("matches").select("id"),
    db.from("match_player_stats").select("match_id, player_id, goals, assists"),
  ]);

  const matchIds = new Set((matches ?? []).map((row) => Number(row.id)));
  const totals = new Map<number, CareerTotals>();

  for (const row of stats ?? []) {
    if (!matchIds.has(Number(row.match_id))) continue;
    const playerId = Number(row.player_id);
    const current = totals.get(playerId) ?? { goals: 0, assists: 0 };
    current.goals += Number(row.goals) || 0;
    current.assists += Number(row.assists) || 0;
    totals.set(playerId, current);
  }

  return totals;
}

/**
 * Удаляет статистику матчей, которых уже нет, и переписывает
 * players.goals / players.assists по оставшимся матчам.
 */
export async function syncPlayerCareerTotals(
  db: SupabaseClient = supabase
): Promise<{ orphanStatsRemoved: number; playersUpdated: number }> {
  const [
    { data: matches, error: matchesError },
    { data: stats, error: statsError },
    { data: players },
  ] = await Promise.all([
    db.from("matches").select("id"),
    db.from("match_player_stats").select("id, match_id, player_id, goals, assists"),
    db.from("players").select("id, goals, assists"),
  ]);

  // Защита от массового удаления: если запрос matches упал (сеть/RLS/таймаут)
  // или неожиданно вернулся пустым при наличии статистики — это почти наверняка
  // сбой чтения, а не "все матчи удалены". Раньше при таком сбое matchIds
  // оказывался пустым, и КАЖДАЯ запись match_player_stats считалась "осиротевшей",
  // что стирало голоса/оценки/составы по всем матчам сразу. Теперь в таких
  // случаях просто пропускаем очистку и ничего не удаляем.
  if (matchesError) {
    console.error("syncPlayerCareerTotals: matches query failed, skipping cleanup", matchesError);
    return { orphanStatsRemoved: 0, playersUpdated: 0 };
  }
  if (statsError) {
    console.error("syncPlayerCareerTotals: match_player_stats query failed, skipping cleanup", statsError);
    return { orphanStatsRemoved: 0, playersUpdated: 0 };
  }

  const matchIds = new Set((matches ?? []).map((row) => Number(row.id)));

  if (matchIds.size === 0 && (stats ?? []).length > 0) {
    console.error(
      "syncPlayerCareerTotals: matches came back empty while match_player_stats has rows — skipping cleanup as a likely read glitch"
    );
    return { orphanStatsRemoved: 0, playersUpdated: 0 };
  }

  const orphanIds = (stats ?? [])
    .filter((row) => !matchIds.has(Number(row.match_id)))
    .map((row) => Number(row.id));

  if (orphanIds.length > 0) {
    // chunk deletes in case of many orphans
    const chunkSize = 100;
    for (let i = 0; i < orphanIds.length; i += chunkSize) {
      const chunk = orphanIds.slice(i, i + chunkSize);
      await db.from("match_player_stats").delete().in("id", chunk);
    }
  }

  // Also drop orphan rating rows / live events if cascades missed
  const orphanMatchIds = [
    ...new Set(
      (stats ?? [])
        .filter((row) => !matchIds.has(Number(row.match_id)))
        .map((row) => Number(row.match_id))
    ),
  ];
  for (const matchId of orphanMatchIds) {
    await db.from("match_player_rating_votes").delete().eq("match_id", matchId);
    await db
      .from("match_player_rating_summary")
      .delete()
      .eq("match_id", matchId);
    await db.from("match_live_events").delete().eq("match_id", matchId);
    await db.from("match_player_participation").delete().eq("match_id", matchId);
    await db.from("match_availability").delete().eq("match_id", matchId);
  }

  const totals = new Map<number, CareerTotals>();
  for (const row of stats ?? []) {
    if (!matchIds.has(Number(row.match_id))) continue;
    const playerId = Number(row.player_id);
    const current = totals.get(playerId) ?? { goals: 0, assists: 0 };
    current.goals += Number(row.goals) || 0;
    current.assists += Number(row.assists) || 0;
    totals.set(playerId, current);
  }

  let playersUpdated = 0;
  await Promise.all(
    (players ?? []).map(async (player) => {
      const next = totals.get(player.id) ?? { goals: 0, assists: 0 };
      if (
        Number(player.goals) === next.goals &&
        Number(player.assists) === next.assists
      ) {
        return;
      }
      playersUpdated += 1;
      await db
        .from("players")
        .update({ goals: next.goals, assists: next.assists })
        .eq("id", player.id);
    })
  );

  return { orphanStatsRemoved: orphanIds.length, playersUpdated };
}
