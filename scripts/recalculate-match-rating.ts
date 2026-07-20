import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

for (const [key, value] of Object.entries(env)) {
  process.env[key] = value;
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const matchIdArg = process.argv[2];
const dateArg = process.argv[3];

async function findMatch(db: SupabaseClient) {
  if (matchIdArg && !Number.isNaN(Number(matchIdArg))) {
    const { data, error } = await db
      .from("matches")
      .select("id, opponent, date, time, is_played")
      .eq("id", Number(matchIdArg))
      .single();
    if (error) throw error;
    return data;
  }

  const yesterday = dateArg ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const { data, error } = await db
    .from("matches")
    .select("id, opponent, date, time, is_played")
    .eq("date", yesterday)
    .order("time", { ascending: false });

  if (error) throw error;

  const played = (data ?? []).filter((row) => row.is_played);
  if (played.length === 0) {
    console.log(`No played matches on ${yesterday}. All matches that day:`, data);
    return null;
  }

  return played[0];
}

async function createAdminDbClient(): Promise<SupabaseClient> {
  const { data: adminProfile, error: profileError } = await service
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (profileError || !adminProfile?.id) {
    throw new Error("Admin profile not found in profiles table");
  }

  const { data: userData, error: userError } = await service.auth.admin.getUserById(
    adminProfile.id
  );

  const email = userData.user?.email;
  if (userError || !email) {
    throw new Error("Admin auth user not found");
  }

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const tokenHash = linkData.properties?.hashed_token;
  if (linkError || !tokenHash) {
    throw new Error(linkError?.message ?? "Could not generate admin session");
  }

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessionData, error: verifyError } = await authClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  const accessToken = sessionData.session?.access_token;
  if (verifyError || !accessToken) {
    throw new Error(verifyError?.message ?? "Could not verify admin session");
  }

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function main() {
  const { recalculateMatchRatings } = await import("../lib/matchRatingSync");
  const adminDb = await createAdminDbClient();
  const match = await findMatch(adminDb);

  if (!match) {
    process.exit(1);
  }

  console.log(
    `Recalculating match #${match.id}: vs ${match.opponent} (${match.date} ${match.time})`
  );

  const { data: playersBefore } = await adminDb
    .from("players")
    .select("id, name, rating")
    .order("name");
  const { data: votesBefore } = await adminDb
    .from("match_player_rating_votes")
    .select("id")
    .eq("match_id", match.id);
  const { data: statsBefore } = await adminDb
    .from("match_player_stats")
    .select("player_id, goals, assists, saves")
    .eq("match_id", match.id);

  console.log(`Votes: ${votesBefore?.length ?? 0}, stat rows: ${statsBefore?.length ?? 0}`);

  const result = await recalculateMatchRatings(match.id, adminDb);
  console.log("Result:", result);

  const { data: summaries } = await adminDb
    .from("match_player_rating_summary")
    .select(
      "player_id, avg_stars, match_rating, vote_count, is_mvp, rating_before, rating_after"
    )
    .eq("match_id", match.id)
    .order("rating_after", { ascending: false });

  const beforeMap = new Map((playersBefore ?? []).map((p) => [p.id, p]));

  console.log("\nRating changes:");
  for (const row of summaries ?? []) {
    const player = beforeMap.get(row.player_id);
    const delta =
      Math.round((Number(row.rating_after) - Number(row.rating_before)) * 10) / 10;
    if (delta === 0 && row.vote_count === 0) continue;

    const mvp = row.is_mvp ? " 🏆 MVP" : "";
    const stats = statsBefore?.find((s) => s.player_id === row.player_id);
    const statLabel = stats
      ? ` · ${stats.goals ?? 0}G ${stats.assists ?? 0}A`
      : "";
    console.log(
      `  ${player?.name ?? row.player_id}: ${row.rating_before} → ${row.rating_after} (${delta >= 0 ? "+" : ""}${delta})${mvp}${statLabel} · ${row.vote_count} votes`
    );
  }

  if (!result.ratingsApplied) {
    console.error("\nRatings were NOT applied. Check votes/stats and is_played flag.");
    process.exit(1);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
