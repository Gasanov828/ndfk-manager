import { getAuthSession } from "@/lib/auth";
import {
  buildAchievementProgressList,
  buildPlayerAchievementStats,
  syncPendingMatchAchievements,
} from "@/lib/achievements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { user, profile } = await getAuthSession();
  if (!user || !profile?.player_id || profile.role === "admin") {
    return NextResponse.json({
      progress: [],
      unlocked: [],
      stats: null,
      totalXp: 0,
      unseen: [],
    });
  }

  const playerId = profile.player_id;
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  // добить просроченные матчи без sync
  if (admin) {
    try {
      await syncPendingMatchAchievements(admin, 3);
    } catch {
      // ignore
    }
  }

  try {
    await (await import("@/lib/achievements/sync")).awardPlayerAchievements(
      playerId,
      supabase
    );
  } catch {
    // table may be missing
  }

  const stats = await buildPlayerAchievementStats(playerId, supabase);

  const { data: unlockedRows } = await supabase
    .from("player_achievements")
    .select("achievement_id, unlocked_at, xp_awarded")
    .eq("player_id", playerId)
    .order("unlocked_at", { ascending: false });

  const unlockedMap = new Map<string, string>();
  let totalXp = 0;
  for (const row of unlockedRows ?? []) {
    unlockedMap.set(row.achievement_id, row.unlocked_at);
    totalXp += Number(row.xp_awarded) || 0;
  }

  const progress = buildAchievementProgressList(stats, unlockedMap);

  const { data: unseenRows } = await supabase
    .from("player_achievement_events")
    .select("id, achievement_id, xp_awarded, created_at")
    .eq("player_id", playerId)
    .is("seen_at", null)
    .order("created_at", { ascending: true })
    .limit(5);

  const { getAchievementDefinition } = await import("@/lib/achievements");
  const unseen = (unseenRows ?? [])
    .map((row) => {
      const def = getAchievementDefinition(row.achievement_id);
      if (!def) return null;
      return {
        eventId: row.id as number,
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        rarity: def.rarity,
        xp: row.xp_awarded || def.xp,
        unlockedAt: row.created_at as string,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    progress,
    unlocked: progress.filter((item) => item.earned),
    stats,
    totalXp,
    unseen,
  });
}
