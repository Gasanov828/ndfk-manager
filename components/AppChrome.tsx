"use client";

import MainContent from "@/components/MainContent";
import Navbar from "@/components/Navbar";
import { usePathname } from "next/navigation";
import { shouldHideClubChrome } from "@/lib/mobileNav";
import type { MatchBannerData } from "@/lib/server/matchBanner";

type AppChromeProps = {
  children: React.ReactNode;
  matchBanner: MatchBannerData;
};

export default function AppChrome({ children, matchBanner }: AppChromeProps) {
  const pathname = usePathname();
  const hideClubChrome = shouldHideClubChrome(pathname);

  return (
    <div
      className={`relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-3 pb-4 pt-2 sm:px-6 sm:py-5 lg:px-8 ${
        hideClubChrome ? "tournament-chrome-shell" : ""
      }`}
    >
      {!hideClubChrome ? <Navbar matchBanner={matchBanner} /> : null}
      <MainContent>{children}</MainContent>
    </div>
  );
}
