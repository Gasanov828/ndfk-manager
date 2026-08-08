import type { CareerMvpRecord } from "@/lib/careerMvp";
import {
  getCurrentMonthLabel,
  isInCurrentMonth,
  type MatchStatRow,
  type PlayerAward,
  type PlayerBase,
} from "@/lib/playerAwards";
import { getPositionGroup } from "@/lib/positionStyles";

export type StarAccent =
  | "violet"
  | "cyan"
  | "amber"
  | "lime"
  | "rose"
  | "sky"
  | "orange"
  | "emerald";

export type TeamStarCard = {
  id: string;
  title: string;
  icon: string;
  accent: StarAccent;
  award: PlayerAward;
  valueLabel: string;
  secondaryLabel?: string;
  href?: string;
};

export type TeamStarsBuildInput = {
  players: PlayerBase[];
  matchStats: MatchStatRow[];
  /** Δ рейтинга с последнего матча (playerId → delta) */
  ratingDeltas?: Record<number, number | null | undefined>;
  latestMvp?: Pick<
    CareerMvpRecord,
    "playerId" | "playerName" | "matchRating"
  > | null;
  /** Сколько карточек показать */
  limit?: number;
};

type CandidatePool = {
  id: string;
  title: string;
  icon: string;
  accent: StarAccent;
  valueLabel: string;
  secondaryLabel?: string;
  href?: string;
  /** Лучшие → худшие */
  candidates: PlayerAward[];
  /** Приоритет заполнения (меньше = раньше) */
  priority: number;
};

function award(
  player: PlayerBase,
  primaryValue: number,
  secondaryValue?: number
): PlayerAward {
  return { player, primaryValue, secondaryValue };
}

function pickUnique(
  candidates: PlayerAward[],
  used: Set<number>
): PlayerAward | null {
  const fresh = candidates.find((item) => !used.has(item.player.id));
  if (fresh) return fresh;
  return candidates[0] ?? null;
}

function rankByGoals(players: PlayerBase[]): PlayerAward[] {
  return [...players]
    .filter((player) => player.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .map((player) => award(player, player.goals, player.assists));
}

function rankByAssists(players: PlayerBase[]): PlayerAward[] {
  return [...players]
    .filter((player) => player.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
    .map((player) => award(player, player.assists, player.goals));
}

function rankByRating(players: PlayerBase[]): PlayerAward[] {
  return [...players]
    .filter(
      (player) =>
        typeof player.rating === "number" && Number.isFinite(player.rating)
    )
    .sort(
      (a, b) =>
        Number(b.rating) - Number(a.rating) ||
        b.goals - a.goals ||
        b.assists - a.assists
    )
    .map((player) =>
      award(
        player,
        Number(Number(player.rating).toFixed(1)),
        player.goals + player.assists
      )
    );
}

function rankByContribution(players: PlayerBase[]): PlayerAward[] {
  return [...players]
    .filter((player) => player.goals + player.assists > 0)
    .sort(
      (a, b) =>
        b.goals + b.assists - (a.goals + a.assists) ||
        b.goals - a.goals ||
        b.assists - a.assists
    )
    .map((player) =>
      award(player, player.goals + player.assists, player.goals)
    );
}

/** Полезность: гол×2 + пас; для вратарей — сейвы или рейтинг */
function rankByUsefulness(
  players: PlayerBase[],
  stats: MatchStatRow[] = []
): PlayerAward[] {
  const savesByPlayer = new Map<number, number>();
  for (const row of stats) {
    if (!row.match?.is_played) continue;
    const value = Number(row.saves) || 0;
    if (value <= 0) continue;
    savesByPlayer.set(
      row.player_id,
      (savesByPlayer.get(row.player_id) ?? 0) + value
    );
  }

  return [...players]
    .map((player) => {
      let score = player.goals * 2 + player.assists;
      if (score <= 0 && getPositionGroup(null, player.position) === "ВРТ") {
        const saves = savesByPlayer.get(player.id) ?? 0;
        score =
          saves > 0
            ? saves
            : typeof player.rating === "number" && Number.isFinite(player.rating)
              ? Math.round(Number(player.rating) / 10)
              : 0;
      }
      return { player, score };
    })
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.player.goals - a.player.goals ||
        b.player.assists - a.player.assists
    )
    .map((row) => award(row.player, row.score, row.player.goals + row.player.assists));
}

function rankPlayersOfMonth(
  players: PlayerBase[],
  stats: MatchStatRow[],
  now = new Date()
): PlayerAward[] {
  const totals = new Map<number, { goals: number; assists: number }>();

  for (const row of stats) {
    if (!row.match?.is_played || !row.match.date) continue;
    if (!isInCurrentMonth(row.match.date, now)) continue;

    const current = totals.get(row.player_id) ?? { goals: 0, assists: 0 };
    current.goals += row.goals;
    current.assists += row.assists;
    totals.set(row.player_id, current);
  }

  return [...totals.entries()]
    .map(([playerId, value]) => {
      const player = players.find((item) => item.id === playerId);
      if (!player) return null;
      const score = value.goals * 2 + value.assists;
      if (score <= 0) return null;
      return {
        score,
        award: award(player, value.goals, value.assists),
      };
    })
    .filter((row): row is { score: number; award: PlayerAward } => row != null)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.award);
}

