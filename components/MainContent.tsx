"use client";

import { usePathname } from "next/navigation";
import { shouldHideBottomNav } from "@/lib/mobileNav";

type MainContentProps = {
  children: React.ReactNode;
};

export default function MainContent({ children }: MainContentProps) {
  const pathname = usePathname();
  const hideNavPadding = shouldHideBottomNav(pathname);

  return (
    <div
      className={`main-content-safe flex-1 ${
        hideNavPadding ? "pb-4 md:pb-0" : "pb-nav-safe md:pb-0"
      }`}
    >
      {children}
    </div>
  );
}
