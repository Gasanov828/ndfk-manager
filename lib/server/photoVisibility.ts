import { getAuthSession } from "@/lib/auth";
import { canViewPlayerPhotos } from "@/lib/playerPhotoPrivacy";

export async function getCanViewPlayerPhotos(): Promise<boolean> {
  const { user, profile } = await getAuthSession();
  return canViewPlayerPhotos(user, profile);
}
