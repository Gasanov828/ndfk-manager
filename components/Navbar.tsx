"use client";



import Link from "next/link";

import { usePathname } from "next/navigation";

import ClubLogo from "@/components/ClubLogo";

import MatchRatingVote from "@/components/MatchRatingVote";

import MatchStatusBanner from "@/components/MatchStatusBanner";

import NavbarWelcome from "@/components/NavbarWelcome";

import TrainingRatingVote from "@/components/TrainingRatingVote";

import UserMenu from "@/components/UserMenu";

import { useAuthProfile } from "@/hooks/useAuthProfile";

import { getNavItems, isNavItemActive } from "@/lib/navItems";

import type { MatchBannerData } from "@/lib/server/matchBanner";



export default function Navbar({ matchBanner }: { matchBanner: MatchBannerData }) {

  const pathname = usePathname();

  const { isAdmin, profile, user } = useAuthProfile();

  const navItems = getNavItems(isAdmin);

  const showPlayerStrip =

    Boolean(user) && Boolean(profile?.player_id) && profile?.role !== "admin";



  return (

    <header className="relative z-30 mb-1 md:mb-8 md:rounded-[20px] md:border md:border-white/10 md:bg-white/[0.03] md:px-6 md:py-3 md:shadow-[0_0_28px_rgba(56,189,248,0.06)] md:backdrop-blur-xl">

      <div className="flex flex-col gap-1 sm:gap-4">

        <div className="flex items-center justify-between gap-2 md:gap-3">

          <div className="min-w-0 flex-1">

            <NavbarWelcome />

          </div>



          {!showPlayerStrip ? (

            <Link

              href="/"

              className="hidden shrink-0 items-center gap-2.5 sm:gap-3 md:flex"

            >

              <ClubLogo size="md" />

              <div className="min-w-0 leading-tight">

                <span className="block text-sm tracking-tight sm:text-base md:text-lg">

                  <span className="navbar-club-fk mr-1.5 not-italic">ФК</span>

                  <span className="navbar-club-name">Нижний Дженгутай</span>

                </span>

              </div>

            </Link>

          ) : null}



          <div className="hidden shrink-0 items-center gap-1.5 md:flex md:gap-3">

            <MatchRatingVote />

            <TrainingRatingVote />

            <UserMenu />

          </div>

        </div>



        <MatchStatusBanner
          embedded
          initialLiveMatch={matchBanner.liveMatch}
          initialUpcomingMatch={matchBanner.upcomingMatch}
        />



        <div className="mobile-vote-grid grid grid-cols-[minmax(0,2.6fr)_minmax(5.25rem,0.8fr)] gap-1.5 md:hidden">

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

                      : item.featured

                        ? "bg-amber-500/20 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.2)] ring-1 ring-amber-400/30"

                        : "bg-blue-500/20 text-cyan-200 shadow-[0_0_16px_rgba(56,189,248,0.15)] ring-1 ring-cyan-400/20"

                    : isAdminTab

                      ? "text-red-300/90 hover:bg-red-500/10 hover:text-red-200"

                      : item.featured

                        ? "text-amber-200/90 hover:bg-amber-500/10 hover:text-amber-100"

                        : "text-slate-300 hover:bg-white/5 hover:text-white"

                }`}

              >

                {isAdminTab ? "⚙️ " : item.featured ? "🏆 " : ""}

                {item.label}

              </Link>

            );

          })}

        </nav>

      </div>

    </header>

  );

}


