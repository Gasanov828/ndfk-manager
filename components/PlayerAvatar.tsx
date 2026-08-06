"use client";

import { getPlayerInitials } from "@/lib/playerPhotos";
import { useVisiblePhotoUrl } from "@/hooks/useVisiblePhotoUrl";

type PlayerAvatarSize = "field" | "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<
  PlayerAvatarSize,
  { frame: string; text: string; ring: string; round: string }
> = {
  field: {
    frame: "h-8 w-[1.625rem]",
    text: "text-[7px]",
    ring: "ring-1",
    round: "rounded-md",
  },
  xs: {
    frame: "h-10 w-8",
    text: "text-[10px]",
    ring: "ring-1",
    round: "rounded-xl",
  },
  sm: {
    frame: "h-12 w-10",
    text: "text-xs",
    ring: "ring-1",
    round: "rounded-xl",
  },
  md: {
    frame: "h-[4.75rem] w-[3.75rem]",
    text: "text-sm",
    ring: "ring-2",
    round: "rounded-xl",
  },
  lg: {
    frame: "h-24 w-[4.75rem]",
    text: "text-base",
    ring: "ring-2",
    round: "rounded-xl",
  },
  xl: {
    frame: "h-32 w-24",
    text: "text-xl",
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

export default function PlayerAvatar({
  name,
  photoUrl,
  size = "md",
  badge,
  badgeClassName,
  className = "",
}: PlayerAvatarProps) {
  const visibleUrl = useVisiblePhotoUrl(photoUrl);
  const sizeStyle = SIZE_CLASSES[size];
  const initials = getPlayerInitials(name) || "?";

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`overflow-hidden border border-white/15 bg-slate-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.35)] ${sizeStyle.frame} ${sizeStyle.ring} ${sizeStyle.round} ring-white/10`}
      >
        {visibleUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={visibleUrl}
            alt={name}
            className="h-full w-full object-cover object-[center_18%] scale-[1.08]"
            loading="lazy"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 font-bold text-slate-200 ${sizeStyle.text}`}
          >
            {initials}
          </div>
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
