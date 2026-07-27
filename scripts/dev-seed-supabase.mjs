/**
 * LOCAL DEV ONLY: create an admin account plus one linked account per seeded
 * player so post-match voting can be exercised end-to-end against a local
 * `supabase start` stack. Idempotent — safe to re-run.
 *
 *   node scripts/dev-seed-supabase.mjs
 *
 * Admin:   admin@ndfk.local  / admin123
 * Players: player1@ndfk.local … / player123 (linked to players.id = 1..N)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const text = readFileSync(resolve(root, ".env.local"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Нет NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  return (data?.users ?? []).find((u) => u.email?.toLowerCase() === email);
}

async function ensureUser(email, password) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user;
}

async function setProfile(userId, role, playerId) {
  const { error } = await admin
    .from("profiles")
    .upsert({ id: userId, role, player_id: playerId }, { onConflict: "id" });
  if (error) throw new Error(`profile ${userId}: ${error.message}`);
}

// Admin
const adminUser = await ensureUser("admin@ndfk.local", "admin123");
await setProfile(adminUser.id, "admin", null);
console.log("✓ admin@ndfk.local / admin123 (role=admin)");

// One player account per seeded player
const { data: players, error: playersError } = await admin
  .from("players")
  .select("id, name")
  .order("id");

if (playersError) {
  console.error("Не удалось прочитать players:", playersError.message);
  process.exit(1);
}

for (const player of players ?? []) {
  const email = `player${player.id}@ndfk.local`;
  const user = await ensureUser(email, "player123");
  await setProfile(user.id, "player", player.id);
  console.log(`✓ ${email} / player123 → ${player.name} (player_id=${player.id})`);
}

console.log("\nГотово. Вход админа: /login · Вход игрока: /player/login");
