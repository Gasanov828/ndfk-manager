import type { SupabaseClient } from "@supabase/supabase-js";

type GrantParams = {
  championshipId: number;
  season: string;
  awardCode: string;
  awardTitle: string;
  icon?: string;
  playerId?: number | null;
  teamId?: number | null;
  scope: "player" | "club";
  /** Если true — только один держатель на сезон (бомбардир и т.п.) */
  exclusive?: boolean;
  /** XP в копилку карьерных достижений (не сезон XP) */
  careerXp?: number;
};

const EXCLUSIVE_CODES = new Set([
  "top_scorer",
  "top_assister",
  "best_player",
  "champion",
]);

/**
 * Постоянная награда чемпионата → история карьеры игрока/клуба.
 * Сезонный XP/уровень не трогаем.
 */
export async function grantChampionshipCareerAward(
  db: SupabaseClient,
  params: GrantParams
): Promise<{ granted: boolean; error?: string }> {
  const {
    championshipId,
    season,
    awardCode,
    awardTitle,
    icon = "🏅",
    playerId = null,
    teamId = null,
    scope,
    exclusive = EXCLUSIVE_CODES.has(awardCode),
    careerXp = 0,
  } = params;

  const awardKeyPrefix = `${championshipId}:${awardCode}:`;
  const achievementId = `champ:${championshipId}:${awardCode}`;

  if (exclusive) {
    const { data: previous } = await db
      .from("championship_career_awards")
      .select("player_id")
      .eq("championship_id", championshipId)
      .eq("award_code", awardCode);

    await db
      .from("championship_career_awards")
      .delete()
      .eq("championship_id", championshipId)
      .eq("award_code", awardCode);

    // Снимаем титул у предыдущих держателей в карьере
    for (const row of previous ?? []) {
      if (row.player_id) {
        await db
          .from("player_achievements")
          .delete()
          .eq("player_id", row.player_id)
          .eq("achievement_id", achievementId);
      }
    }
  }

  const awardKey =
    scope === "player"
      ? `${awardKeyPrefix}player:${playerId ?? 0}`
      : `${awardKeyPrefix}club:${teamId ?? 0}`;

  const { error } = await db.from("championship_career_awards").upsert(
    {
      championship_id: championshipId,
      season,
      award_key: awardKey,
      award_code: awardCode,
      award_title: awardTitle,
      icon,
      player_id: scope === "player" ? playerId : null,
      team_id: teamId,
      scope,
    },
    { onConflict: "award_key" }
  );

  if (error) {
    return { granted: false, error: error.message };
  }

  if (scope === "player" && playerId) {
    const { data: existing } = await db
      .from("player_achievements")
      .select("id")
      .eq("player_id", playerId)
      .eq("achievement_id", achievementId)
      .maybeSingle();

    if (!existing) {
      await db.from("player_achievements").insert({
        player_id: playerId,
        achievement_id: achievementId,
        xp_awarded: careerXp,
      });
      await db.from("player_achievement_events").insert({
        player_id: playerId,
        achievement_id: achievementId,
        xp_awarded: careerXp,
      });
    }
  }

  return { granted: true };
}

/** Лидеры сезона → карьера */
export async function syncChampionshipLeaderAwards(
  db: SupabaseClient,
  params: {
    championshipId: number;
    season: string;
    homeTeamId: number | null;
    topScorer?: { playerId: number; goals: number } | null;
    topAssister?: { playerId: number; assists: number } | null;
    bestPlayer?: { playerId: number } | null;
    championTeamId?: number | null;
  }
) {
  const { championshipId, season, homeTeamId } = params;

  if (params.topScorer && params.topScorer.goals > 0) {
    await grantChampionshipCareerAward(db, {
      championshipId,
      season,
      awardCode: "top_scorer",
      awardTitle: `Лучший бомбардир чемпионата ${season}`,
      icon: "⚽",
      playerId: params.topScorer.playerId,
      teamId: homeTeamId,
      scope: "player",
      exclusive: true,
      careerXp: 50,
    });
  }

  if (params.topAssister && params.topAssister.assists > 0) {
    await grantChampionshipCareerAward(db, {
      championshipId,
      season,
      awardCode: "top_assister",
      awardTitle: `Лучший ассистент чемпионата ${season}`,
      icon: "🎯",
      playerId: params.topAssister.playerId,
      teamId: homeTeamId,
      scope: "player",
      exclusive: true,
      careerXp: 40,
    });
  }

  if (params.bestPlayer) {
    await grantChampionshipCareerAward(db, {
      championshipId,
      season,
      awardCode: "best_player",
      awardTitle: `Лучший игрок чемпионата ${season}`,
      icon: "⭐",
      playerId: params.bestPlayer.playerId,
      teamId: homeTeamId,
      scope: "player",
      exclusive: true,
      careerXp: 60,
    });
  }

  if (params.championTeamId) {
    await grantChampionshipCareerAward(db, {
      championshipId,
      season,
      awardCode: "champion",
      awardTitle: `Чемпион сезона ${season}`,
      icon: "🏆",
      teamId: params.championTeamId,
      scope: "club",
      exclusive: true,
    });
  }
}

