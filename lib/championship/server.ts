import {
  deriveLevelFromTotalXp,
  progressBarPercent,
} from "@/lib/championship/progressFormula";
import {
  buildChampionshipBundle,
  type ChampionshipBundle,
} from "@/lib/championship/build";
import type {
  Championship,
  ChampionshipMatch,
  ChampionshipSeasonCard,
  ChampionshipSeasonPlayerStat,
  ChampionshipSeasonReward,
  ChampionshipTeam,
} from "@/lib/championship/types";
import { createPublicSupabaseClient } from "@/lib/supabase/publicClient";
import { cache } from "react";

const SCHEMA_HINT =
  "Выполните SQL: supabase/championship.sql в Supabase → SQL Editor";

function isMissingRelation(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("championship") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export type ChampionshipMatchDetail = ChampionshipMatch & {
  playerStats: Array<{
    id: number;
    player_id: number;
    team_id: number;
    goals: number;
    assists: number;
    is_mvp: boolean;
    match_rating: number | null;
    player?: {
      id: number;
      name: string;
      position: string;
      photo_url?: string | null;
    } | null;
  }>;
};

export const getActiveChampionshipBundle = cache(async (): Promise<{
  data: ChampionshipBundle | null;
  error: string | null;
  schemaMissing: boolean;
}> => {
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: "Supabase не настроен",
      schemaMissing: false,
    };
  }

  const { data: championship, error: champError } = await supabase
    .from("championships")
    .select("*")
    .eq("status", "active")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (champError) {
    return {
      data: null,
      error: isMissingRelation(champError.message)
        ? SCHEMA_HINT
        : champError.message,
      schemaMissing: isMissingRelation(champError.message),
    };
  }

  if (!championship) {
    return {
      data: null,
      error:
        "Нет активного чемпионата. Создайте сезон в админке или выполните SQL.",
      schemaMissing: false,
    };
  }

  const champ = championship as Championship;

  const [
    { data: participantRows, error: partError },
    { data: matches, error: matchError },
    { data: seasonStats, error: statsError },
    { data: homeTeam },
  ] = await Promise.all([
    supabase
      .from("championship_participants")
      .select("team_id, team:championship_teams(*)")
      .eq("championship_id", champ.id),
    supabase
      .from("championship_matches")
      .select(
        "*, home_team:championship_teams!championship_matches_home_team_id_fkey(*), away_team:championship_teams!championship_matches_away_team_id_fkey(*)"
      )
      .eq("championship_id", champ.id)
      .order("match_date", { ascending: false }),
    supabase
      .from("championship_player_season_stats")
      .select(
        "*, player:players(id, name, position, photo_url, rating), team:championship_teams(*)"
      )
      .eq("championship_id", champ.id),
    supabase
      .from("championship_teams")
      .select("*")
      .eq("name", "Дженгутай")
      .maybeSingle(),
  ]);

  const firstError = partError ?? matchError ?? statsError;
  if (firstError) {
    return {
      data: null,
      error: isMissingRelation(firstError.message)
        ? SCHEMA_HINT
        : firstError.message,
      schemaMissing: isMissingRelation(firstError.message),
    };
  }

  const teams: ChampionshipTeam[] = (participantRows ?? [])
    .map((row) => {
      const team = Array.isArray(row.team) ? row.team[0] : row.team;
      return team as ChampionshipTeam | null;
    })
    .filter((team): team is ChampionshipTeam => Boolean(team));

  const bundle = buildChampionshipBundle({
    championship: champ,
    teams,
    matches: (matches ?? []) as ChampionshipMatch[],
    seasonStats: (seasonStats ?? []) as ChampionshipSeasonPlayerStat[],
    homeClubTeamId: homeTeam?.id ?? null,
  });

  return { data: bundle, error: null, schemaMissing: false };
});

