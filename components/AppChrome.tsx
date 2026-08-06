"use client";

import MainContent from "@/components/MainContent";
import MatchStatusBanner from "@/components/MatchStatusBanner";
import Navbar from "@/components/Navbar";
import { usePathname } from "next/navigation";
import { shouldHideClubChrome } from "@/lib/mobileNav";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideClubChrome = shouldHideClubChrome(pathname);

  return (
    <div
      className={`relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-8 ${
        hideClubChrome ? "tournament-chrome-shell" : ""
      }`}
    >
      {!hideClubChrome ? <Navbar /> : null}
      {!hideClubChrome ? <MatchStatusBanner /> : null}
      <MainContent>{children}</MainContent>
    </div>
  );
}