type MatchLine = {
  playerId: number;
  teamId?: number;
  goals: number;
  assists: number;
  isMvp: boolean;
  matchRating: number | null;
};

/**
 * После матча: личные и клубные вехи чемпионата → карьера.
 */
export async function syncChampionshipMatchCareerAwards(
  db: SupabaseClient,
  params: {
    championshipId: number;
    season: string;
    homeTeamId: number | null;
    matchId: number;
    homeGoals: number;
    awayGoals: number;
    homeTeamMatchId: number;
    awayTeamMatchId: number;
    lines: MatchLine[];
  }
) {
  const {
    championshipId,
    season,
    homeTeamId,
    homeGoals,
    awayGoals,
    homeTeamMatchId,
    awayTeamMatchId,
    lines,
  } = params;

  for (const line of lines) {
    if (line.goals >= 1) {
      await grantChampionshipCareerAward(db, {
        championshipId,
        season,
        awardCode: `first_goal`,
        awardTitle: `Первый гол в чемпионате ${season}`,
        icon: "⚽",
        playerId: line.playerId,
        teamId: homeTeamId,
        scope: "player",
        exclusive: false,
        careerXp: 15,
      });
    }
    if (line.goals >= 2) {
      await grantChampionshipCareerAward(db, {
        championshipId,
        season,
        awardCode: `brace_${line.playerId}`,
        awardTitle: `Дубль в чемпионате ${season}`,
        icon: "2️⃣",
        playerId: line.playerId,
        teamId: homeTeamId,
        scope: "player",
        exclusive: false,
        careerXp: 25,
      });
    }
    if (line.goals >= 3) {
      await grantChampionshipCareerAward(db, {
        championshipId,
        season,
        awardCode: `hattrick_${line.playerId}`,
        awardTitle: `Хет-трик чемпионата ${season}`,
        icon: "🎩",
        playerId: line.playerId,
        teamId: homeTeamId,
        scope: "player",
        exclusive: false,
        careerXp: 40,
      });
    }
    if (line.assists >= 1) {
      await grantChampionshipCareerAward(db, {
        championshipId,
        season,
        awardCode: `first_assist`,
        awardTitle: `Первый ассист в чемпионате ${season}`,
        icon: "🎯",
        playerId: line.playerId,
        teamId: homeTeamId,
        scope: "player",
        exclusive: false,
        careerXp: 10,
      });
    }
    if (line.isMvp) {
      await grantChampionshipCareerAward(db, {
        championshipId,
        season,
        awardCode: `mvp_${params.matchId}`,
        awardTitle: `MVP матча чемпионата ${season}`,
        icon: "👑",
        playerId: line.playerId,
        teamId: homeTeamId,
        scope: "player",
        exclusive: false,
        careerXp: 30,
      });
    }
    if (line.matchRating != null && line.matchRating >= 8) {
      await grantChampionshipCareerAward(db, {
        championshipId,
        season,
        awardCode: `rating8_${params.matchId}_${line.playerId}`,
        awardTitle: `Оценка 8+ в чемпионате ${season}`,
        icon: "✨",
        playerId: line.playerId,
        teamId: homeTeamId,
        scope: "player",
        exclusive: false,
        careerXp: 20,
      });
    }
  }

  // Клубные вехи (наш матч)
  if (homeTeamId != null) {
    const weAreHome = homeTeamMatchId === homeTeamId;
    const weAreAway = awayTeamMatchId === homeTeamId;
    if (weAreHome || weAreAway) {
      const scored = weAreHome ? homeGoals : awayGoals;
      const conceded = weAreHome ? awayGoals : homeGoals;
      if (scored > conceded) {
        await grantChampionshipCareerAward(db, {
          championshipId,
          season,
          awardCode: "first_win",
          awardTitle: `Первая победа в чемпионате ${season}`,
          icon: "🟢",
          teamId: homeTeamId,
          scope: "club",
          exclusive: false,
        });
      }
      if (conceded === 0 && scored >= 0) {
        await grantChampionshipCareerAward(db, {
          championshipId,
          season,
          awardCode: `clean_sheet_${params.matchId}`,
          awardTitle: `Сухой матч чемпионата ${season}`,
          icon: "🧤",
          teamId: homeTeamId,
          scope: "club",
          exclusive: false,
        });

        // Личные награды вратарям, которые сыграли в сухом матче
        const { getPositionGroup } = await import("@/lib/positionStyles");
        const gkIds = lines.map((l) => l.playerId);
        if (gkIds.length > 0) {
          const { data: players } = await db
            .from("players")
            .select("id, position")
            .in("id", gkIds);
          const gkSet = new Set(
            (players ?? [])
              .filter(
                (p) =>
                  getPositionGroup(null, String(p.position ?? "")) === "ВРТ"
              )
              .map((p) => Number(p.id))
          );
          for (const line of lines) {
            if (!gkSet.has(line.playerId)) continue;
            const lineTeamId: number =
              line.teamId != null ? Number(line.teamId) : Number(homeTeamId);
            if (lineTeamId !== Number(homeTeamId)) continue;
            await grantChampionshipCareerAward(db, {
              championshipId,
              season,
              awardCode: `gk_clean_${params.matchId}`,
              awardTitle: `🧤 Сухой матч вратаря · ${season}`,
              icon: "🧱",
              playerId: line.playerId,
              teamId: homeTeamId,
              scope: "player",
              exclusive: false,
              careerXp: 35,
            });
          }
        }
      }
    }
  }

  // Уровни прогресса → карьера (вехи 3 / 5 / 10)
  const { data: progressRows } = await db
    .from("championship_player_progress")
    .select("player_id, season_level, season_cards")
    .eq("championship_id", championshipId);

  for (const row of progressRows ?? []) {
    const level = Number(row.season_level) || 1;
    const playerId = Number(row.player_id);
    for (const milestone of [3, 5, 10]) {
      if (level >= milestone) {
        await grantChampionshipCareerAward(db, {
          championshipId,
          season,
          awardCode: `level_${milestone}`,
          awardTitle: `Уровень ${milestone} в чемпионате ${season}`,
          icon: "📈",
          playerId,
          teamId: homeTeamId,
          scope: "player",
          exclusive: false,
          careerXp: milestone * 5,
        });
      }
    }
    if (Number(row.season_cards) > 0) {
      await grantChampionshipCareerAward(db, {
        championshipId,
        season,
        awardCode: `first_card`,
        awardTitle: `Карточка сезона ${season}`,
        icon: "🃏",
        playerId,
        teamId: homeTeamId,
        scope: "player",
        exclusive: false,
        careerXp: 15,
      });
    }
  }
}

