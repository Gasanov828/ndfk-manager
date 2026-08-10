import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcMatchXp,
  deriveLevelFromTotalXp,
} from "@/lib/championship/progressFormula";

/**
 * Итоги тура / матча чемпионата:
 * XP, уровень, сезонная оценка, карточки (счётчик).
 * Идемпотентно по championship_match_xp_log.
 */
export async function applyChampionshipTourResults(
  db: SupabaseClient,
  matchId: number
): Promise<{ ok: true; applied: boolean } | { ok: false; error: string }> {
  const { data: match, error: matchError } = await db
    .from("championship_matches")
    .select(
      "id, championship_id, is_played, tour_results_applied, round_id, home_team_id, away_team_id, home_goals, away_goals"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    return { ok: false, error: matchError?.message ?? "Матч не найден" };
  }
  if (!match.is_played) {
    return { ok: false, error: "Матч ещё не завершён" };
  }

  const championshipId = Number(match.championship_id);

  const { data: lines, error: linesError } = await db
    .from("championship_match_player_stats")
    .select("player_id, team_id, match_rating, is_mvp")
    .eq("match_id", matchId);

  if (linesError) {
    return { ok: false, error: linesError.message };
  }

  const playerIds = (lines ?? []).map((l) => Number(l.player_id));
  const positionByPlayer = new Map<number, string>();
  if (playerIds.length > 0) {
    const { data: players } = await db
      .from("players")
      .select("id, position")
      .in("id", playerIds);
    for (const p of players ?? []) {
      positionByPlayer.set(Number(p.id), String(p.position ?? ""));
    }
  }

  const { getPositionGroup } = await import("@/lib/positionStyles");

  for (const line of lines ?? []) {
    const playerId = Number(line.player_id);
    const teamId = Number(line.team_id);
    const rating =
      line.match_rating != null && Number(line.match_rating) > 0
        ? Number(line.match_rating)
        : null;
    const isMvp = Boolean(line.is_mvp);
    const isGk =
      getPositionGroup(null, positionByPlayer.get(playerId) ?? "") === "ВРТ";
    let cleanSheetBonus = false;
    if (
      isGk &&
      match.home_goals != null &&
      match.away_goals != null
    ) {
      const conceded =
        Number(match.home_team_id) === teamId
          ? Number(match.away_goals)
          : Number(match.home_goals);
      cleanSheetBonus = conceded === 0;
    }
    const xpGained = calcMatchXp({
      matchRating: rating,
      isMvp,
      cleanSheetBonus,
    });

    const { data: existingLog } = await db
      .from("championship_match_xp_log")
      .select("id, xp_gained")
      .eq("match_id", matchId)
      .eq("player_id", playerId)
      .maybeSingle();

    if (existingLog) {
      // Уже начислено за этот матч — пропускаем (идемпотентность)
      continue;
    }

    const { data: progress } = await db
      .from("championship_player_progress")
      .select("*")
      .eq("championship_id", championshipId)
      .eq("player_id", playerId)
      .maybeSingle();

    const prevXp = Number(progress?.season_xp ?? 0);
    const levelBefore = deriveLevelFromTotalXp(prevXp).level;
    const nextXp = prevXp + xpGained;
    const derived = deriveLevelFromTotalXp(nextXp);
    const levelsGained = Math.max(0, derived.level - levelBefore);

    let ratingSum = Number(progress?.rating_sum ?? 0);
    let ratingCount = Number(progress?.rating_count ?? 0);
    if (rating != null) {
      ratingSum += rating;
      ratingCount += 1;
    }
    const seasonRating =
      ratingCount > 0
        ? Math.round((ratingSum / ratingCount) * 10) / 10
        : 0;

    const seasonCards =
      Number(progress?.season_cards ?? 0) + levelsGained;
    const seasonRewards = Number(progress?.season_rewards ?? 0);

    if (progress) {
      const { error } = await db
        .from("championship_player_progress")
        .update({
          season_xp: nextXp,
          season_level: derived.level,
          season_rating: seasonRating,
          season_cards: seasonCards,
          season_rewards: seasonRewards,
          rating_sum: ratingSum,
          rating_count: ratingCount,
          team_id: teamId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", progress.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await db.from("championship_player_progress").insert({
        championship_id: championshipId,
        player_id: playerId,
        team_id: teamId,
        season_xp: nextXp,
        season_level: derived.level,
        season_rating: seasonRating,
        season_cards: seasonCards,
        season_rewards: seasonRewards,
        rating_sum: ratingSum,
        rating_count: ratingCount,
      });
      if (error) return { ok: false, error: error.message };
    }

    // Архитектура карточек: за каждый новый уровень — запись-заглушка
    for (let i = 0; i < levelsGained; i++) {
      const cardLevel = levelBefore + i + 1;
      await db.from("championship_season_cards").insert({
        championship_id: championshipId,
        player_id: playerId,
        card_code: `level_${cardLevel}`,
        card_title: `Карточка уровня ${cardLevel}`,
        rarity: cardLevel >= 5 ? "rare" : "common",
        meta: { source: "level_up", level: cardLevel, match_id: matchId },
      });
    }

    await db.from("championship_match_xp_log").insert({
      match_id: matchId,
      player_id: playerId,
      match_rating: rating,
      xp_gained: xpGained,
      level_before: levelBefore,
      level_after: derived.level,
    });
  }

  await db
    .from("championship_matches")
    .update({ tour_results_applied: true })
    .eq("id", matchId);

  const roundId = match.round_id != null ? Number(match.round_id) : 0;
  if (roundId > 0) {
    const { data: roundMatches } = await db
      .from("championship_matches")
      .select("id, is_played, tour_results_applied")
      .eq("round_id", roundId);
    const allDone = (roundMatches ?? []).every(
      (row) => row.is_played && row.tour_results_applied
    );
    if (allDone) {
      await db
        .from("championship_rounds")
        .update({
          status: "finished",
          results_applied_at: new Date().toISOString(),
        })
        .eq("id", roundId);
      try {
        const { rebuildTourXiForRound } = await import(
          "@/lib/championship/blackGold"
        );
        await rebuildTourXiForRound(db, championshipId, roundId);
      } catch {
        // tour XI table optional until SQL applied
      }
    }
  } else {
    try {
      const { rebuildMatchEliteXi } = await import(
        "@/lib/championship/blackGold"
      );
      await rebuildMatchEliteXi(db, championshipId, matchId);
    } catch {
      // optional
    }
  }

  return { ok: true, applied: true };
}
