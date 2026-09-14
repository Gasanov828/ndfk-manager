type DbClient = {
  from: (table: string) => any;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * Убирает задвоенные ещё не сыгранные матчи (одинаковые дата+время+соперник).
 * Задвоение может возникнуть из-за гонки: два одновременных запроса к
 * домашней странице оба не нашли существующую запись и оба её создали.
 * Трогает только is_played=false — на сыгранные матчи (и их голоса/статистику)
 * это не влияет.
 */
async function dedupeUpcomingMatches(db: DbClient): Promise<void> {
  const { data: rows, error } = await db
    .from("matches")
    .select("id, date, time, opponent")
    .eq("is_played", false);

  if (error || !rows) return;

  const seenFirstId = new Map<string, number>();
  const duplicateIds: number[] = [];

  for (const row of rows as Array<{ id: number; date: string; time: string; opponent: string }>) {
    const key = `${row.date}|${row.time}|${row.opponent}`;
    const firstId = seenFirstId.get(key);
    if (firstId == null) {
      seenFirstId.set(key, Number(row.id));
    } else {
      duplicateIds.push(Number(row.id));
    }
  }

  if (duplicateIds.length > 0) {
    await db.from("matches").delete().in("id", duplicateIds);
  }
}

/** Создаёт строки в club `matches` для будущих матчей «Дженгутай» в активном чемпионате. */
export async function syncChampionshipLiveMatches(
  db: DbClient
): Promise<{ created: number; error: string | null }> {
  await dedupeUpcomingMatches(db);

  const { data: championship, error: champError } = await db
    .from("championships")
    .select("id")
    .eq("status", "active")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (champError) {
    return { created: 0, error: champError.message };
  }
  if (!championship) {
    return { created: 0, error: null };
  }

  const { data: homeTeam, error: homeError } = await db
    .from("championship_teams")
    .select("id, name")
    .eq("name", "Дженгутай")
    .maybeSingle();

  if (homeError) {
    return { created: 0, error: homeError.message };
  }
  if (!homeTeam) {
    return { created: 0, error: null };
  }

  const { data: rows, error: matchesError } = await db
    .from("championship_matches")
    .select(
      "id, home_team_id, away_team_id, match_date, match_time, location, is_played, home_team:championship_teams!championship_matches_home_team_id_fkey(id, name), away_team:championship_teams!championship_matches_away_team_id_fkey(id, name)"
    )
    .eq("championship_id", championship.id)
    .eq("is_played", false)
    .or(`home_team_id.eq.${homeTeam.id},away_team_id.eq.${homeTeam.id}`);

  if (matchesError) {
    return { created: 0, error: matchesError.message };
  }

  let created = 0;

  for (const match of rows ?? []) {
    const home = one(
      match.home_team as { id: number; name: string } | { id: number; name: string }[] | null
    );
    const away = one(
      match.away_team as { id: number; name: string } | { id: number; name: string }[] | null
    );
    const weAreHome = Number(match.home_team_id) === Number(homeTeam.id);
    const opponent = (weAreHome ? away?.name : home?.name) ?? "Соперник";
    const date = String(match.match_date);
    const time = String(match.match_time || "18:00");
    const location = String(match.location ?? "");

    const { data: existing } = await db
      .from("matches")
      .select("id")
      .eq("date", date)
      .eq("time", time)
      .eq("opponent", opponent)
      .limit(1)
      .maybeSingle();

    if (existing) continue;

    const { error: insertError } = await db.from("matches").insert({
      opponent,
      date,
      time,
      location,
      is_played: false,
      is_live: false,
      ndfk_goals: 0,
      opponent_goals: 0,
    });

    if (insertError) {
      return { created, error: insertError.message };
    }

    created += 1;
  }

  return { created, error: null };
}
