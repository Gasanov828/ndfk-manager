import type { ChampionshipMatch, ChampionshipRound } from "@/lib/championship/types";

export type MatchRoundGroup = {
  roundNumber: number;
  roundId: number | null;
  title: string;
  matches: ChampionshipMatch[];
  playedCount: number;
  totalCount: number;
  isComplete: boolean;
};

type RoundMeta = Pick<ChampionshipRound, "id" | "round_number"> & {
  title?: string | null;
};

function sortMatchesChronologically(
  matches: ChampionshipMatch[]
): ChampionshipMatch[] {
  return [...matches].sort((a, b) => {
    const byDate = a.match_date.localeCompare(b.match_date);
    if (byDate !== 0) return byDate;
    const byTime = (a.match_time || "00:00").localeCompare(b.match_time || "00:00");
    if (byTime !== 0) return byTime;
    return a.id - b.id;
  });
}

function buildRoundTitle(roundNumber: number, title: string | null | undefined): string {
  if (title?.trim()) return title.trim();
  return `Тур ${roundNumber}`;
}

function summarizeGroup(
  roundNumber: number,
  roundId: number | null,
  title: string,
  matches: ChampionshipMatch[]
): MatchRoundGroup {
  const playedCount = matches.filter((match) => match.is_played).length;
  return {
    roundNumber,
    roundId,
    title,
    matches: sortMatchesChronologically(matches),
    playedCount,
    totalCount: matches.length,
    isComplete: playedCount === matches.length && matches.length > 0,
  };
}

/** Группирует матчи по туру: round_id из БД или по дате матча. */
export function groupMatchesByRound(
  matches: ChampionshipMatch[],
  rounds: RoundMeta[] = []
): MatchRoundGroup[] {
  if (matches.length === 0) return [];

  const roundById = new Map(rounds.map((round) => [round.id, round]));
  const hasRoundIds = matches.some(
    (match) => match.round_id != null && roundById.has(Number(match.round_id))
  );

  if (hasRoundIds) {
    const bucket = new Map<number, ChampionshipMatch[]>();
    const unassigned: ChampionshipMatch[] = [];

    for (const match of matches) {
      const roundId = match.round_id != null ? Number(match.round_id) : null;
      if (roundId != null && roundById.has(roundId)) {
        const list = bucket.get(roundId) ?? [];
        list.push(match);
        bucket.set(roundId, list);
      } else {
        unassigned.push(match);
      }
    }

    const groups = [...bucket.entries()]
      .map(([roundId, roundMatches]) => {
        const meta = roundById.get(roundId)!;
        return summarizeGroup(
          meta.round_number,
          roundId,
          buildRoundTitle(meta.round_number, meta.title),
          roundMatches
        );
      })
      .sort((a, b) => a.roundNumber - b.roundNumber);

    if (unassigned.length > 0) {
      const nextNumber =
        groups.length > 0 ? Math.max(...groups.map((group) => group.roundNumber)) + 1 : 1;
      groups.push(
        summarizeGroup(nextNumber, null, buildRoundTitle(nextNumber, null), unassigned)
      );
    }

    return groups;
  }

  const dateOrder = [...new Set(matches.map((match) => match.match_date))].sort(
    (a, b) => a.localeCompare(b)
  );
  const roundNumberByDate = new Map(
    dateOrder.map((date, index) => [date, index + 1])
  );

  const bucket = new Map<number, ChampionshipMatch[]>();
  for (const match of matches) {
    const roundNumber = roundNumberByDate.get(match.match_date) ?? 1;
    const list = bucket.get(roundNumber) ?? [];
    list.push(match);
    bucket.set(roundNumber, list);
  }

  return [...bucket.entries()]
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, roundMatches]) =>
      summarizeGroup(roundNumber, null, buildRoundTitle(roundNumber, null), roundMatches)
    );
}

/** Применяет черновики счёта для превью таблицы. */
export function applyScoreDrafts(
  matches: ChampionshipMatch[],
  drafts: Record<number, { home: string; away: string }>
): ChampionshipMatch[] {
  return matches.map((match) => {
    const draft = drafts[match.id];
    if (!draft) return match;

    const homeRaw = draft.home.trim();
    const awayRaw = draft.away.trim();
    if (homeRaw === "" || awayRaw === "") return match;

    const home = Number(homeRaw);
    const away = Number(awayRaw);
    if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) {
      return match;
    }

    return {
      ...match,
      home_goals: Math.floor(home),
      away_goals: Math.floor(away),
      is_played: true,
    };
  });
}

export function findActiveRoundGroup(groups: MatchRoundGroup[]): MatchRoundGroup | null {
  const incomplete = groups.find((group) => !group.isComplete);
  if (incomplete) return incomplete;
  return groups[groups.length - 1] ?? null;
}

/** Все туры из БД + матчи (включая пустые туры без матчей) — для админки. */
export function buildAdminRoundGroups(
  matches: ChampionshipMatch[],
  rounds: RoundMeta[] = []
): MatchRoundGroup[] {
  if (rounds.length === 0) {
    return groupMatchesByRound(matches, rounds);
  }

  const roundById = new Map(rounds.map((round) => [round.id, round]));
  const bucket = new Map<number, ChampionshipMatch[]>();
  const unassigned: ChampionshipMatch[] = [];

  for (const match of matches) {
    const roundId = match.round_id != null ? Number(match.round_id) : null;
    if (roundId != null && roundById.has(roundId)) {
      const list = bucket.get(roundId) ?? [];
      list.push(match);
      bucket.set(roundId, list);
    } else {
      unassigned.push(match);
    }
  }

  const groups = [...rounds]
    .sort((a, b) => a.round_number - b.round_number)
    .map((round) =>
      summarizeGroup(
        round.round_number,
        round.id,
        buildRoundTitle(round.round_number, round.title),
        bucket.get(round.id) ?? []
      )
    );

  if (unassigned.length > 0) {
    const extra = groupMatchesByRound(unassigned, []);
    let nextNumber =
      groups.length > 0 ? Math.max(...groups.map((group) => group.roundNumber)) : 0;
    for (const item of extra) {
      nextNumber += 1;
      groups.push({
        ...item,
        roundNumber: nextNumber,
        roundId: null,
        title: buildRoundTitle(nextNumber, null),
      });
    }
  }

  return groups;
}