function rankByPositionGroup(
  players: PlayerBase[],
  group: "ЗАЩ" | "ВРТ"
): PlayerAward[] {
  return rankByRating(
    players.filter(
      (player) => getPositionGroup(null, player.position) === group
    )
  );
}

function rankBySaves(
  players: PlayerBase[],
  stats: MatchStatRow[]
): PlayerAward[] {
  const saves = new Map<number, number>();
  for (const row of stats) {
    if (!row.match?.is_played) continue;
    const value = Number(row.saves) || 0;
    if (value <= 0) continue;
    saves.set(row.player_id, (saves.get(row.player_id) ?? 0) + value);
  }

  return [...saves.entries()]
    .map(([playerId, total]) => {
      const player = players.find((item) => item.id === playerId);
      if (!player || total <= 0) return null;
      return award(player, total, player.rating);
    })
    .filter((row): row is PlayerAward => row != null)
    .sort(
      (a, b) =>
        b.primaryValue - a.primaryValue ||
        Number(b.player.rating ?? 0) - Number(a.player.rating ?? 0)
    );
}

function rankByImprovement(
  players: PlayerBase[],
  ratingDeltas: Record<number, number | null | undefined>
): PlayerAward[] {
  return players
    .map((player) => {
      const delta = ratingDeltas[player.id];
      if (delta == null || !Number.isFinite(delta) || delta <= 0) return null;
      return award(player, Number(Number(delta).toFixed(1)), player.rating);
    })
    .filter((row): row is PlayerAward => row != null)
    .sort(
      (a, b) =>
        b.primaryValue - a.primaryValue ||
        Number(b.player.rating ?? 0) - Number(a.player.rating ?? 0)
    );
}

