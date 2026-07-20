/**
 * Обрезка лица + загрузка фото игрока в Supabase Storage
 * node scripts/upload-player-photo.mjs "Арслан" path/to/photo.png
 */
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
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

async function cropFaceToSquare(inputPath, outputPath) {
  const image = sharp(inputPath);
  const meta = await image.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  if (!w || !h) throw new Error("Не удалось прочитать размер фото");

  // Портрет: лицо в верхней части — квадрат по ширине, чуть ниже верха
  const cropSize = Math.round(Math.min(w, h * 0.48));
  const left = Math.round((w - cropSize) / 2);
  const top = Math.round(h * 0.05);

  await sharp(inputPath)
    .extract({
      left: Math.max(0, left),
      top: Math.max(0, top),
      width: Math.min(cropSize, w - left),
      height: Math.min(cropSize, h - top),
    })
    .resize(512, 512, { fit: "cover" })
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

const playerName = process.argv[2] ?? "Арслан";
const sourcePath = resolve(
  process.argv[3] ??
    "C:/Users/PC/.cursor/projects/c-Users-PC-football-manager/assets/c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_photo_2026-06-27_02-09-40-229efbdf-0d05-4662-9861-09042b0e2843.png"
);

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Нет Supabase URL или SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: players, error: findError } = await admin
  .from("players")
  .select("id, name")
  .ilike("name", `%${playerName}%`);

if (findError || !players?.length) {
  console.error("Игрок не найден:", playerName, findError?.message);
  process.exit(1);
}

const player = players[0];
const tmpDir = resolve(root, "public/player-photos");
mkdirSync(tmpDir, { recursive: true });
const croppedPath = resolve(tmpDir, `${player.id}.jpg`);

await cropFaceToSquare(sourcePath, croppedPath);
console.log(`Обрезано: ${croppedPath}`);

const fileBuffer = readFileSync(croppedPath);
const storagePath = `${player.id}.jpg`;
const bucket = "player-photos";

const { data: buckets } = await admin.storage.listBuckets();
if (!buckets?.some((b) => b.id === bucket)) {
  const { error: bucketError } = await admin.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
  if (bucketError && !bucketError.message.includes("already exists")) {
    console.warn("Bucket:", bucketError.message);
  }
}

const { error: uploadError } = await admin.storage
  .from(bucket)
  .upload(storagePath, fileBuffer, {
    upsert: true,
    contentType: "image/jpeg",
    cacheControl: "3600",
  });

if (uploadError) {
  console.warn("Upload error:", uploadError.message);
  console.log("Локальный fallback: /player-photos/" + player.id + ".jpg");
  const photoUrl = `/player-photos/${player.id}.jpg?v=${Date.now()}`;
  const { error: updateError } = await admin
    .from("players")
    .update({ photo_url: photoUrl })
    .eq("id", player.id);
  if (updateError) {
    console.error("Update players error:", updateError.message);
    process.exit(1);
  }
  console.log(`Готово (local): ${player.name} (id ${player.id})`);
  console.log(photoUrl);
  process.exit(0);
}

const { data: publicData } = admin.storage.from(bucket).getPublicUrl(storagePath);

const photoUrl = `${publicData.publicUrl}?v=${Date.now()}`;

const { error: updateError } = await admin
  .from("players")
  .update({ photo_url: photoUrl })
  .eq("id", player.id);

if (updateError) {
  console.error("Update players error:", updateError.message);
  process.exit(1);
}

console.log(`Готово: ${player.name} (id ${player.id})`);
console.log(photoUrl);
