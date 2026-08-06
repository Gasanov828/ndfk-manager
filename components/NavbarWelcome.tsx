"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ClubLogo from "@/components/ClubLogo";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import { getFirstName, type PlayerWelcomeData } from "@/lib/playerStats";

function ClubWelcomeStrip() {
  return (
    <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5 px-1 py-0.5">
      <ClubLogo size="md" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-extrabold text-white">Нижний Дженгутай</p>
        <p className="truncate text-[10px] text-slate-500">ФК · главная</p>
      </div>
    </Link>
  );
}

export default function NavbarWelcome() {
  const pathname = usePathname();
  const { user, profile, loading } = useAuthProfile();
  const [welcome, setWelcome] = useState<PlayerWelcomeData | null>(null);

  const canLoadPlayer =
    !!user && !!profile?.player_id && profile.role !== "admin";

  useEffect(() => {
    if (loading || !canLoadPlayer) {
      setWelcome(null);
      return;
    }

    let cancelled = false;

    fetch("/api/me/welcome", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { welcome: PlayerWelcomeData | null }) => {
        if (!cancelled) setWelcome(data.welcome);
      })
      .catch(() => {
        if (!cancelled) setWelcome(null);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, canLoadPlayer, user, profile]);

  if (pathname === "/") {
    return (
      <div className="hidden md:block">
        <ClubWelcomeStrip />
      </div>
    );
  }

  const name = welcome?.name ?? profile?.player_name ?? null;
  const firstName = name ? getFirstName(name) : null;

  if (canLoadPlayer && firstName) {
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

  return <ClubWelcomeStrip />;
}
