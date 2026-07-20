import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PLAYER_FILTER = "name.ilike.%Касум%,name.ilike.%Гитиев М.%";

/** Orphan auth users left after a partial reset (profile deleted, auth user remains) */
const ORPHAN_USER_IDS = [
  "029cb589-ae88-4f8b-a943-542f697db327", // Гитиев М.
  "93534f25-3a66-4910-b918-ba7d679f9588", // Касум
];

async function resetPlayers() {
  const { data: players, error: playersError } = await admin
    .from("players")
    .select("id, name")
    .or(PLAYER_FILTER)
    .order("name");

  if (playersError) {
    console.error("players:", playersError.message);
    process.exit(1);
  }

  if (!players?.length) {
    console.error("Players not found for Касум / Гитиев М.");
    process.exit(1);
  }

  console.log("Found players:", players.map((p) => `${p.name} (#${p.id})`).join(", "));

  for (const player of players) {
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, role, player_id")
      .eq("player_id", player.id)
      .eq("role", "player");

    if (profileError) {
      console.error(`profiles ${player.name}:`, profileError.message);
      continue;
    }

    for (const profile of profiles ?? []) {
      const { error: deleteProfileError } = await admin
        .from("profiles")
        .delete()
        .eq("id", profile.id);

      if (deleteProfileError) {
        console.error(`deleteProfile ${player.name}:`, deleteProfileError.message);
        continue;
      }

      const { error: deleteUserError } = await admin.auth.admin.deleteUser(profile.id);
      if (deleteUserError) {
        console.error(
          `deleteUser ${player.name} ${profile.id}:`,
          deleteUserError.message || deleteUserError
        );
      } else {
        console.log(`✓ Removed account for ${player.name} (${profile.id})`);
      }
    }

    if (!profiles?.length) {
      console.log(`— ${player.name}: no linked player account`);
    }

    const { error: inviteError } = await admin
      .from("player_invites")
      .update({ expires_at: new Date().toISOString() })
      .eq("player_id", player.id)
      .is("used_at", null);

    if (inviteError) {
      console.error(`invites ${player.name}:`, inviteError.message);
    } else {
      console.log(`✓ Expired old invite links for ${player.name}`);
    }
  }

  console.log("\nDone. In admin → Игроки create new invite links for Касум and Гитиев.");
}

async function cleanupOrphanAuthUsers() {
  for (const userId of ORPHAN_USER_IDS) {
    const { error: inviteClearError } = await admin
      .from("player_invites")
      .update({ used_by: null, used_at: null })
      .eq("used_by", userId);

    if (inviteClearError) {
      console.error(`clear invites for ${userId}:`, inviteClearError.message);
    }

    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      console.log(`— auth user ${userId} already removed`);
      continue;
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error(
        `deleteUser orphan ${data.user.email ?? userId}:`,
        deleteUserError.message || deleteUserError
      );
    } else {
      console.log(`✓ Removed orphan auth user ${data.user.email ?? userId}`);
    }
  }
}

async function main() {
  await resetPlayers();
  await cleanupOrphanAuthUsers();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
