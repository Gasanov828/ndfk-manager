import type { UserProfile } from "@/lib/auth";

type ViewerProfile = Pick<UserProfile, "role" | "player_id"> | null | undefined;

/** Photos are visible to linked players and admins only — not guests. */
export function canViewPlayerPhotos(
  user: { id: string } | null | undefined,
  profile: ViewerProfile
): boolean {
  if (!user || !profile) return false;
  if (profile.role === "admin") return true;
  return profile.role === "player" && profile.player_id != null;
}

export function visiblePhotoUrl(
  photoUrl: string | null | undefined,
  canView: boolean
): string | null {
  return canView && photoUrl ? photoUrl : null;
}

export function maskPlayersPhotos<T extends { photo_url?: string | null }>(
  players: T[],
  canView: boolean
): T[] {
  if (canView) return players;
  return players.map((player) => ({ ...player, photo_url: null }));
}

/** Recursively null photo_url / photoUrl / photo fields in server payloads. */
export function maskPhotoFields<T>(data: T, canView: boolean): T {
  if (canView || data == null) return data;

  if (Array.isArray(data)) {
    return data.map((item) => maskPhotoFields(item, canView)) as T;
  }

  if (typeof data === "object") {
    const source = data as Record<string, unknown>;
    const next: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(source)) {
      if (key === "photo_url" || key === "photoUrl" || key === "photo") {
        next[key] = null;
      } else {
        next[key] = maskPhotoFields(value, canView);
      }
    }

    return next as T;
  }

  return data;
}
