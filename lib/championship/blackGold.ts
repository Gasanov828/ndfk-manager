import type { SupabaseClient } from "@supabase/supabase-js";
import { buildChampionshipStandings } from "@/lib/championship/standings";
import type {
  Championship,
  ChampionshipMatch,
  ChampionshipTeam,
} from "@/lib/championship/types";

export const BLACK_GOLD_CARD_CODE = "black_gold";
export const BLACK_GOLD_TITLE = "Чёрное Золото";
export const BLACK_GOLD_RARITY = "mythical";

export type BlackGoldChallengeId =
  | "play_all"
  | "avg_rating"
  | "wins_3"
  | "mvp_or_xi"
  | "no_red"
  | "top3";

export type BlackGoldChallenge = {
  id: BlackGoldChallengeId;
  icon: string;
  title: string;
  description: string;
  done: boolean;
  detail: string;
};

export type BlackGoldProgress = {
  playerId: number;
  playerName: string;
  photoUrl: string | null;
  unlocked: boolean;
  unlockedAt: string | null;
  completedCount: number;
  totalCount: number;
  challenges: BlackGoldChallenge[];
};

export const BLACK_GOLD_CHALLENGE_DEFS: Array<{
  id: BlackGoldChallengeId;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    id: "play_all",
    icon: "🎯",
    title: "Верность команде",
    description: "Сыграть все матчи чемпионата",
  },
  {
    id: "avg_rating",
    icon: "⭐",
    title: "Мастерство",
    description: "Средняя оценка не ниже 8.0",
  },
  {
    id: "wins_3",
    icon: "🤝",
    title: "Командный дух",
    description: "Принять участие минимум в 3 победах команды",
  },
  {
    id: "mvp_or_xi",
    icon: "👑",
    title: "Герой сезона",
    description: "MVP матча или символическая сборная тура",
  },
  {
    id: "no_red",
    icon: "🛡",
    title: "Железная дисциплина",
    description: "Ни одной красной карточки за сезон",
  },
  {
    id: "top3",
    icon: "🏆",
    title: "Чемпионский финиш",
    description: "Команда в ТОП-3 по итогам чемпионата",
  },
];

