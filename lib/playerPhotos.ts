import { supabase } from "@/lib/supabase";

export const PLAYER_PHOTOS_BUCKET = "player-photos";
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function getPlayerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function validatePlayerPhotoFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Подойдут только JPG, PNG, WebP или GIF";
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return "Файл слишком большой (максимум 5 МБ)";
  }
  return null;
}

function getPhotoExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export async function uploadPlayerPhoto(
  playerId: number,
  file: File
): Promise<string> {
  const validationError = validatePlayerPhotoFile(file);
  if (validationError) throw new Error(validationError);

  const path = `${playerId}.${getPhotoExtension(file)}`;

  const { error } = await supabase.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .getPublicUrl(path);

  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removePlayerPhoto(playerId: number): Promise<void> {
  const { data: files } = await supabase.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .list("", { search: `${playerId}.` });

  if (files && files.length > 0) {
    const paths = files
      .filter((file) => file.name.startsWith(`${playerId}.`))
      .map((file) => file.name);

    if (paths.length > 0) {
      await supabase.storage.from(PLAYER_PHOTOS_BUCKET).remove(paths);
    }
  }

  await supabase
    .from("players")
    .update({ photo_url: null })
    .eq("id", playerId);
}
