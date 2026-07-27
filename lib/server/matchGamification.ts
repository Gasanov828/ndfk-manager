import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { buildPlayerStats } from "@/lib/gamification/aggregate";
import {
  computeCareerXp,
  getLevelForXp,
  xpForMatch,
} from "@/lib/gamification/career";
import {
  evaluateEarnedAchievementKeys,
  getAchievementByKey,
} from "@/lib/gamification/achievements";
import { getSeasonForDate } from "@/lib/gamification/season";
import type { AchievementTier } from "@/lib/gamification/achievements";
import type { RatedMatchEntry } from "@/lib/gamification/types";

export type EarnedAchievement = {
  key: string;
  title: string;
  emoji: string;
  description: string;
  tier: AchievementTier;
};

export type PlayerMatchGamification = {
  playerId: number;
  hasVotes: boolean;
  /** Итоговая оценка за этот матч (null → «Нет оценок за этот матч»). */
  matchRating: number | null;
  isMvp: boolean;
  voteCount: number;
  season: number;
  seasonAvg: number;
  seasonMatches: number;
  careerAvg: number;
  matchesRated: number;
  xpGained: number;
  xp: number;
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number;
  leveledUp: boolean;
  previousLevel: number;
  previousTitle: string;
  newAchievements: EarnedAchievement[];
};

type SummaryRow = {
  player_id: number;
  match_id: number;
  match_rating: number | string;
  vote_count: number;
  is_mvp: boolean;
};

type StatRow = {
  player_id: number;
  match_id: number;
  goals: number | null;
  assists: number | null;
  saves: number | null;
};

function statKey(playerId: number, matchId: number): string {
  return `${playerId}:${matchId}`;
}

/**
 * Recompute season averages, career XP/level/title and achievements for every
 * player, then return the per-player result for the participants of `matchId`
 * (used to power the post-match results screen).
 *
 * The whole computation is deterministic and idempotent: it is derived purely
 * from stored rating summaries, so it is safe to run on every recalc.
 */
