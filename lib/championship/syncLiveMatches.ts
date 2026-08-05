type DbClient = {
  from: (table: string) => any;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Создаёт строки в club `matches` для будущих матчей «Дженгутай» в активном чемпионате. */
export async function syncChampionshipLiveMatches(
  db: DbClient
): Promise<{ created: number; error: string | null }> {
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
