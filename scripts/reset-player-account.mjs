/**
 * Одноразовый сброс аккаунта игрока по имени.
 * node scripts/reset-player-account.mjs "Идрис"
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

const playerNameQuery = process.argv[2] ?? "Идрис";
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

const { data: players, error: playerError } = await admin
  .from("players")
  .select("id, name")
  .ilike("name", `%${playerNameQuery}%`);

if (playerError || !players?.length) {
  console.error("Игрок не найден:", playerError?.message ?? playerNameQuery);
  process.exit(1);
}

const player = players[0];
console.log(`Игрок: ${player.name} (id ${player.id})`);

const { data: profiles } = await admin
  .from("profiles")
  .select("id, role, player_id")
  .eq("player_id", player.id)
  .eq("role", "player");

const profile = profiles?.[0];

if (profile) {
  const { data: userData } = await admin.auth.admin.getUserById(profile.id);
  console.log(`Аккаунт: ${userData.user?.email ?? profile.id}`);

  await admin
    .from("player_invites")
    .update({ used_by: null })
    .eq("used_by", profile.id);

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(profile.id);
  if (deleteUserError) {
    console.error("Не удалось удалить auth user:", deleteUserError.message);
    process.exit(1);
  }
  console.log("Auth-пользователь удалён (профиль тоже).");
} else {
  console.log("Привязанного аккаунта нет — только сброс invite.");
}

const { error: inviteError } = await admin
  .from("player_invites")
  .update({ expires_at: new Date().toISOString(), used_at: null, used_by: null })
  .eq("player_id", player.id)
  .is("used_at", null);

if (inviteError) {
  console.warn("Invite:", inviteError.message);
} else {
  console.log("Старые invite-ссылки сброшены.");
}

console.log("Готово. В админке: «Создать invite-ссылку» для", player.name);
