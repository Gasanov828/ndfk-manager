import { getAuthSession } from "@/lib/auth";
import { getConfirmedMvpRecords } from "@/lib/server/careerMvp";
import { getPersonalRatingStats } from "@/lib/server/personalRatings";
import { getTeamPageData } from "@/lib/server/teamData";
import {
  emptyPersonalRatingStats,
  resolvePersonalAchievements,
} from "@/lib/personalAchievements";
import {
  buildTeamSeasonStats,
  resolveTeamAchievements,
} from "@/lib/teamAchievements";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";
import type { CommonAchievement } from "@/lib/careerMock";
import { NextResponse } from "next/server";

export async function GET() {
  const [{ profile }, teamData, records] = await Promise.all([
    getAuthSession(),
    getTeamPageData(),
    getConfirmedMvpRecords(),
  ]);

  const stats = buildTeamSeasonStats(
    teamData.matches,
    teamData.players,
    records.length
  );
  const achievements = resolveTeamAchievements(stats);

  const playerId =
    profile?.player_id && profile.role !== "admin" ? profile.player_id : null;

  const personalStats = playerId
    ? await getPersonalRatingStats(playerId)
    : emptyPersonalRatingStats();

  const personalAchievements = resolvePersonalAchievements(personalStats);

  // Постоянные награды чемпионатов (история, не сбрасываются с сезоном)
  const championshipAwards: CommonAchievement[] = [];
  const clubChampionshipAwards: CommonAchievement[] = [];
  const supabase = createPublicSupabaseClient();
  if (supabase) {
    let awardsQuery = supabase
      .from("championship_career_awards")
      .select("*")
      .order("awarded_at", { ascending: false })
      .limit(80);

    const { data: awards } = await awardsQuery;

    for (const row of awards ?? []) {
      const item: CommonAchievement = {
        id: `champ-career-${row.id}`,
        scope: row.scope === "club" ? "team" : "personal",
        icon: row.icon || "🏅",
        title: row.award_title,
        description: `Чемпионат · сезон ${row.season} · навсегда в карьере`,
        current: 1,
        target: 1,
        status: "earned",
        track: "championship",
        trackLabel: "Чемпионат",
      };
      if (row.scope === "club") {
        clubChampionshipAwards.push(item);
      } else if (playerId && Number(row.player_id) === playerId) {
        championshipAwards.push(item);
      }
    }
  }

  return NextResponse.json({
    stats,
    achievements: [...clubChampionshipAwards, ...achievements],
    records,
    personalStats,
    personalAchievements: [...championshipAwards, ...personalAchievements],
    championshipAwards,
    clubChampionshipAwards,
  });
}
