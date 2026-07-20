"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ClubLogo from "@/components/ClubLogo";
import MatchRatingVote from "@/components/MatchRatingVote";
import NavbarWelcome from "@/components/NavbarWelcome";
import TrainingRatingVote from "@/components/TrainingRatingVote";
import UserMenu from "@/components/UserMenu";
import { getNavItems, isNavItemActive } from "@/lib/navItems";
import { useAuthProfile } from "@/hooks/useAuthProfile";

export default function Navbar() {
  const pathname = usePathname();
  const { isAdmin } = useAuthProfile();
  const navItems = getNavItems(isAdmin);

  return (
    <header className="glass-panel relative z-30 mb-2 rounded-[20px] px-3 py-2 sm:mb-8 sm:px-6 sm:py-3">
      <div className="flex flex-col gap-1.5 sm:gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 md:hidden">
            <NavbarWelcome />
          </div>

          <Link
            href="/"
            className="hidden min-w-0 shrink items-center gap-2.5 sm:gap-3 md:flex"
          >
            <ClubLogo size="md" />
            <div className="min-w-0 leading-tight">
              <span className="block text-sm tracking-tight sm:text-base md:text-lg">
                <span className="navbar-club-fk mr-1.5 not-italic">{"\u0424\u041a"}</span>
                <span className="navbar-club-name">
                  {"\u041d\u0438\u0436\u043d\u0438\u0439 \u0414\u0436\u0435\u043d\u0433\u0443\u0442\u0430\u0439"}
                </span>
              </span>
            </div>
          </Link>

          <div className="hidden shrink-0 items-center gap-1.5 md:flex md:gap-3">
            <MatchRatingVote />
            <TrainingRatingVote />
            <UserMenu />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-1.5 md:hidden">
          <MatchRatingVote compact />
          <TrainingRatingVote compact />
        </div>

        <nav className="hidden flex-wrap items-center gap-1 border-t border-white/5 pt-3 md:flex">
          {navItems.map((item) => {
            const isActive = isNavItemActive(pathname, item);
            const isAdminTab = item.matchAdmin;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? isAdminTab
                      ? "bg-red-500/20 text-red-200 shadow-[0_0_16px_rgba(239,68,68,0.15)] ring-1 ring-red-400/25"
                      : "bg-blue-500/20 text-cyan-200 shadow-[0_0_16px_rgba(56,189,248,0.15)] ring-1 ring-cyan-400/20"
                    : isAdminTab
                      ? "text-red-300/90 hover:bg-red-500/10 hover:text-red-200"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {isAdminTab ? "\u2699\uFE0F " : ""}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
