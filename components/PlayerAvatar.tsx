"use client";

import { useState } from "react";
import {
  getPlayerAvatarFallbackPalette,
  getPlayerInitials,
} from "@/lib/playerPhotos";
import { useVisiblePhotoUrl } from "@/hooks/useVisiblePhotoUrl";

type PlayerAvatarSize = "field" | "fieldChamp" | "fieldChampCompact" | "fieldWide" | "bench" | "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<
  PlayerAvatarSize,
  { frame: string; text: string; ring: string; round: string }
> = {
  field: {
    frame: "h-8 w-[1.625rem]",
    text: "text-[9px] tracking-wide",
    ring: "ring-0",
    round: "rounded-md",
  },
  fieldWide: {
    frame: "aspect-square w-full",
    text: "text-2xl sm:text-[1.75rem] tracking-[0.08em]",
    ring: "ring-0",
    round: "rounded-none",
  },
  fieldChamp: {
    frame: "aspect-[4/5] w-full",
    text: "text-sm sm:text-base tracking-wide",
    ring: "ring-0",
    round: "rounded-none",
  },
  fieldChampCompact: {
    frame: "aspect-square w-full",
    text: "text-[10px] tracking-wide",
    ring: "ring-0",
    round: "rounded-none",
  },
  bench: {
    frame: "h-7 w-7",
    text: "text-[8px] tracking-wide",
    ring: "ring-1",
    round: "rounded-md",
  },
  xs: {
    frame: "h-10 w-8",
    text: "text-[11px] tracking-wide",
    ring: "ring-1",
    round: "rounded-xl",
  },
  sm: {
    frame: "h-12 w-10",
    text: "text-xs tracking-wide",
    ring: "ring-1",
    round: "rounded-xl",
  },
  md: {
    frame: "h-[4.75rem] w-[3.75rem]",
    text: "text-lg tracking-wide",
    ring: "ring-2",
    round: "rounded-xl",
  },
  lg: {
    frame: "h-24 w-[4.75rem]",
    text: "text-xl tracking-wide",
    ring: "ring-2",
    round: "rounded-xl",
  },
  xl: {
    frame: "h-32 w-24",
    text: "text-3xl tracking-[0.06em]",
    ring: "ring-2",
    round: "rounded-xl",
  },
};

type PlayerAvatarProps = {
  name: string;
  photoUrl?: string | null;
  size?: PlayerAvatarSize;
  badge?: string;
  badgeClassName?: string;
  className?: string;
};

function PlayerAvatarFallback({
  name,
  sizeStyle,
}: {
  name: string;
  sizeStyle: (typeof SIZE_CLASSES)[PlayerAvatarSize];
}) {
  const initials = getPlayerInitials(name) || "?";
  const palette = getPlayerAvatarFallbackPalette(name);

  return (
    <div
      className={`player-avatar-fallback relative flex h-full w-full items-center justify-center font-black ${palette.gradient} ${palette.glow} ${sizeStyle.text}`}
      aria-hidden
    >
      <span className="relative z-[1] drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
        {initials}
      </span>
      <span
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_55%)]"
        aria-hidden
      />
    </div>
  );
}

export default function PlayerAvatar({
  name,
  photoUrl,
  size = "md",
  badge,
  badgeClassName,
  className = "",
}: PlayerAvatarProps) {
  const visibleUrl = useVisiblePhotoUrl(photoUrl);
  const [imgFailed, setImgFailed] = useState(false);
  const sizeStyle = SIZE_CLASSES[size];
  const showPhoto = Boolean(visibleUrl) && !imgFailed;

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`player-avatar-frame overflow-hidden border border-white/15 bg-slate-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.35)] ${sizeStyle.frame} ${sizeStyle.ring} ${sizeStyle.round} ring-white/10`}
      >
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={visibleUrl!}
            alt={name}
            className={
              size === "fieldWide" || size === "fieldChamp" || size === "fieldChampCompact"
                ? "h-full w-full object-cover object-[center_28%] scale-[1.02]"
                : "h-full w-full object-cover object-[center_18%] scale-[1.08]"
            }
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <PlayerAvatarFallback name={name} sizeStyle={sizeStyle} />
        )}
      </div>

      {badge && (
        <span
          className={`absolute -bottom-1 -right-1 flex min-w-[1.5rem] items-center justify-center rounded-md px-1 py-0.5 text-[9px] font-bold text-white shadow-lg ${badgeClassName ?? "bg-slate-600"}`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
