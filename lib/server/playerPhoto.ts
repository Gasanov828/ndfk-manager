import { createAdminClient } from "@/lib/supabase/admin";
import {
  PLAYER_PHOTOS_BUCKET,
  validatePlayerPhotoFile,
} from "@/lib/playerPhotos";

function getPhotoExtensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export async function uploadPlayerPhotoForPlayer(
  playerId: number,
  file: File
): Promise<string> {
  const validationError = validatePlayerPhotoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Supabase не настроен");
  }

  const path = `${playerId}.${getPhotoExtensionFromFile(file)}`;

  const { error: uploadError } = await admin.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = admin.storage.from(PLAYER_PHOTOS_BUCKET).getPublicUrl(path);
  const photoUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await admin
    .from("players")
    .update({ photo_url: photoUrl })
    .eq("id", playerId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return photoUrl;
}

export async function removePlayerPhotoForPlayer(playerId: number): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Supabase не настроен");
  }

  const { data: files } = await admin.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .list("", { search: `${playerId}.` });

  if (files && files.length > 0) {
    const paths = files
      .filter((file) => file.name.startsWith(`${playerId}.`))
      .map((file) => file.name);

    if (paths.length > 0) {
      await admin.storage.from(PLAYER_PHOTOS_BUCKET).remove(paths);
    }
  }

  const { error } = await admin
    .from("players")
    .update({ photo_url: null })
    .eq("id", playerId);

  if (error) {
    throw new Error(error.message);
  }
}