export async function getChampionshipProgressBoard(): Promise<{
  rows: Array<{
    playerId: number;
    name: string;
    photoUrl: string | null;
    teamName: string;
    teamColor: string;
    level: number;
    totalXp: number;
    xpIntoLevel: number;
    xpForNext: number;
    percent: number;
    seasonRating: number;
    cards: number;
  }>;
  error: string | null;
  schemaMissing: boolean;
}> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return { rows: [], error: "Supabase не настроен", schemaMissing: false };
  }

  const { data: championship, error: champError } = await supabase
    .from("championships")
    .select("id")
    .eq("status", "active")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (champError) {
    return {
      rows: [],
      error: isMissingRelation(champError.message)
        ? `${SCHEMA_HINT} и championship_progress.sql`
        : champError.message,
      schemaMissing: isMissingRelation(champError.message),
    };
  }
  if (!championship) {
    return { rows: [], error: "Нет активного чемпионата", schemaMissing: false };
  }

  const { data, error } = await supabase
    .from("championship_player_progress")
    .select(
      "*, player:players(id, name, position, photo_url), team:championship_teams(*)"
    )
    .eq("championship_id", championship.id)
    .order("season_xp", { ascending: false });

  if (error) {
    return {
      rows: [],
      error: isMissingRelation(error.message)
        ? "Выполните SQL: supabase/championship_progress.sql"
        : error.message,
      schemaMissing: isMissingRelation(error.message),
    };
  }

  const rows = (data ?? []).map((row) => {
    const player = one(row.player) as {
      id: number;
      name: string;
      photo_url?: string | null;
    } | null;
    const team = one(row.team) as ChampionshipTeam | null;
    const totalXp = Number(row.season_xp) || 0;
    const derived = deriveLevelFromTotalXp(totalXp);
    return {
      playerId: Number(row.player_id),
      name: player?.name ?? `Игрок #${row.player_id}`,
      photoUrl: player?.photo_url ?? null,
      teamName: team?.name ?? "—",
      teamColor: team?.primary_color ?? "#fbbf24",
      level: Number(row.season_level) || derived.level,
      totalXp,
      xpIntoLevel: derived.xpIntoLevel,
      xpForNext: derived.xpForNext,
      percent: progressBarPercent(derived.xpIntoLevel, derived.xpForNext),
      seasonRating: Number(row.season_rating) || 0,
      cards: Number(row.season_cards) || 0,
    };
  });

  return { rows, error: null, schemaMissing: false };
}

export async function getChampionshipSeasonCards(): Promise<{
  cards: ChampionshipSeasonCard[];
  error: string | null;
}> {
  const { data: bundle } = await getActiveChampionshipBundle();
  if (!bundle) return { cards: [], error: null };
  const supabase = createPublicSupabaseClient();
  if (!supabase) return { cards: [], error: "Supabase не настроен" };

  const { data, error } = await supabase
    .from("championship_season_cards")
    .select("id, championship_id, player_id, card_code, card_title, rarity, earned_at")
    .eq("championship_id", bundle.championship.id)
    .order("earned_at", { ascending: false })
    .limit(100);

  if (error) {
    return {
      cards: [],
      error: isMissingRelation(error.message)
        ? "Выполните SQL: supabase/championship_progress.sql"
        : error.message,
    };
  }
  return { cards: (data ?? []) as ChampionshipSeasonCard[], error: null };
}

export async function getChampionshipSeasonRewards(): Promise<{
  rewards: ChampionshipSeasonReward[];
  error: string | null;
}> {
  const { data: bundle } = await getActiveChampionshipBundle();
  if (!bundle) return { rewards: [], error: null };
  const supabase = createPublicSupabaseClient();
  if (!supabase) return { rewards: [], error: "Supabase не настроен" };

  const { data, error } = await supabase
    .from("championship_season_rewards")
    .select(
      "id, championship_id, player_id, team_id, reward_code, reward_title, earned_at"
    )
    .eq("championship_id", bundle.championship.id)
    .order("earned_at", { ascending: false })
    .limit(100);

  if (error) {
    return {
      rewards: [],
      error: isMissingRelation(error.message)
        ? "Выполните SQL: supabase/championship_progress.sql"
        : error.message,
    };
  }
  return { rewards: (data ?? []) as ChampionshipSeasonReward[], error: null };
}

