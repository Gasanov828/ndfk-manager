"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBottomNavIcon } from "@/components/mobile/BottomNavIcons";
import { getNavItems, isNavItemActive } from "@/lib/navItems";
import { shouldHideBottomNav } from "@/lib/mobileNav";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import { useMobileOverlay } from "@/hooks/useMobileOverlay";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuthProfile();
  const { hasOverlay } = useMobileOverlay();
  const items = getNavItems(isAdmin);

  if (hasOverlay || shouldHideBottomNav(pathname)) {
    return null;
  }

  return (
    <nav
      className="bottom-nav-safe fixed inset-x-2 bottom-2 z-[80] md:hidden"
      aria-label={"\u041e\u0441\u043d\u043e\u0432\u043d\u0430\u044f \u043d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f"}
    >
      <div className="bottom-nav-shell mx-auto max-w-lg overflow-hidden rounded-[22px] p-1.5">
        <div
          className={`grid ${isAdmin ? "grid-cols-6" : "grid-cols-5"} gap-1`}
        >
          {items.map((item) => {
            const isActive = isNavItemActive(pathname, item);
            const isAdminTab = item.matchAdmin;
            const Icon = getBottomNavIcon(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 py-1.5 transition duration-200 active:scale-[0.96] ${
                  isActive
                    ? isAdminTab
                      ? "bottom-nav-item-active-admin text-red-50"
                      : "bottom-nav-item-active text-cyan-50"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`relative flex h-7 w-7 items-center justify-center rounded-xl transition ${
                    isActive
                      ? isAdminTab
                        ? "bg-red-500/25 text-red-100"
                        : "bg-cyan-400/25 text-cyan-100"
                      : "bg-white/10 text-slate-200 group-hover:bg-white/15 group-hover:text-white"
                  }`}
                >
                  <Icon active={isActive} />
                </span>
                <span
                  className={`max-w-full truncate text-[9px] font-bold leading-tight tracking-wide ${
                    isActive ? "text-inherit" : "text-slate-300"
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span
                    className={`absolute bottom-1 h-0.5 w-3.5 rounded-full ${
                      isAdminTab ? "bg-red-300" : "bg-cyan-300"
                    }`}
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
