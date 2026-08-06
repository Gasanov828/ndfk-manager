"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBottomNavIcon } from "@/components/mobile/BottomNavIcons";
import { getMobileNavItems, isNavItemActive } from "@/lib/navItems";
import { shouldHideBottomNav } from "@/lib/mobileNav";
import { useMobileOverlay } from "@/hooks/useMobileOverlay";

function MobileBottomNav() {
  const pathname = usePathname();
  const { hasOverlay } = useMobileOverlay();
  const items = useMemo(() => getMobileNavItems(), []);
  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }),
    [items.length]
  );
  const isChampionship = useMemo(
    () => pathname.startsWith("/championship") || pathname.startsWith("/tournament"),
    [pathname]
  );

  if (shouldHideBottomNav(pathname)) {
    return null;
  }

  return (
    <nav
      className={`bottom-nav-safe fixed inset-x-2 bottom-2 z-[80] transition duration-200 md:hidden ${
        hasOverlay ? "pointer-events-none opacity-40" : ""
      }`}
      aria-label="Основная навигация"
      aria-hidden={hasOverlay}
    >
      <div
        className={`bottom-nav-shell mx-auto max-w-lg overflow-visible rounded-[22px] p-1.5 ${
          isChampionship ? "bottom-nav-shell--tournament" : ""
        }`}
      >
        <div
          className="grid items-end gap-1"
          style={gridStyle}
        >
          {items.map((item) => {
            const isActive = isNavItemActive(pathname, item);
            const Icon = getBottomNavIcon(item.href);
            const featured = Boolean(item.featured);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 transition duration-200 active:scale-[0.96] ${
                  featured
                    ? `-mt-3 min-h-[3.75rem] py-1.5 ${
                        isActive
                          ? "bottom-nav-item-featured-active text-amber-50"
                          : "text-amber-100/90 hover:bg-amber-500/10"
                      }`
                    : `min-h-[3.25rem] py-1.5 ${
                        isActive
                          ? isChampionship
                            ? "bottom-nav-item-active-tournament text-amber-50"
                            : "bottom-nav-item-active text-cyan-50"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`
                }`}
              >
                <span
                  className={`relative flex items-center justify-center rounded-xl transition ${
                    featured
                      ? `h-10 w-10 rounded-2xl ${
                          isActive
                            ? "bottom-nav-cup-active"
                            : "bottom-nav-cup"
                        }`
                      : `h-7 w-7 ${
                          isActive
                            ? isChampionship
                              ? "bg-amber-400/20 text-amber-100"
                              : "bg-cyan-400/25 text-cyan-100"
                            : "bg-white/10 text-slate-200 group-hover:bg-white/15 group-hover:text-white"
                        }`
                  }`}
                >
                  <Icon
                    active={isActive}
                    className={featured ? "h-[1.35rem] w-[1.35rem]" : undefined}
                  />
                </span>
                <span
                  className={`max-w-full truncate text-[9px] font-bold leading-tight tracking-wide ${
                    isActive ? "text-inherit" : featured ? "text-amber-200/80" : "text-slate-300"
                  }`}
                >
                  {item.label}
                </span>
                {isActive && !featured ? (
                  <span
                    className={`absolute bottom-1 h-0.5 w-3.5 rounded-full ${
                      isChampionship ? "bg-amber-300" : "bg-cyan-300"
                    }`}
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default memo(MobileBottomNav);