export async function getBlackGoldPrizeBoard(): Promise<{
  myProgress: import("@/lib/championship/blackGold").BlackGoldProgress | null;
  unlocked: import("@/lib/championship/blackGold").BlackGoldProgress[];
  leaderboard: import("@/lib/championship/blackGold").BlackGoldProgress[];
  error: string | null;
  schemaHint: string | null;
}> {
  const { data: bundle, error: bundleError, schemaMissing } =
    await getActiveChampionshipBundle();
  if (schemaMissing || !bundle || bundle.homeClubTeamId == null) {
    return {
      myProgress: null,
      unlocked: [],
      leaderboard: [],
      error: bundleError,
      schemaHint: schemaMissing
        ? "Выполните SQL: supabase/championship.sql"
        : null,
    };
  }

  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return {
      myProgress: null,
      unlocked: [],
      leaderboard: [],
      error: "Supabase не настроен",
      schemaHint: null,
    };
  }

  const { getBlackGoldProgressForPlayers } = await import(
    "@/lib/championship/blackGold"
  );
  const { rows, error } = await getBlackGoldProgressForPlayers(supabase, {
    championship: bundle.championship,
    homeTeamId: bundle.homeClubTeamId,
    matches: bundle.matches,
    teams: bundle.teams,
  });

  if (error) {
    return {
      myProgress: null,
      unlocked: [],
      leaderboard: [],
      error,
      schemaHint: isMissingRelation(error)
        ? "Выполните SQL: supabase/championship_black_gold.sql"
        : null,
    };
  }

  const { getUserProfile } = await import("@/lib/auth");
  const profile = await getUserProfile();
  const myPlayerId = profile?.player_id ?? null;
  const myProgress =
    myPlayerId != null
      ? rows.find((row) => row.playerId === myPlayerId) ?? null
      : null;

  const leaderboard = [...rows].sort((a, b) => {
    if (b.completedCount !== a.completedCount) {
      return b.completedCount - a.completedCount;
    }
    if (Number(b.unlocked) !== Number(a.unlocked)) {
      return Number(b.unlocked) - Number(a.unlocked);
    }
    return a.playerName.localeCompare(b.playerName, "ru");
  });

  return {
    myProgress,
    unlocked: rows.filter((row) => row.unlocked),
    leaderboard,
    error: null,
    schemaHint: null,
  };
}

export async function getSeasonPrizesBoard(): Promise<{
  collection: import("@/lib/championship/seasonAwards").SeasonPrizesCollection | null;
  error: string | null;
  schemaHint: string | null;
}> {
  const { data: bundle, error: bundleError, schemaMissing } =
    await getActiveChampionshipBundle();
  if (schemaMissing || !bundle || bundle.homeClubTeamId == null) {
    return {
      collection: null,
      error: bundleError,
      schemaHint: schemaMissing
        ? "Выполните SQL: supabase/championship.sql"
        : null,
    };
  }

  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return {
      collection: null,
      error: "Supabase не настроен",
      schemaHint: null,
    };
  }

  const { getUserProfile } = await import("@/lib/auth");
  const profile = await getUserProfile();
  let playerId = profile?.player_id ?? null;

  if (playerId == null) {
    const { data: progress } = await supabase
      .from("championship_player_progress")
      .select("player_id")
      .eq("championship_id", bundle.championship.id)
      .order("season_xp", { ascending: false })
      .limit(1)
      .maybeSingle();
    playerId = progress?.player_id != null ? Number(progress.player_id) : null;
  }

  if (playerId == null) {
    const { data: anyPlayer } = await supabase
      .from("players")
      .select("id")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    playerId = anyPlayer?.id != null ? Number(anyPlayer.id) : null;
  }

  if (playerId == null) {
    return {
      collection: null,
      error: "Нет игроков для коллекции призов",
      schemaHint: null,
    };
  }

  const { getSeasonPrizesCollection } = await import(
    "@/lib/championship/seasonAwards"
  );
  const { data, error } = await getSeasonPrizesCollection(supabase, {
    championship: bundle.championship,
    homeTeamId: bundle.homeClubTeamId,
    matches: bundle.matches,
    teams: bundle.teams,
    playerId,
  });

  if (error) {
    return {
      collection: null,
      error,
      schemaHint: isMissingRelation(error)
        ? "Выполните SQL: supabase/championship_progress.sql и championship_black_gold.sql"
        : null,
    };
  }

  return { collection: data, error: null, schemaHint: null };
}

export async function getAllChampionshipTeams(): Promise<{
  teams: ChampionshipTeam[];
  error: string | null;
}> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return { teams: [], error: "Supabase не настроен" };
  const { data, error } = await supabase
    .from("championship_teams")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    return {
      teams: [],
      error: isMissingRelation(error.message) ? SCHEMA_HINT : error.message,
    };
  }
  return { teams: (data ?? []) as ChampionshipTeam[], error: null };
}

