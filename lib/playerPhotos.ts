import { supabase } from "@/lib/supabase";

export const PLAYER_PHOTO_UPDATED_EVENT = "ndfk:player-photo-updated";

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

const AVATAR_FALLBACK_PALETTES = [
  {
    gradient:
      "bg-gradient-to-br from-rose-500 via-rose-800 to-rose-950 text-rose-50",
    glow: "shadow-[inset_0_0_24px_rgba(255,255,255,0.12)]",
  },
  {
    gradient:
      "bg-gradient-to-br from-orange-500 via-orange-800 to-orange-950 text-orange-50",
    glow: "shadow-[inset_0_0_24px_rgba(255,255,255,0.12)]",
  },
  {
    gradient:
      "bg-gradient-to-br from-amber-400 via-amber-700 to-amber-950 text-amber-50",
    glow: "shadow-[inset_0_0_24px_rgba(255,255,255,0.1)]",
  },
  {
    gradient:
      "bg-gradient-to-br from-emerald-500 via-emerald-800 to-emerald-950 text-emerald-50",
    glow: "shadow-[inset_0_0_24px_rgba(255,255,255,0.12)]",
  },
  {
    gradient:
      "bg-gradient-to-br from-cyan-500 via-cyan-800 to-cyan-950 text-cyan-50",
    glow: "shadow-[inset_0_0_24px_rgba(255,255,255,0.12)]",
  },
  {
    gradient:
      "bg-gradient-to-br from-blue-500 via-blue-800 to-blue-950 text-blue-50",
    glow: "shadow-[inset_0_0_24px_rgba(255,255,255,0.12)]",
  },
  {
    gradient:
      "bg-gradient-to-br from-indigo-500 via-indigo-800 to-indigo-950 text-indigo-50",
    glow: "shadow-[inset_0_0_24px_rgba(255,255,255,0.12)]",
  },
  {
    gradient:
      "bg-gradient-to-br from-violet-500 via-violet-800 to-violet-950 text-violet-50",
    glow: "shadow-[inset_0_0_24px_rgba(255,255,255,0.12)]",
  },
  {
    gradient:
      "bg-gradient-to-br from-fuchsia-500 via-fuchsia-800 to-fuchsia-950 text-fuchsia-50",
    glow: "shadow-[inset_0_0_24px_rgba(255,255,255,0.12)]",
  },
  {
    gradient:
      "bg-gradient-to-br from-slate-500 via-slate-700 to-slate-950 text-slate-100",
    glow: "shadow-[inset_0_0_24px_rgba(255,255,255,0.1)]",
  },
] as const;

export function getPlayerAvatarFallbackPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) | 0;
  }
  return AVATAR_FALLBACK_PALETTES[
    Math.abs(hash) % AVATAR_FALLBACK_PALETTES.length
  ];
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
