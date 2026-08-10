import { openRatingVotingEndsAt } from "@/lib/matchRatings";

type DbClient = {
  from: (table: string) => any;
};

type TeamRef = { id: number; name: string };

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function syncClubMatchVotingFromChampionship(params: {
  db: DbClient;
  championshipMatchId: number;
  homeGoals: number;
  awayGoals: number;
}): Promise<{ synced: boolean; matchId: number | null; error: string | null }> {
  const { db, championshipMatchId, homeGoals, awayGoals } = params;

  const { data: homeClubTeam } = await db
    .from("championship_teams")
    .select("id, name")
    .eq("name", "Дженгутай")
    .maybeSingle();

  if (!homeClubTeam) {
    return { synced: false, matchId: null, error: null };
  }

  const { data: champMatch, error: matchError } = await db
    .from("championship_matches")
    .select(
      "id, home_team_id, away_team_id, match_date, match_time, location, home_team:championship_teams!championship_matches_home_team_id_fkey(id, name), away_team:championship_teams!championship_matches_away_team_id_fkey(id, name)"
    )
    .eq("id", championshipMatchId)
    .maybeSingle();

  if (matchError) {
    return { synced: false, matchId: null, error: matchError.message };
  }
  if (!champMatch) {
    return { synced: false, matchId: null, error: null };
  }

  const home = one(champMatch.home_team as TeamRef | TeamRef[] | null);
  const away = one(champMatch.away_team as TeamRef | TeamRef[] | null);
  const homeClubId = Number(homeClubTeam.id);
  const weAreHome = Number(champMatch.home_team_id) === homeClubId;
  const weAreAway = Number(champMatch.away_team_id) === homeClubId;

  if (!weAreHome && !weAreAway) {
    return { synced: false, matchId: null, error: null };
  }

  const opponent = (weAreHome ? away?.name : home?.name) ?? "Соперник";
  const date = String(champMatch.match_date);
  const time = String(champMatch.match_time || "18:00");
  const location = String(champMatch.location ?? "");
  const ndfkGoals = weAreHome ? homeGoals : awayGoals;
  const opponentGoals = weAreHome ? awayGoals : homeGoals;

  const { data: existing, error: existingError } = await db
    .from("matches")
    .select("id, is_played, rating_voting_ends_at, date, time")
    .eq("date", date)
    .eq("time", time)
    .eq("opponent", opponent)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { synced: false, matchId: null, error: existingError.message };
  }

  if (existing) {
    const votingEndsAt = openRatingVotingEndsAt({
      is_played: Boolean(existing.is_played),
      rating_voting_ends_at: existing.rating_voting_ends_at,
      date: existing.date,
      time: existing.time,
    });

    const { error } = await db
      .from("matches")
      .update({
        is_played: true,
        is_live: false,
        ndfk_goals: Math.floor(ndfkGoals),
        opponent_goals: Math.floor(opponentGoals),
        rating_voting_ends_at: votingEndsAt,
      })
      .eq("id", existing.id);

    return { synced: !error, matchId: Number(existing.id), error: error?.message ?? null };
  }

  const { data: created, error } = await db
    .from("matches")
    .insert({
      opponent,
      date,
      time,
      location,
      is_played: true,
      is_live: false,
      ndfk_goals: Math.floor(ndfkGoals),
      opponent_goals: Math.floor(opponentGoals),
      rating_voting_ends_at: openRatingVotingEndsAt(null),
    })
    .select("id")
    .single();

  return { synced: !error, matchId: created?.id ? Number(created.id) : null, error: error?.message ?? null };
}

/** Создаёт или обновляет будущий матч клуба по расписанию чемпионата (без счёта). */
export async function syncScheduledClubMatchFromChampionship(params: {
  db: DbClient;
  championshipMatchId: number;
}): Promise<{ synced: boolean; matchId: number | null; error: string | null }> {
  const { db, championshipMatchId } = params;

  const { data: homeClubTeam } = await db
    .from("championship_teams")
    .select("id, name")
    .eq("name", "Дженгутай")
    .maybeSingle();

  if (!homeClubTeam) {
    return { synced: false, matchId: null, error: null };
  }

  const { data: champMatch, error: matchError } = await db
    .from("championship_matches")
    .select(
      "id, home_team_id, away_team_id, match_date, match_time, location, is_played, home_team:championship_teams!championship_matches_home_team_id_fkey(id, name), away_team:championship_teams!championship_matches_away_team_id_fkey(id, name)"
    )
    .eq("id", championshipMatchId)
    .maybeSingle();

  if (matchError) {
    return { synced: false, matchId: null, error: matchError.message };
  }
  if (!champMatch || champMatch.is_played) {
    return { synced: false, matchId: null, error: null };
  }

  const home = one(champMatch.home_team as TeamRef | TeamRef[] | null);
  const away = one(champMatch.away_team as TeamRef | TeamRef[] | null);
  const homeClubId = Number(homeClubTeam.id);
  const weAreHome = Number(champMatch.home_team_id) === homeClubId;
  const weAreAway = Number(champMatch.away_team_id) === homeClubId;

  if (!weAreHome && !weAreAway) {
    return { synced: false, matchId: null, error: null };
  }

  const opponent = (weAreHome ? away?.name : home?.name) ?? "Соперник";
  const date = String(champMatch.match_date);
  const time = String(champMatch.match_time || "18:00");
  const location = String(champMatch.location ?? "");

  const { data: existing, error: existingError } = await db
    .from("matches")
    .select("id, is_played, is_live")
    .eq("date", date)
    .eq("time", time)
    .eq("opponent", opponent)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { synced: false, matchId: null, error: existingError.message };
  }

  if (existing) {
    if (existing.is_played || existing.is_live) {
      return { synced: false, matchId: Number(existing.id), error: null };
    }

    const { error } = await db
      .from("matches")
      .update({
        location,
        is_played: false,
        is_live: false,
      })
      .eq("id", existing.id);

    return {
      synced: !error,
      matchId: Number(existing.id),
      error: error?.message ?? null,
    };
  }

  const { data: created, error } = await db
    .from("matches")
    .insert({
      opponent,
      date,
      time,
      location,
      is_played: false,
      is_live: false,
      ndfk_goals: null,
      opponent_goals: null,
      rating_voting_ends_at: null,
    })
    .select("id")
    .single();

  return {
    synced: !error,
    matchId: created?.id ? Number(created.id) : null,
    error: error?.message ?? null,
  };
}
