"use client";

import { useAuthProfile } from "@/hooks/useAuthProfile";
import { visiblePhotoUrl } from "@/lib/playerPhotoPrivacy";

export function useCanViewPlayerPhotos(): boolean {
  const { canViewPlayerPhotos } = useAuthProfile();
  return canViewPlayerPhotos;
}

export function useVisiblePhotoUrl(
  photoUrl: string | null | undefined
): string | null {
  const canView = useCanViewPlayerPhotos();
  return visiblePhotoUrl(photoUrl, canView);
}
