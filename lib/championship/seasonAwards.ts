import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BLACK_GOLD_CARD_CODE,
  BLACK_GOLD_CHALLENGE_DEFS,
  BLACK_GOLD_TITLE,
  evaluateBlackGoldChallenges,
  syncBlackGoldUnlocks,
  type BlackGoldChallenge,
} from "@/lib/championship/blackGold";
import { getPositionGroup } from "@/lib/positionStyles";
import type {
  Championship,
  ChampionshipMatch,
  ChampionshipTeam,
} from "@/lib/championship/types";

export type SeasonAwardRarity =
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "mythical";

export type SeasonAwardDef = {
  code: string;
  rarity: SeasonAwardRarity;
  icon: string;
  title: string;
  /** Короткий текст на закрытой мини-карточке */
  hint: string;
  /** Условие открытия (в деталях) */
  description: string;
  /** Подсказка «как открыть» для закрытой карточки */
  howTo: string;
  /** XP в карьеру при открытии */
  careerXp: number;
};

export type SeasonAwardProgress = {
  current: number;
  target: number;
  label: string;
};

export type SeasonAwardCardState = {
  def: SeasonAwardDef;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: SeasonAwardProgress;
  /** Только для мифической */
  challenges?: BlackGoldChallenge[];
};

export type SeasonPrizesCollection = {
  playerId: number;
  playerName: string;
  photoUrl: string | null;
  cards: SeasonAwardCardState[];
  counts: Record<SeasonAwardRarity, { unlocked: number; total: number }>;
  unlockedTotal: number;
  total: number;
};

export const RARITY_META: Record<
  SeasonAwardRarity,
  { label: string; icon: string; order: number }
> = {
  common: { label: "Обычные", icon: "🟢", order: 1 },
  rare: { label: "Редкие", icon: "🔵", order: 2 },
  epic: { label: "Эпические", icon: "🟣", order: 3 },
  legendary: { label: "Легендарные", icon: "🟡", order: 4 },
  mythical: { label: "Мифическая", icon: "⚫✨", order: 5 },
};