export async function processMatchGamification(
  matchId: number,
  db: SupabaseClient = supabase
): Promise<Record<number, PlayerMatchGamification>> {
  const [{ data: matches }, { data: summaries }, { data: stats }] =
    await Promise.all([
      db.from("matches").select("id, date"),
      db
        .from("match_player_rating_summary")
        .select("player_id, match_id, match_rating, vote_count, is_mvp"),
      db
        .from("match_player_stats")
        .select("player_id, match_id, goals, assists, saves"),
    ]);

  const matchDate = new Map<number, string>();
  for (const row of matches ?? []) {
    matchDate.set(row.id, row.date);
  }

  const statMap = new Map<string, StatRow>();
  for (const row of (stats ?? []) as StatRow[]) {
    statMap.set(statKey(row.player_id, row.match_id), row);
  }

  // Build per-player match entries from summaries (a summary row exists for
  // every participant after recalc). Stats are merged in where present.
  const entriesByPlayer = new Map<number, RatedMatchEntry[]>();
  for (const row of (summaries ?? []) as SummaryRow[]) {
    const stat = statMap.get(statKey(row.player_id, row.match_id));
    const entry: RatedMatchEntry = {
      matchId: row.match_id,
      date: matchDate.get(row.match_id) ?? new Date().toISOString(),
      season: getSeasonForDate(matchDate.get(row.match_id)),
      matchRating: Number(row.match_rating) || 0,
      voteCount: row.vote_count ?? 0,
      isMvp: Boolean(row.is_mvp),
      goals: stat?.goals ?? 0,
      assists: stat?.assists ?? 0,
      saves: stat?.saves ?? 0,
    };
    const list = entriesByPlayer.get(row.player_id) ?? [];
    list.push(entry);
    entriesByPlayer.set(row.player_id, list);
  }

  // Existing career / achievements to detect level-ups and freshly earned badges.
  const [{ data: existingCareer }, { data: existingAchievements }] =
    await Promise.all([
      db.from("player_career").select("player_id, level, title"),
      db.from("player_achievements").select("player_id, achievement_key"),
    ]);

  const prevCareer = new Map<number, { level: number; title: string }>();
  for (const row of existingCareer ?? []) {
    prevCareer.set(row.player_id, { level: row.level, title: row.title });
  }

  const earnedByPlayer = new Map<number, Set<string>>();
  for (const row of existingAchievements ?? []) {
    const set = earnedByPlayer.get(row.player_id) ?? new Set<string>();
    set.add(row.achievement_key);
    earnedByPlayer.set(row.player_id, set);
  }

  const careerRows: {
    player_id: number;
    xp: number;
    level: number;
    title: string;
    matches_rated: number;
    updated_at: string;
  }[] = [];
  const seasonRows: {
    player_id: number;
    season: number;
    matches_rated: number;
    sum_rating: number;
    avg_rating: number;
    updated_at: string;
  }[] = [];
  const achievementInserts: {
    player_id: number;
    achievement_key: string;
    match_id: number;
  }[] = [];

  const participantIds = new Set(
    ((summaries ?? []) as SummaryRow[])
      .filter((row) => row.match_id === matchId)
      .map((row) => row.player_id)
  );

  const results: Record<number, PlayerMatchGamification> = {};
  const now = new Date().toISOString();

  for (const [playerId, entries] of entriesByPlayer.entries()) {
    const stats = buildPlayerStats(playerId, entries);
    const xp = computeCareerXp(stats.ratedMatches);
    const levelInfo = getLevelForXp(xp);

    careerRows.push({
      player_id: playerId,
      xp,
      level: levelInfo.level,
      title: levelInfo.title,
      matches_rated: stats.matchesRated,
      updated_at: now,
    });

    for (const season of stats.seasons) {
      seasonRows.push({
        player_id: playerId,
        season: season.season,
        matches_rated: season.matchesRated,
        sum_rating: season.sumRating,
        avg_rating: season.avgRating,
        updated_at: now,
      });
    }

    const earnedKeys = evaluateEarnedAchievementKeys(stats);
    const alreadyEarned = earnedByPlayer.get(playerId) ?? new Set<string>();
    const newKeys = earnedKeys.filter((key) => !alreadyEarned.has(key));
    for (const key of newKeys) {
      achievementInserts.push({
        player_id: playerId,
        achievement_key: key,
        match_id: matchId,
      });
    }

    if (participantIds.has(playerId)) {
      const thisMatch = entries.find((entry) => entry.matchId === matchId);
      const prev = prevCareer.get(playerId);
      const previousLevel = prev?.level ?? 1;
      const thisSeason = thisMatch
        ? stats.seasons.find((s) => s.season === thisMatch.season)
        : undefined;

      results[playerId] = {
        playerId,
        hasVotes: Boolean(thisMatch && thisMatch.voteCount > 0),
        matchRating:
          thisMatch && thisMatch.voteCount > 0 ? thisMatch.matchRating : null,
        isMvp: Boolean(thisMatch?.isMvp),
        voteCount: thisMatch?.voteCount ?? 0,
        season: thisMatch?.season ?? getSeasonForDate(now),
        seasonAvg: thisSeason?.avgRating ?? 0,
        seasonMatches: thisSeason?.matchesRated ?? 0,
        careerAvg: stats.careerAvg,
        matchesRated: stats.matchesRated,
        xpGained: thisMatch ? xpForMatch(thisMatch) : 0,
        xp: levelInfo.xp,
        level: levelInfo.level,
        title: levelInfo.title,
        xpIntoLevel: levelInfo.xpIntoLevel,
        xpForNext: levelInfo.xpForNext,
        progress: levelInfo.progress,
        leveledUp: levelInfo.level > previousLevel,
        previousLevel,
        previousTitle: prev?.title ?? "Новичок",
        newAchievements: newKeys
          .map((key) => getAchievementByKey(key))
          .filter((a): a is NonNullable<typeof a> => Boolean(a))
          .map((a) => ({
            key: a.key,
            title: a.title,
            emoji: a.emoji,
            description: a.description,
            tier: a.tier,
          })),
      };
    }
  }

  if (careerRows.length > 0) {
    await db.from("player_career").upsert(careerRows, { onConflict: "player_id" });
  }
  if (seasonRows.length > 0) {
    await db
      .from("player_season_stats")
      .upsert(seasonRows, { onConflict: "player_id,season" });
  }
  if (achievementInserts.length > 0) {
    await db
      .from("player_achievements")
      .upsert(achievementInserts, {
        onConflict: "player_id,achievement_key",
        ignoreDuplicates: true,
      });
  }

  return results;
}