type MatchLine = {
  match_id: number;
  player_id: number;
  team_id: number;
  is_mvp: boolean;
  match_rating: number | null;
  red_cards?: number | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function evaluateBlackGoldChallenges(params: {
  championship: Championship;
  homeTeamId: number;
  matches: ChampionshipMatch[];
  teams: ChampionshipTeam[];
  playerId: number;
  lines: MatchLine[];
  tourXiPlayerIds: Set<number>;
}): BlackGoldChallenge[] {
  const {
    championship,
    homeTeamId,
    matches,
    teams,
    playerId,
    lines,
    tourXiPlayerIds,
  } = params;

  const clubMatches = matches.filter(
    (m) => m.home_team_id === homeTeamId || m.away_team_id === homeTeamId
  );
  const totalClub = clubMatches.length;
  const playerLines = lines.filter((l) => Number(l.player_id) === playerId);
  const playedMatchIds = new Set(playerLines.map((l) => Number(l.match_id)));
  const playedCount = playedMatchIds.size;

  const ratingLines = playerLines.filter(
    (l) => l.match_rating != null && Number(l.match_rating) > 0
  );
  const avgRating =
    ratingLines.length > 0
      ? Math.round(
          (ratingLines.reduce((s, l) => s + Number(l.match_rating), 0) /
            ratingLines.length) *
            10
        ) / 10
      : 0;

  let winParticipations = 0;
  let mvpCount = 0;
  let redCards = 0;
  for (const line of playerLines) {
    if (line.is_mvp) mvpCount += 1;
    redCards += Math.max(0, Number(line.red_cards) || 0);
    const match = matches.find((m) => m.id === Number(line.match_id));
    if (
      !match ||
      !match.is_played ||
      match.home_goals == null ||
      match.away_goals == null
    ) {
      continue;
    }
    const homeGoals = Number(match.home_goals);
    const awayGoals = Number(match.away_goals);
    const clubIsHome = match.home_team_id === homeTeamId;
    const clubWon = clubIsHome
      ? homeGoals > awayGoals
      : awayGoals > homeGoals;
    if (clubWon) winParticipations += 1;
  }

  const standings = buildChampionshipStandings(teams, matches, homeTeamId);
  const place = standings.findIndex((row) => row.teamId === homeTeamId) + 1;
  const seasonFinished = championship.status === "finished";
  const inTourXi = tourXiPlayerIds.has(playerId);

  const playAllDone = totalClub > 0 && playedCount >= totalClub;
  const avgDone = ratingLines.length > 0 && avgRating >= 8;
  const winsDone = winParticipations >= 3;
  const mvpOrXiDone = mvpCount > 0 || inTourXi;
  const noRedDone = redCards === 0 && playedCount > 0;
  const top3Done = seasonFinished && place > 0 && place <= 3;

  return BLACK_GOLD_CHALLENGE_DEFS.map((def) => {
    switch (def.id) {
      case "play_all":
        return {
          ...def,
          done: playAllDone,
          detail:
            totalClub === 0
              ? "Матчей пока нет"
              : `${playedCount} / ${totalClub} матчей`,
        };
      case "avg_rating":
        return {
          ...def,
          done: avgDone,
          detail:
            ratingLines.length === 0
              ? "Нет оценок"
              : `Средняя: ${avgRating.toFixed(1)}`,
        };
      case "wins_3":
        return {
          ...def,
          done: winsDone,
          detail: `Побед с участием: ${winParticipations} / 3`,
        };
      case "mvp_or_xi":
        return {
          ...def,
          done: mvpOrXiDone,
          detail:
            mvpCount > 0
              ? `MVP: ${mvpCount}`
              : inTourXi
                ? "В сборной тура"
                : "Пока нет",
        };
      case "no_red":
        return {
          ...def,
          done: noRedDone,
          detail:
            playedCount === 0
              ? "Нужен хотя бы 1 матч"
              : redCards === 0
                ? "Без красных"
                : `Красных: ${redCards}`,
        };
      case "top3":
        return {
          ...def,
          done: top3Done,
          detail: seasonFinished
            ? place > 0
              ? `Итог: ${place} место`
              : "Нет места"
            : place > 0
              ? `Сейчас: ${place} место · ждём финал`
              : "Таблица пуста",
        };
      default:
        return { ...def, done: false, detail: "" };
    }
  });
}

export async function getBlackGoldProgressForPlayers(
  db: SupabaseClient,
  params: {
    championship: Championship;
    homeTeamId: number;
    matches: ChampionshipMatch[];
    teams: ChampionshipTeam[];
    playerIds?: number[] | null;
  }
): Promise<{ rows: BlackGoldProgress[]; error: string | null }> {
  const { championship, homeTeamId, matches, teams } = params;

  const { data: seasonPlayers } = await db
    .from("championship_player_progress")
    .select("player_id")
    .eq("championship_id", championship.id);

  const progressPlayerIds = new Set(
    (seasonPlayers ?? []).map((row) => Number(row.player_id))
  );

  const { data: players, error: playersError } = await db
    .from("players")
    .select("id, name, photo_url")
    .order("name", { ascending: true });

  if (playersError) {
    return { rows: [], error: playersError.message };
  }

  const allPlayers = (players ?? []).filter((p) => {
    const id = Number(p.id);
    if (params.playerIds?.length) return params.playerIds.includes(id);
    if (progressPlayerIds.size > 0) return progressPlayerIds.has(id);
    return true;
  });

  const playedMatchIds = matches
    .filter((m) => m.is_played)
    .map((m) => m.id);

  let lines: MatchLine[] = [];
  if (playedMatchIds.length > 0) {
    const { data: lineRows, error: linesError } = await db
      .from("championship_match_player_stats")
      .select(
        "match_id, player_id, team_id, is_mvp, match_rating, red_cards"
      )
      .in("match_id", playedMatchIds);
    if (linesError) {
      // колонка red_cards может ещё не быть — fallback
      const { data: fallback, error: fallbackError } = await db
        .from("championship_match_player_stats")
        .select("match_id, player_id, team_id, is_mvp, match_rating")
        .in("match_id", playedMatchIds);
      if (fallbackError) {
        return { rows: [], error: fallbackError.message };
      }
      lines = (fallback ?? []).map((row) => ({
        ...row,
        red_cards: 0,
      })) as MatchLine[];
    } else {
      lines = (lineRows ?? []) as MatchLine[];
    }
  }

  const tourXiPlayerIds = new Set<number>();
  const { data: xiRows } = await db
    .from("championship_tour_xi")
    .select("player_id")
    .eq("championship_id", championship.id);
  for (const row of xiRows ?? []) {
    tourXiPlayerIds.add(Number(row.player_id));
  }

  const { data: unlockedCards } = await db
    .from("championship_season_cards")
    .select("player_id, earned_at")
    .eq("championship_id", championship.id)
    .eq("card_code", BLACK_GOLD_CARD_CODE);

  const unlockedMap = new Map<number, string>();
  for (const row of unlockedCards ?? []) {
    unlockedMap.set(Number(row.player_id), String(row.earned_at));
  }

  const rows: BlackGoldProgress[] = allPlayers.map((player) => {
    const playerId = Number(player.id);
    const challenges = evaluateBlackGoldChallenges({
      championship,
      homeTeamId,
      matches,
      teams,
      playerId,
      lines,
      tourXiPlayerIds,
    });
    const completedCount = challenges.filter((c) => c.done).length;
    const unlocked =
      unlockedMap.has(playerId) ||
      completedCount === challenges.length;

    return {
      playerId,
      playerName: player.name,
      photoUrl: player.photo_url ?? null,
      unlocked,
      unlockedAt: unlockedMap.get(playerId) ?? null,
      completedCount,
      totalCount: challenges.length,
      challenges,
    };
  });

  return { rows, error: null };
}

/**
 * После матча / при финале сезона: выдать «Чёрное Золото» всем, кто закрыл 6/6.
 */
export async function syncBlackGoldUnlocks(
  db: SupabaseClient,
  params: {
    championshipId: number;
    season: string;
    homeTeamId: number | null;
  }
): Promise<{ grantedPlayerIds: number[] }> {
  const grantedPlayerIds: number[] = [];
  if (params.homeTeamId == null) return { grantedPlayerIds };

  const { data: championship } = await db
    .from("championships")
    .select("*")
    .eq("id", params.championshipId)
    .maybeSingle();
  if (!championship) return { grantedPlayerIds };

  const [{ data: matches }, { data: teams }] = await Promise.all([
    db
      .from("championship_matches")
      .select(
        "*, home_team:championship_teams!championship_matches_home_team_id_fkey(*), away_team:championship_teams!championship_matches_away_team_id_fkey(*)"
      )
      .eq("championship_id", params.championshipId),
    db.from("championship_teams").select("*"),
  ]);

  const matchList = (matches ?? []).map((m) => ({
    ...m,
    home_team: one(m.home_team),
    away_team: one(m.away_team),
  })) as ChampionshipMatch[];

  const { rows } = await getBlackGoldProgressForPlayers(db, {
    championship: championship as Championship,
    homeTeamId: params.homeTeamId,
    matches: matchList,
    teams: (teams ?? []) as ChampionshipTeam[],
  });

  for (const row of rows) {
    if (row.completedCount < row.totalCount) continue;

    const { data: existing } = await db
      .from("championship_season_cards")
      .select("id")
      .eq("championship_id", params.championshipId)
      .eq("player_id", row.playerId)
      .eq("card_code", BLACK_GOLD_CARD_CODE)
      .maybeSingle();

    if (!existing) {
      const { error } = await db.from("championship_season_cards").insert({
        championship_id: params.championshipId,
        player_id: row.playerId,
        card_code: BLACK_GOLD_CARD_CODE,
        card_title: BLACK_GOLD_TITLE,
        rarity: BLACK_GOLD_RARITY,
        meta: {
          source: "season_challenges",
          challenges: row.challenges.map((c) => ({
            id: c.id,
            done: c.done,
          })),
        },
      });
      if (error) continue;
      grantedPlayerIds.push(row.playerId);
    }

    const { data: rewardExisting } = await db
      .from("championship_season_rewards")
      .select("id")
      .eq("championship_id", params.championshipId)
      .eq("player_id", row.playerId)
      .eq("reward_code", BLACK_GOLD_CARD_CODE)
      .maybeSingle();
    if (!rewardExisting) {
      await db.from("championship_season_rewards").insert({
        championship_id: params.championshipId,
        player_id: row.playerId,
        team_id: params.homeTeamId,
        reward_code: BLACK_GOLD_CARD_CODE,
        reward_title: `Мифический приз · ${BLACK_GOLD_TITLE}`,
        meta: { rarity: BLACK_GOLD_RARITY },
      });
    }

    try {
      const { grantChampionshipCareerAward } = await import(
        "@/lib/championship/careerAwards"
      );
      await grantChampionshipCareerAward(db, {
        championshipId: params.championshipId,
        season: params.season,
        awardCode: BLACK_GOLD_CARD_CODE,
        awardTitle: `💀 ${BLACK_GOLD_TITLE} · сезон ${params.season}`,
        icon: "💀",
        playerId: row.playerId,
        teamId: params.homeTeamId,
        scope: "player",
        exclusive: false,
        careerXp: 100,
      });
    } catch {
      // career awards table optional
    }
  }

  return { grantedPlayerIds };
}

/** Сборная тура: топ-11 по оценке в туре */
export async function rebuildTourXiForRound(
  db: SupabaseClient,
  championshipId: number,
  roundId: number
) {
  const { data: roundMatches } = await db
    .from("championship_matches")
    .select("id")
    .eq("round_id", roundId)
    .eq("is_played", true);
  const matchIds = (roundMatches ?? []).map((m) => Number(m.id));
  if (matchIds.length === 0) return;

  await db.from("championship_tour_xi").delete().eq("round_id", roundId);

  const { data: lines } = await db
    .from("championship_match_player_stats")
    .select("player_id, match_rating")
    .in("match_id", matchIds);

  const byPlayer = new Map<number, { sum: number; count: number }>();
  for (const line of lines ?? []) {
    const rating = Number(line.match_rating);
    if (!Number.isFinite(rating) || rating <= 0) continue;
    const playerId = Number(line.player_id);
    const cur = byPlayer.get(playerId) ?? { sum: 0, count: 0 };
    cur.sum += rating;
    cur.count += 1;
    byPlayer.set(playerId, cur);
  }

  const ranked = [...byPlayer.entries()]
    .map(([playerId, v]) => ({
      playerId,
      avg: v.sum / v.count,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 11);

  if (ranked.length === 0) return;

  await db.from("championship_tour_xi").insert(
    ranked.map((row, index) => ({
      championship_id: championshipId,
      round_id: roundId,
      match_id: null,
      player_id: row.playerId,
      slot: index + 1,
      match_rating: Math.round(row.avg * 10) / 10,
      source: "tour",
    }))
  );
}

/** Элита матча (если нет тура): топ-3 по оценке → засчитывается в испытание 4 */
export async function rebuildMatchEliteXi(
  db: SupabaseClient,
  championshipId: number,
  matchId: number
) {
  await db
    .from("championship_tour_xi")
    .delete()
    .eq("match_id", matchId)
    .eq("source", "match_elite");

  const { data: lines } = await db
    .from("championship_match_player_stats")
    .select("player_id, match_rating")
    .eq("match_id", matchId);

  const ranked = (lines ?? [])
    .map((line) => ({
      playerId: Number(line.player_id),
      rating: Number(line.match_rating),
    }))
    .filter((row) => Number.isFinite(row.rating) && row.rating > 0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  if (ranked.length === 0) return;

  await db.from("championship_tour_xi").insert(
    ranked.map((row, index) => ({
      championship_id: championshipId,
      round_id: null,
      match_id: matchId,
      player_id: row.playerId,
      slot: index + 1,
      match_rating: row.rating,
      source: "match_elite",
    }))
  );
}