export const SEASON_AWARD_DEFS: SeasonAwardDef[] = [
  // 🟢 8 ordinary
  {
    code: "debut",
    rarity: "common",
    icon: "👟",
    title: "Дебют сезона",
    hint: "Сыграй 1 матч",
    description: "Сыграть первый матч чемпионата",
    howTo: "Выйди на поле хотя бы в одном матче сезона — и карточка откроется.",
    careerXp: 5,
  },
  {
    code: "first_strike",
    rarity: "common",
    icon: "⚽",
    title: "Первый удар",
    hint: "Забей 1 гол",
    description: "Забить первый гол в сезоне",
    howTo: "Забей любой гол в матче чемпионата. Первый гол сезона открывает награду.",
    careerXp: 8,
  },
  {
    code: "first_pass",
    rarity: "common",
    icon: "🎯",
    title: "Первый пас",
    hint: "Отдай 1 пас",
    description: "Отдать первый голевой пас",
    howTo: "Отдай голевую передачу в любом матче сезона.",
    careerXp: 8,
  },
  {
    code: "three_caps",
    rarity: "common",
    icon: "📋",
    title: "В обойме",
    hint: "3 матча",
    description: "Сыграть 3 матча чемпионата",
    howTo: "Прими участие в трёх матчах сезона — не обязательно подряд.",
    careerXp: 10,
  },
  {
    code: "solid_game",
    rarity: "common",
    icon: "📈",
    title: "Стабильный матч",
    hint: "Оценка 6.5+",
    description: "Получить оценку 6.5+ в матче",
    howTo: "В одном матче получи оценку не ниже 6.5 — стабильная игра засчитывается.",
    careerXp: 8,
  },
  {
    code: "first_win",
    rarity: "common",
    icon: "✊",
    title: "Вкус победы",
    hint: "1 победа",
    description: "Принять участие в победе команды",
    howTo: "Сыграй в матче, который команда выиграет. Ничья не считается.",
    careerXp: 10,
  },
  {
    code: "fair_play",
    rarity: "common",
    icon: "🕊️",
    title: "Честная игра",
    hint: "Без красных",
    description: "Сыграть матч без красных карточек",
    howTo: "Сыграй хотя бы один матч и не получи красную карточку в сезоне.",
    careerXp: 5,
  },
  {
    code: "warm_up",
    rarity: "common",
    icon: "🔥",
    title: "Разгон",
    hint: "2 уровень",
    description: "Достичь 2 уровня сезонного прогресса",
    howTo: "Набирай XP за оценки в матчах, пока не откроется 2 уровень прогресса.",
    careerXp: 10,
  },
  // 🔵 6 rare
  {
    code: "goals_3",
    rarity: "rare",
    icon: "⚽",
    title: "Снайпер тура",
    hint: "3 гола за сезон",
    description: "Забить 3 гола за сезон",
    howTo: "Набери суммарно 3 гола в чемпионате. Голы копятся от матча к матчу.",
    careerXp: 15,
  },
  {
    code: "assists_3",
    rarity: "rare",
    icon: "🎯",
    title: "Конструктор атак",
    hint: "3 паса за сезон",
    description: "Отдать 3 голевых паса",
    howTo: "Отдай суммарно 3 голевые передачи за сезон.",
    careerXp: 15,
  },
  {
    code: "avg_7",
    rarity: "rare",
    icon: "⭐",
    title: "Стабильность",
    hint: "Средняя 7.0+",
    description: "Средняя оценка ≥ 7.0 (минимум 2 матча)",
    howTo: "Сыграй минимум 2 матча с оценкой и держи среднюю не ниже 7.0.",
    careerXp: 18,
  },
  {
    code: "mvp_1",
    rarity: "rare",
    icon: "👑",
    title: "Герой матча",
    hint: "Стань MVP",
    description: "Стать MVP хотя бы один раз",
    howTo: "Будь лучшим игроком матча хотя бы раз — получи отметку MVP.",
    careerXp: 20,
  },
  {
    code: "one_conceded",
    rarity: "rare",
    icon: "🧤",
    title: "Почти на нуле",
    hint: "1 пропущенный",
    description: "Сыграть матч вратарём и пропустить ровно 1 гол",
    howTo:
      "Только для вратаря: выйди в матче, где команда пропустила ровно один мяч.",
    careerXp: 20,
  },
  {
    code: "half_season",
    rarity: "rare",
    icon: "📅",
    title: "Полсезона",
    hint: "≥50% матчей",
    description: "Сыграть не меньше половины матчей клуба",
    howTo: "Участвуй регулярно: нужно сыграть минимум половину матчей клуба в сезоне.",
    careerXp: 18,
  },
  // 🟣 4 epic
  {
    code: "goals_5",
    rarity: "epic",
    icon: "💥",
    title: "Огонь в штрафной",
    hint: "5 голов",
    description: "Забить 5 голов за сезон",
    howTo: "Стань заметным бомбардиром сезона: суммарно 5 голов в чемпионате.",
    careerXp: 30,
  },
  {
    code: "assists_5",
    rarity: "epic",
    icon: "🧠",
    title: "Мозг атаки",
    hint: "5 пасов",
    description: "Отдать 5 голевых пасов",
    howTo: "Набери 5 ассистов за сезон — создавай моменты матч за матчем.",
    careerXp: 30,
  },
  {
    code: "avg_75",
    rarity: "epic",
    icon: "💎",
    title: "Элита оценок",
    hint: "Средняя 7.5+",
    description: "Средняя оценка ≥ 7.5 (минимум 3 матча)",
    howTo: "Сыграй минимум 3 матча с оценкой и удержи среднюю 7.5 или выше.",
    careerXp: 35,
  },
  {
    code: "clean_sheet",
    rarity: "epic",
    icon: "🧱",
    title: "Сухой матч",
    hint: "0 пропущенных",
    description: "Сыграть сухой матч на позиции вратаря",
    howTo:
      "Только для вратаря: не пропусти ни одного гола в матче. За сухой матч — бонус XP в прогрессе.",
    careerXp: 40,
  },
  // 🟡 2 legendary
  {
    code: "hat_trick",
    rarity: "legendary",
    icon: "🎩",
    title: "Хет-трик",
    hint: "3 гола в матче",
    description: "Забить 3 гола в одном матче",
    howTo: "В одном матче чемпионата забей три гола. Это редкий и мощный момент сезона.",
    careerXp: 50,
  },
  {
    code: "mvp_3",
    rarity: "legendary",
    icon: "🏅",
    title: "Король MVP",
    hint: "3× MVP",
    description: "Стать MVP матча 3 раза за сезон",
    howTo: "Трижды стань лучшим игроком матча в сезоне. Нужна стабильная звезда формы.",
    careerXp: 55,
  },
  // ⚫✨ 1 mythical
  {
    code: BLACK_GOLD_CARD_CODE,
    rarity: "mythical",
    icon: "💀",
    title: BLACK_GOLD_TITLE,
    hint: "Все 6 испытаний",
    description:
      "Вершина сезона. Выполнить все обязательные испытания чемпионата.",
    howTo:
      "Закрой все шесть испытаний: сыграй все матчи, держи среднюю 8.0+, выиграй 3 матча с командой, стань MVP или попади в сборную тура, без красных, и финишируй с клубом в ТОП-3.",
    careerXp: 100,
  },
];

