"use client";

import type { ReactNode } from "react";
import { useVisiblePhotoUrl } from "@/hooks/useVisiblePhotoUrl";

type PlayerPhotoImageProps = {
  photoUrl?: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
};

/** Renders a player photo only when the viewer may see player photos. */
export default function PlayerPhotoImage({
  photoUrl,
  alt,
  className = "",
  fallback = null,
}: PlayerPhotoImageProps) {
  const src = useVisiblePhotoUrl(photoUrl);
  if (!src) return fallback;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" />
  );
}