export async function getChampionshipMatchById(
  matchId: number
): Promise<{
  data: ChampionshipMatchDetail | null;
  error: string | null;
}> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return { data: null, error: "Supabase не настроен" };
  }

  const { data: match, error } = await supabase
    .from("championship_matches")
    .select(
      "*, home_team:championship_teams!championship_matches_home_team_id_fkey(*), away_team:championship_teams!championship_matches_away_team_id_fkey(*)"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: isMissingRelation(error.message) ? SCHEMA_HINT : error.message,
    };
  }
  if (!match) {
    return { data: null, error: null };
  }

  const { data: stats } = await supabase
    .from("championship_match_player_stats")
    .select(
      "id, player_id, team_id, goals, assists, is_mvp, match_rating, player:players(id, name, position, photo_url)"
    )
    .eq("match_id", matchId);

  return {
    data: {
      ...(match as ChampionshipMatch),
      playerStats: (stats ?? []).map((row) => ({
        id: Number(row.id),
        player_id: Number(row.player_id),
        team_id: Number(row.team_id),
        goals: Number(row.goals) || 0,
        assists: Number(row.assists) || 0,
        is_mvp: Boolean(row.is_mvp),
        match_rating:
          row.match_rating != null ? Number(row.match_rating) : null,
        player: one(row.player),
      })),
    },
    error: null,
  };
}

export async function getHomeChampionshipDashboard(): Promise<{
  data: import("@/lib/championship/homeDashboard").HomeChampionshipDashboardData | null;
  active: boolean;
  error: string | null;
}> {
  const { buildHomeChampionshipDashboard } = await import(
    "@/lib/championship/homeDashboard"
  );
  const result = await getActiveChampionshipBundle();
  if (result.schemaMissing || !result.data) {
    return { data: null, active: false, error: result.error };
  }

  const bundle = result.data;
  const homeId = bundle.homeClubTeamId;
  const ourMatches = homeId
    ? bundle.matches.filter(
        (m) => m.home_team_id === homeId || m.away_team_id === homeId
      )
    : [];
  const lastPlayed = [...ourMatches]
    .filter((m) => m.is_played)
    .sort((a, b) => {
      const byDate = b.match_date.localeCompare(a.match_date);
      if (byDate !== 0) return byDate;
      return b.id - a.id;
    })[0];

  const supabase = createPublicSupabaseClient();
  let lastMatchLines: Array<{
    player_id: number;
    goals: number;
    assists: number;
    player?: { id: number; name: string } | null;
  }> = [];
  let roundsCount = 0;
  let finishedRounds = 0;
  let seasonStats: ChampionshipSeasonPlayerStat[] = [];

  if (supabase) {
    const [linesRes, roundsRes, statsRes] = await Promise.all([
      lastPlayed
        ? supabase
            .from("championship_match_player_stats")
            .select("player_id, goals, assists, player:players(id, name)")
            .eq("match_id", lastPlayed.id)
        : Promise.resolve({ data: [] as typeof lastMatchLines }),
      supabase
        .from("championship_rounds")
        .select("id, status")
        .eq("championship_id", bundle.championship.id),
      supabase
        .from("championship_player_season_stats")
        .select(
          "*, player:players(id, name, position, photo_url, rating), team:championship_teams(*)"
        )
        .eq("championship_id", bundle.championship.id),
    ]);

    lastMatchLines = (linesRes.data ?? []).map((row) => ({
      player_id: Number(row.player_id),
      goals: Number(row.goals) || 0,
      assists: Number(row.assists) || 0,
      player: one(row.player) as { id: number; name: string } | null,
    }));
    const rounds = roundsRes.data ?? [];
    roundsCount = rounds.length;
    finishedRounds = rounds.filter((r) => r.status === "finished").length;
    if (finishedRounds === 0) {
      finishedRounds = ourMatches.filter((m) => m.is_played).length;
    }
    seasonStats = (statsRes.data ?? []) as ChampionshipSeasonPlayerStat[];
  }

  return {
    data: buildHomeChampionshipDashboard({
      bundle,
      lastMatchLines,
      roundsCount,
      finishedRounds,
      seasonStats,
    }),
    active: true,
    error: null,
  };
}