/** Полный прогон после матча: матчевые вехи + лидеры → карьера */
export async function syncAllChampionshipCareerAwards(
  db: SupabaseClient,
  params: {
    championshipId: number;
    season: string;
    homeTeamId: number | null;
    matchId: number;
    homeGoals: number;
    awayGoals: number;
    homeTeamMatchId: number;
    awayTeamMatchId: number;
    lines: MatchLine[];
  }
) {
  await syncChampionshipMatchCareerAwards(db, params);

  const { data: seasonRows } = await db
    .from("championship_player_season_stats")
    .select("player_id, goals, assists, mvp_count, rating_sum, rating_count")
    .eq("championship_id", params.championshipId);

  const rows = seasonRows ?? [];
  const topScorer = [...rows]
    .filter((r) => Number(r.goals) > 0)
    .sort((a, b) => Number(b.goals) - Number(a.goals))[0];
  const topAssister = [...rows]
    .filter((r) => Number(r.assists) > 0)
    .sort((a, b) => Number(b.assists) - Number(a.assists))[0];
  const bestPlayer = [...rows]
    .filter((r) => Number(r.rating_count) > 0)
    .sort((a, b) => {
      const ra = Number(a.rating_sum) / Math.max(1, Number(a.rating_count));
      const rb = Number(b.rating_sum) / Math.max(1, Number(b.rating_count));
      return rb - ra || Number(b.mvp_count) - Number(a.mvp_count);
    })[0];

  // Чемпион — только если сезон finished
  const { data: champ } = await db
    .from("championships")
    .select("status")
    .eq("id", params.championshipId)
    .maybeSingle();

  let championTeamId: number | null = null;
  if (champ?.status === "finished") {
    const { data: participants } = await db
      .from("championship_participants")
      .select("team_id")
      .eq("championship_id", params.championshipId);
    const { data: matches } = await db
      .from("championship_matches")
      .select("home_team_id, away_team_id, home_goals, away_goals, is_played")
      .eq("championship_id", params.championshipId)
      .eq("is_played", true);

    const points = new Map<number, number>();
    for (const p of participants ?? []) {
      points.set(Number(p.team_id), 0);
    }
    for (const m of matches ?? []) {
      if (m.home_goals == null || m.away_goals == null) continue;
      const hg = Number(m.home_goals);
      const ag = Number(m.away_goals);
      const home = Number(m.home_team_id);
      const away = Number(m.away_team_id);
      if (hg > ag) points.set(home, (points.get(home) ?? 0) + 3);
      else if (hg < ag) points.set(away, (points.get(away) ?? 0) + 3);
      else {
        points.set(home, (points.get(home) ?? 0) + 1);
        points.set(away, (points.get(away) ?? 0) + 1);
      }
    }
    let best = -1;
    for (const [teamId, pts] of points) {
      if (pts > best) {
        best = pts;
        championTeamId = teamId;
      }
    }
  }

  await syncChampionshipLeaderAwards(db, {
    championshipId: params.championshipId,
    season: params.season,
    homeTeamId: params.homeTeamId,
    topScorer: topScorer
      ? { playerId: Number(topScorer.player_id), goals: Number(topScorer.goals) }
      : null,
    topAssister: topAssister
      ? {
          playerId: Number(topAssister.player_id),
          assists: Number(topAssister.assists),
        }
      : null,
    bestPlayer: bestPlayer
      ? { playerId: Number(bestPlayer.player_id) }
      : null,
    championTeamId,
  });
}
