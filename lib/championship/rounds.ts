import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAdminRoundGroups } from "@/lib/championship/groupMatchesByRound";
import type { ChampionshipMatch } from "@/lib/championship/types";

type DbRound = {
  id: number;
  round_number: number;
  title?: string | null;
  status?: string | null;
};

/** Сколько туров уже «есть» по матчам (даже если записей в championship_rounds нет). */
export async function inferImpliedMaxRoundNumber(
  db: SupabaseClient,
  championshipId: number,
  existingRounds: DbRound[] = []
): Promise<number> {
  const { data: matches } = await db
    .from("championship_matches")
    .select(
      "id, championship_id, home_team_id, away_team_id, match_date, match_time, is_played, round_id"
    )
    .eq("championship_id", championshipId);

  if (!matches?.length) {
    return existingRounds.length > 0
      ? Math.max(...existingRounds.map((round) => Number(round.round_number)))
      : 0;
  }

  const groups = buildAdminRoundGroups(
    matches as ChampionshipMatch[],
    existingRounds.map((round) => ({
      id: round.id,
      round_number: round.round_number,
      title: round.title ?? null,
    }))
  );

  const fromGroups =
    groups.length > 0 ? Math.max(...groups.map((group) => group.roundNumber)) : 0;
  const fromDb =
    existingRounds.length > 0
      ? Math.max(...existingRounds.map((round) => Number(round.round_number)))
      : 0;

  return Math.max(fromGroups, fromDb);
}

/**
 * Создаёт недостающие записи championship_rounds по уже сыгранным турам из матчей
 * и привязывает матчи через round_id.
 */
export async function backfillMissingChampionshipRounds(
  db: SupabaseClient,
  championshipId: number,
  upToRoundNumber: number
): Promise<DbRound[]> {
  const { data: existingRounds, error: roundsError } = await db
    .from("championship_rounds")
    .select("id, round_number, title, status")
    .eq("championship_id", championshipId)
    .order("round_number", { ascending: true });

  if (roundsError) throw new Error(roundsError.message);

  const rounds = (existingRounds ?? []) as DbRound[];
  const byNumber = new Map(rounds.map((round) => [Number(round.round_number), round]));

  const { data: matches, error: matchesError } = await db
    .from("championship_matches")
    .select(
      "id, championship_id, home_team_id, away_team_id, match_date, match_time, is_played, round_id"
    )
    .eq("championship_id", championshipId);

  if (matchesError) throw new Error(matchesError.message);

  const groups = buildAdminRoundGroups(
    (matches ?? []) as ChampionshipMatch[],
    rounds.map((round) => ({
      id: round.id,
      round_number: round.round_number,
      title: round.title ?? null,
    }))
  );

  for (let roundNumber = 1; roundNumber < upToRoundNumber; roundNumber++) {
    if (byNumber.has(roundNumber)) continue;

    const group = groups.find((item) => item.roundNumber === roundNumber);
    const status =
      group?.isComplete === true
        ? "finished"
        : group && group.totalCount > 0
          ? "active"
          : "finished";

    const { data: created, error: insertError } = await db
      .from("championship_rounds")
      .insert({
        championship_id: championshipId,
        round_number: roundNumber,
        title: group?.title ?? `Тур ${roundNumber}`,
        status,
      })
      .select("id, round_number, title, status")
      .single();

    if (insertError) throw new Error(insertError.message);

    const round = created as DbRound;
    byNumber.set(roundNumber, round);
    rounds.push(round);

    const matchIds = (group?.matches ?? []).map((match) => match.id);
    if (matchIds.length > 0) {
      const { error: linkError } = await db
        .from("championship_matches")
        .update({ round_id: round.id })
        .in("id", matchIds);

      if (linkError) throw new Error(linkError.message);
    }
  }

  return [...rounds].sort((a, b) => a.round_number - b.round_number);
}