type MatchLine = {
  match_id: number;
  player_id: number;
  team_id: number;
  goals: number;
  assists: number;
  is_mvp: boolean;
  match_rating: number | null;
  red_cards?: number | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function progress(
  current: number,
  target: number,
  label: string
): SeasonAwardProgress {
  return {
    current: Math.min(current, target),
    target,
    label,
  };
}

function playerSeasonFacts(params: {
  playerId: number;
  homeTeamId: number;
  matches: ChampionshipMatch[];
  lines: MatchLine[];
  tourXiPlayerIds: Set<number>;
  seasonLevel: number;
  isGk: boolean;
}) {
  const {
    playerId,
    homeTeamId,
    matches,
    lines,
    tourXiPlayerIds,
    seasonLevel,
    isGk,
  } = params;
  const playerLines = lines.filter((l) => Number(l.player_id) === playerId);
  const played = new Set(playerLines.map((l) => Number(l.match_id))).size;
  let goals = 0;
  let assists = 0;
  let mvp = 0;
  let reds = 0;
  let wins = 0;
  let maxGoalsInMatch = 0;
  let bestRating = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  let cleanSheets = 0;
  let oneConceded = 0;

  for (const line of playerLines) {
    const g = Number(line.goals) || 0;
    const a = Number(line.assists) || 0;
    goals += g;
    assists += a;
    maxGoalsInMatch = Math.max(maxGoalsInMatch, g);
    if (line.is_mvp) mvp += 1;
    reds += Math.max(0, Number(line.red_cards) || 0);
    if (line.match_rating != null && Number(line.match_rating) > 0) {
      const r = Number(line.match_rating);
      bestRating = Math.max(bestRating, r);
      ratingSum += r;
      ratingCount += 1;
    }
    const match = matches.find((m) => m.id === Number(line.match_id));
    if (
      !match ||
      !match.is_played ||
      match.home_goals == null ||
      match.away_goals == null
    ) {
      continue;
    }
    const lineTeamId = Number(line.team_id);
    const clubIsHome = match.home_team_id === homeTeamId;
    const clubWon = clubIsHome
      ? Number(match.home_goals) > Number(match.away_goals)
      : Number(match.away_goals) > Number(match.home_goals);
    if (clubWon) wins += 1;

    if (isGk) {
      const conceded =
        match.home_team_id === lineTeamId
          ? Number(match.away_goals)
          : Number(match.home_goals);
      if (conceded === 0) cleanSheets += 1;
      if (conceded === 1) oneConceded += 1;
    }
  }

  const clubMatches = matches.filter(
    (m) => m.home_team_id === homeTeamId || m.away_team_id === homeTeamId
  ).length;
  const avg =
    ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

  return {
    played,
    goals,
    assists,
    mvp,
    reds,
    wins,
    maxGoalsInMatch,
    bestRating,
    avg,
    ratingCount,
    clubMatches,
    inTourXi: tourXiPlayerIds.has(playerId),
    seasonLevel,
    isGk,
    cleanSheets,
    oneConceded,
  };
}

export function evaluateSeasonAwardProgress(
  code: string,
  facts: ReturnType<typeof playerSeasonFacts>,
  mythical?: { challenges: BlackGoldChallenge[]; unlocked: boolean }
): SeasonAwardProgress {
  switch (code) {
    case "debut":
      return progress(facts.played, 1, `${facts.played}/1 матч`);
    case "first_strike":
      return progress(facts.goals, 1, `${facts.goals}/1 гол`);
    case "first_pass":
      return progress(facts.assists, 1, `${facts.assists}/1 пас`);
    case "three_caps":
      return progress(facts.played, 3, `${facts.played}/3 матча`);
    case "solid_game":
      return progress(
        facts.bestRating >= 6.5 ? 1 : 0,
        1,
        facts.bestRating > 0
          ? `Лучшая: ${facts.bestRating.toFixed(1)}`
          : "Нет оценок"
      );
    case "first_win":
      return progress(facts.wins, 1, `${facts.wins}/1 победа`);
    case "fair_play":
      return progress(
        facts.played > 0 && facts.reds === 0 ? 1 : 0,
        1,
        facts.played === 0
          ? "Нужен матч"
          : facts.reds === 0
            ? "Без красных"
            : `КК: ${facts.reds}`
      );
    case "warm_up":
      return progress(
        Math.max(0, facts.seasonLevel - 1),
        1,
        `Уровень ${facts.seasonLevel}`
      );
    case "goals_3":
      return progress(facts.goals, 3, `${facts.goals}/3 гола`);
    case "assists_3":
      return progress(facts.assists, 3, `${facts.assists}/3 паса`);
    case "avg_7":
      return progress(
        facts.ratingCount >= 2 && facts.avg >= 7 ? 1 : 0,
        1,
        facts.ratingCount < 2
          ? `${facts.ratingCount}/2 матча с оценкой`
          : `Средняя ${facts.avg.toFixed(1)}`
      );
    case "mvp_1":
      return progress(facts.mvp, 1, `${facts.mvp}/1 MVP`);
    case "one_conceded":
      if (!facts.isGk) {
        return progress(0, 1, "Только для вратаря");
      }
      return progress(
        facts.oneConceded,
        1,
        facts.oneConceded > 0
          ? `Матчей с 1 пр.: ${facts.oneConceded}`
          : "Нужен матч с 1 пропущенным"
      );
    case "wins_2":
      return progress(facts.wins, 2, `${facts.wins}/2 победы`);
    case "half_season": {
      const need = Math.max(1, Math.ceil(facts.clubMatches / 2));
      return progress(facts.played, need, `${facts.played}/${need} матчей`);
    }
    case "goals_5":
      return progress(facts.goals, 5, `${facts.goals}/5 голов`);
    case "assists_5":
      return progress(facts.assists, 5, `${facts.assists}/5 пасов`);
    case "avg_75":
      return progress(
        facts.ratingCount >= 3 && facts.avg >= 7.5 ? 1 : 0,
        1,
        facts.ratingCount < 3
          ? `${facts.ratingCount}/3 матча с оценкой`
          : `Средняя ${facts.avg.toFixed(1)}`
      );
    case "clean_sheet":
      if (!facts.isGk) {
        return progress(0, 1, "Только для вратаря");
      }
      return progress(
        facts.cleanSheets,
        1,
        facts.cleanSheets > 0
          ? `Сухих: ${facts.cleanSheets}`
          : "Нужен сухой матч"
      );
    case "tour_star":
      return progress(facts.inTourXi ? 1 : 0, 1, facts.inTourXi ? "В сборной" : "Пока нет");
    case "hat_trick":
      return progress(
        facts.maxGoalsInMatch >= 3 ? 1 : 0,
        1,
        `Макс. в матче: ${facts.maxGoalsInMatch}`
      );
    case "mvp_3":
      return progress(facts.mvp, 3, `${facts.mvp}/3 MVP`);
    case BLACK_GOLD_CARD_CODE: {
      const done = mythical?.challenges.filter((c) => c.done).length ?? 0;
      const total = mythical?.challenges.length ?? BLACK_GOLD_CHALLENGE_DEFS.length;
      return progress(done, total, `${done} из ${total} испытаний`);
    }
    default:
      return progress(0, 1, "—");
  }
}

function isAwardComplete(
  code: string,
  prog: SeasonAwardProgress,
  mythicalUnlocked?: boolean
): boolean {
  if (code === BLACK_GOLD_CARD_CODE) {
    return Boolean(mythicalUnlocked) || prog.current >= prog.target;
  }
  return prog.current >= prog.target && prog.target > 0;
}

export async function getSeasonPrizesCollection(
  db: SupabaseClient,
  params: {
    championship: Championship;
    homeTeamId: number;
    matches: ChampionshipMatch[];
    teams: ChampionshipTeam[];
    playerId: number;
  }
): Promise<{ data: SeasonPrizesCollection | null; error: string | null }> {
  const { championship, homeTeamId, matches, teams, playerId } = params;

  const { data: player } = await db
    .from("players")
    .select("id, name, photo_url, position")
    .eq("id", playerId)
    .maybeSingle();
  if (!player) return { data: null, error: "Игрок не найден" };

  const isGk = getPositionGroup(null, player.position ?? "") === "ВРТ";

  const playedMatchIds = matches.filter((m) => m.is_played).map((m) => m.id);
  let lines: MatchLine[] = [];
  if (playedMatchIds.length > 0) {
    const { data: lineRows, error } = await db
      .from("championship_match_player_stats")
      .select(
        "match_id, player_id, team_id, goals, assists, is_mvp, match_rating, red_cards"
      )
      .in("match_id", playedMatchIds);
    if (error) {
      const { data: fallback } = await db
        .from("championship_match_player_stats")
        .select(
          "match_id, player_id, team_id, goals, assists, is_mvp, match_rating"
        )
        .in("match_id", playedMatchIds);
      lines = (fallback ?? []).map((row) => ({
        ...row,
        goals: Number(row.goals) || 0,
        assists: Number(row.assists) || 0,
        red_cards: 0,
      })) as MatchLine[];
    } else {
      lines = (lineRows ?? []).map((row) => ({
        ...row,
        goals: Number(row.goals) || 0,
        assists: Number(row.assists) || 0,
      })) as MatchLine[];
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

  const { data: progressRow } = await db
    .from("championship_player_progress")
    .select("season_level")
    .eq("championship_id", championship.id)
    .eq("player_id", playerId)
    .maybeSingle();

  const { data: unlockedCards } = await db
    .from("championship_season_cards")
    .select("card_code, earned_at")
    .eq("championship_id", championship.id)
    .eq("player_id", playerId);

  const unlockedMap = new Map<string, string>();
  for (const row of unlockedCards ?? []) {
    unlockedMap.set(String(row.card_code), String(row.earned_at));
  }

  const facts = playerSeasonFacts({
    playerId,
    homeTeamId,
    matches,
    lines,
    tourXiPlayerIds,
    seasonLevel: Number(progressRow?.season_level ?? 1),
    isGk,
  });

  const mythicalChallenges = evaluateBlackGoldChallenges({
    championship,
    homeTeamId,
    matches,
    teams,
    playerId,
    lines,
    tourXiPlayerIds,
  });
  const mythicalDone =
    mythicalChallenges.every((c) => c.done) ||
    unlockedMap.has(BLACK_GOLD_CARD_CODE);

  const cards: SeasonAwardCardState[] = SEASON_AWARD_DEFS.map((def) => {
    const prog = evaluateSeasonAwardProgress(def.code, facts, {
      challenges: mythicalChallenges,
      unlocked: mythicalDone,
    });
    const complete = isAwardComplete(def.code, prog, mythicalDone);
    const unlocked = unlockedMap.has(def.code) || complete;
    return {
      def,
      unlocked,
      unlockedAt: unlockedMap.get(def.code) ?? null,
      progress: prog,
      challenges:
        def.code === BLACK_GOLD_CARD_CODE ? mythicalChallenges : undefined,
    };
  });

  const counts = {
    common: { unlocked: 0, total: 0 },
    rare: { unlocked: 0, total: 0 },
    epic: { unlocked: 0, total: 0 },
    legendary: { unlocked: 0, total: 0 },
    mythical: { unlocked: 0, total: 0 },
  } as SeasonPrizesCollection["counts"];

  for (const card of cards) {
    counts[card.def.rarity].total += 1;
    if (card.unlocked) counts[card.def.rarity].unlocked += 1;
  }

  return {
    data: {
      playerId,
      playerName: player.name,
      photoUrl: player.photo_url ?? null,
      cards,
      counts,
      unlockedTotal: cards.filter((c) => c.unlocked).length,
      total: cards.length,
    },
    error: null,
  };
}

/**
 * Выдаёт все выполненные призы сезона игрокам клуба + карьеру.
 */
export async function syncSeasonPrizeUnlocks(
  db: SupabaseClient,
  params: {
    championshipId: number;
    season: string;
    homeTeamId: number | null;
  }
): Promise<{ granted: number }> {
  if (params.homeTeamId == null) return { granted: 0 };

  // Мифическая — отдельный путь (карточка + карьера)
  await syncBlackGoldUnlocks(db, params);

  const { data: championship } = await db
    .from("championships")
    .select("*")
    .eq("id", params.championshipId)
    .maybeSingle();
  if (!championship) return { granted: 0 };

  const [{ data: matches }, { data: teams }, { data: progressRows }] =
    await Promise.all([
      db
        .from("championship_matches")
        .select(
          "*, home_team:championship_teams!championship_matches_home_team_id_fkey(*), away_team:championship_teams!championship_matches_away_team_id_fkey(*)"
        )
        .eq("championship_id", params.championshipId),
      db.from("championship_teams").select("*"),
      db
        .from("championship_player_progress")
        .select("player_id, season_level")
        .eq("championship_id", params.championshipId),
    ]);

  const matchList = (matches ?? []).map((m) => ({
    ...m,
    home_team: one(m.home_team),
    away_team: one(m.away_team),
  })) as ChampionshipMatch[];

  const playerIds = (progressRows ?? []).map((r) => Number(r.player_id));
  if (playerIds.length === 0) {
    // fallback: all players with any match line
    const playedIds = matchList.filter((m) => m.is_played).map((m) => m.id);
    if (playedIds.length > 0) {
      const { data: lines } = await db
        .from("championship_match_player_stats")
        .select("player_id")
        .in("match_id", playedIds);
      for (const row of lines ?? []) {
        playerIds.push(Number(row.player_id));
      }
    }
  }

  const uniquePlayers = [...new Set(playerIds)];
  let granted = 0;

  for (const playerId of uniquePlayers) {
    const { data: collection } = await getSeasonPrizesCollection(db, {
      championship: championship as Championship,
      homeTeamId: params.homeTeamId,
      matches: matchList,
      teams: (teams ?? []) as ChampionshipTeam[],
      playerId,
    });
    if (!collection) continue;

    for (const card of collection.cards) {
      if (!card.unlocked) continue;
      if (card.def.code === BLACK_GOLD_CARD_CODE) continue; // already synced

      const { data: existing } = await db
        .from("championship_season_cards")
        .select("id")
        .eq("championship_id", params.championshipId)
        .eq("player_id", playerId)
        .eq("card_code", card.def.code)
        .maybeSingle();

      if (!existing) {
        const { error } = await db.from("championship_season_cards").insert({
          championship_id: params.championshipId,
          player_id: playerId,
          card_code: card.def.code,
          card_title: card.def.title,
          rarity: card.def.rarity,
          meta: {
            source: "season_prize",
            description: card.def.description,
          },
        });
        if (!error) granted += 1;
      }

      const { data: rewardExisting } = await db
        .from("championship_season_rewards")
        .select("id")
        .eq("championship_id", params.championshipId)
        .eq("player_id", playerId)
        .eq("reward_code", card.def.code)
        .maybeSingle();
      if (!rewardExisting) {
        await db.from("championship_season_rewards").insert({
          championship_id: params.championshipId,
          player_id: playerId,
          team_id: params.homeTeamId,
          reward_code: card.def.code,
          reward_title: card.def.title,
          meta: { rarity: card.def.rarity },
        });
      }

      try {
        const { grantChampionshipCareerAward } = await import(
          "@/lib/championship/careerAwards"
        );
        await grantChampionshipCareerAward(db, {
          championshipId: params.championshipId,
          season: params.season,
          awardCode: card.def.code,
          awardTitle: `${card.def.icon} ${card.def.title} · ${params.season}`,
          icon: card.def.icon,
          playerId,
          teamId: params.homeTeamId,
          scope: "player",
          exclusive: false,
          careerXp: card.def.careerXp,
        });
      } catch {
        // optional
      }
    }
  }

  return { granted };
}
