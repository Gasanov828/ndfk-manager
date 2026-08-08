"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ClubHeroBrand from "@/components/server/ClubHeroBrand";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import { getFirstName } from "@/lib/playerStats";

export default function NavbarWelcome() {
  const pathname = usePathname();
  const { user, profile } = useAuthProfile();

  const canLoadPlayer =
    !!user && !!profile?.player_id && profile.role !== "admin";

  if (pathname === "/") {
    return null;
  }

  if (pathname === "/me") {
    return (
      <div className="hidden md:block">
        <ClubHeroBrand href="/" tag="ФК · главная" fullBleed={false} />
      </div>
    );
  }

  if (canLoadPlayer) {
    const firstName = profile?.player_name
      ? getFirstName(profile.player_name)
      : "Профиль";

    return (
      <Link
        href="/me"
        className="flex min-w-0 flex-1 items-center gap-2 truncate px-1 py-0.5"
      >
        <span className="truncate text-sm font-extrabold text-white">{firstName}</span>
        <span className="shrink-0 text-[10px] text-slate-500">Профиль →</span>
      </Link>
    );
  }

  return (
    <ClubHeroBrand href="/" tag="ФК · главная" fullBleed={false} />
  );
}