function rankByAppearances(
  players: PlayerBase[],
  stats: MatchStatRow[]
): PlayerAward[] {
  const counts = new Map<number, number>();
  for (const row of stats) {
    if (!row.match?.is_played) continue;
    if ((row.goals ?? 0) + (row.assists ?? 0) + (Number(row.saves) || 0) <= 0) {
      // считаем и «нулевые» участия, если строка статистики есть
    }
    counts.set(row.player_id, (counts.get(row.player_id) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([playerId, apps]) => {
      const player = players.find((item) => item.id === playerId);
      if (!player || apps < 2) return null;
      return award(player, apps, player.goals + player.assists);
    })
    .filter((row): row is PlayerAward => row != null)
    .sort(
      (a, b) =>
        b.primaryValue - a.primaryValue ||
        Number(b.secondaryValue ?? 0) - Number(a.secondaryValue ?? 0)
    );
}

/** Высокий OVR при низкой статистике — «новичок / скрытый потенциал» */
function rankNewcomers(players: PlayerBase[]): PlayerAward[] {
  return [...players]
    .filter(
      (player) =>
        player.goals + player.assists <= 1 &&
        typeof player.rating === "number" &&
        player.rating >= 50
    )
    .sort(
      (a, b) =>
        Number(b.rating) - Number(a.rating) ||
        a.goals + a.assists - (b.goals + b.assists)
    )
    .map((player) =>
      award(
        player,
        Number(Number(player.rating).toFixed(1)),
        player.goals + player.assists
      )
    );
}

/**
 * Собирает карточки «Звёзды команды» с максимумом разных игроков.
 * В каждой категории берём лучшего ещё не показанного; повтор — только если нет альтернативы.
 */
export function buildTeamStarCards(
  input: TeamStarsBuildInput
): TeamStarCard[] {
  const {
    players,
    matchStats,
    ratingDeltas = {},
    latestMvp = null,
    limit = 6,
  } = input;

  const monthLabel = getCurrentMonthLabel();
  const monthRank = rankPlayersOfMonth(players, matchStats);
  const saveRank = rankBySaves(players, matchStats);
  const gkByRating = rankByPositionGroup(players, "ВРТ");
  const gkRank = saveRank.length > 0 ? saveRank : gkByRating;

  const pools: CandidatePool[] = [
    {
      id: "scorer",
      title: "Бомбардир",
      icon: "⚽",
      accent: "violet",
      valueLabel: "голов",
      secondaryLabel: "пас",
      priority: 10,
      candidates: rankByGoals(players),
    },
    {
      id: "assister",
      title: "Ассистент",
      icon: "🎯",
      accent: "cyan",
      valueLabel: "пасов",
      secondaryLabel: "гол",
      priority: 20,
      candidates: rankByAssists(players),
    },
    {
      id: "month",
      title: "Игрок месяца",
      icon: "🏆",
      accent: "amber",
      valueLabel: "голов",
      secondaryLabel: "пас",
      priority: 30,
      candidates: monthRank,
    },
    {
      id: "rated",
      title: "Лучший OVR",
      icon: "★",
      accent: "lime",
      valueLabel: "★",
      secondaryLabel: "Г+П",
      priority: 40,
      candidates: rankByRating(players),
    },
    {
      id: "useful",
      title: "Самый полезный",
      icon: "💎",
      accent: "emerald",
      valueLabel: "очков",
      secondaryLabel: "Г+П",
      priority: 50,
      candidates: rankByUsefulness(players, matchStats),
    },
    {
      id: "defender",
      title: "Лучший защитник",
      icon: "🛡️",
      accent: "sky",
      valueLabel: "★",
      secondaryLabel: "Г+П",
      priority: 60,
      candidates: rankByPositionGroup(players, "ЗАЩ"),
    },
    {
      id: "goalkeeper",
      title: "Лучший вратарь",
      icon: "🧤",
      accent: "orange",
      valueLabel: saveRank.length > 0 ? "сейвов" : "★",
      secondaryLabel: saveRank.length > 0 ? "★" : "Г+П",
      priority: 70,
      candidates: gkRank,
    },
    {
      id: "improving",
      title: "Прогресс",
      icon: "📈",
      accent: "lime",
      valueLabel: "Δ★",
      secondaryLabel: "OVR",
      priority: 80,
      candidates: rankByImprovement(players, ratingDeltas),
    },
    {
      id: "streak",
      title: "Серия матчей",
      icon: "🔥",
      accent: "orange",
      valueLabel: "матчей",
      secondaryLabel: "Г+П",
      priority: 90,
      candidates: rankByAppearances(players, matchStats),
    },
    {
      id: "newcomer",
      title: "Новичок",
      icon: "✨",
      accent: "sky",
      valueLabel: "★",
      secondaryLabel: "Г+П",
      priority: 100,
      candidates: rankNewcomers(players),
    },
  ];

  // Если месяца нет — «Форма сезона» по Г+П
  if (monthRank.length === 0) {
    pools.push({
      id: "form",
      title: "Форма сезона",
      icon: "🏆",
      accent: "amber",
      valueLabel: "Г+П",
      secondaryLabel: "голов",
      priority: 35,
      candidates: rankByContribution(players),
    });
  }

  const used = new Set<number>();
  const cards: TeamStarCard[] = [];
  const goalkeeperPool = pools.find((pool) => pool.id === "goalkeeper");
  const reservedForMvp = latestMvp ? 1 : 0;
  const reservedForGoalkeeper =
    goalkeeperPool && goalkeeperPool.candidates.length > 0 ? 1 : 0;
  const poolLimit = limit - reservedForMvp - reservedForGoalkeeper;

  const sortedPools = [...pools]
    .filter(
      (pool) => pool.candidates.length > 0 && pool.id !== "goalkeeper"
    )
    .sort((a, b) => a.priority - b.priority);

  for (const pool of sortedPools) {
    if (cards.length >= poolLimit) break;

    let picked = pickUnique(pool.candidates, used);
    if (!picked) continue;

    // Не копим дубли «полезный / форма» на одного игрока
    if (pool.id === "useful" || pool.id === "form") {
      const clashes = cards.some(
        (card) =>
          (card.id === "useful" ||
            card.id === "form" ||
            card.id === "scorer") &&
          card.award.player.id === picked!.player.id
      );
      if (clashes) {
        const alternate = pool.candidates.find(
          (item) => !used.has(item.player.id)
        );
        if (!alternate) continue;
        picked = alternate;
      }
    }

    used.add(picked.player.id);
    cards.push({
      id: pool.id,
      title: pool.title,
      icon: pool.icon,
      accent: pool.accent,
      award: picked,
      valueLabel: pool.valueLabel,
      secondaryLabel: pool.secondaryLabel,
      href: pool.href,
    });
  }

  // Вратарь — отдельный зарезервированный слот
  if (
    goalkeeperPool &&
    goalkeeperPool.candidates.length > 0 &&
    cards.length < limit
  ) {
    const picked =
      pickUnique(goalkeeperPool.candidates, used) ??
      goalkeeperPool.candidates[0];
    if (picked) {
      used.add(picked.player.id);
      cards.push({
        id: goalkeeperPool.id,
        title: goalkeeperPool.title,
        icon: goalkeeperPool.icon,
        accent: goalkeeperPool.accent,
        award: picked,
        valueLabel: goalkeeperPool.valueLabel,
        secondaryLabel: goalkeeperPool.secondaryLabel,
        href: goalkeeperPool.href,
      });
    }
  }

  // MVP — всегда отдельная карточка (можно повторить игрока)
  if (latestMvp && cards.length < limit) {
    const mvpPlayer =
      players.find((player) => player.id === latestMvp.playerId) ??
      ({
        id: latestMvp.playerId,
        name: latestMvp.playerName,
        position: "",
        goals: 0,
        assists: 0,
      } satisfies PlayerBase);

    cards.push({
      id: "mvp",
      title: "Последний MVP",
      icon: "🏅",
      accent: "amber",
      award: award(
        mvpPlayer,
        Number(Number(latestMvp.matchRating).toFixed(1))
      ),
      valueLabel: "оценка",
      href: "/career",
    });
    used.add(latestMvp.playerId);
  }

  // Если карточек мало — добираем следующих уникальных по OVR
  if (cards.length < limit) {
    for (const candidate of rankByRating(players)) {
      if (cards.length >= limit) break;
      if (used.has(candidate.player.id)) continue;
      used.add(candidate.player.id);
      cards.push({
        id: `ovr-${candidate.player.id}`,
        title: "В составе",
        icon: "⭐",
        accent: "violet",
        award: candidate,
        valueLabel: "★",
        secondaryLabel: "Г+П",
      });
    }
  }

  return cards.slice(0, limit);
}

export { getCurrentMonthLabel };
