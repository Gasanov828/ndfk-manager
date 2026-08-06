"use client";

import HomeMobileHeaderGate from "@/components/HomeMobileHeaderGate";
import MainContent from "@/components/MainContent";
import Navbar from "@/components/Navbar";
import { usePathname } from "next/navigation";
import { shouldHideClubChrome } from "@/lib/mobileNav";
import type { MatchBannerData } from "@/lib/server/matchBanner";
import type { ReactNode } from "react";

type AppChromeProps = {
  children: React.ReactNode;
  matchBanner: MatchBannerData;
  mobileHomeHeader: ReactNode;
};

export default function AppChrome({
  children,
  matchBanner,
  mobileHomeHeader,
}: AppChromeProps) {
  const pathname = usePathname();
  const hideClubChrome = shouldHideClubChrome(pathname);

  return (
    <div
      className={`relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-3 pb-4 pt-2 sm:px-6 sm:py-5 lg:px-8 ${
        hideClubChrome ? "tournament-chrome-shell" : ""
      }`}
    >
      {!hideClubChrome ? (
        <>
          <HomeMobileHeaderGate header={mobileHomeHeader} />
          <Navbar matchBanner={matchBanner} />
        </>
      ) : null}
      <MainContent>{children}</MainContent>
    </div>
  );
}
