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
        <div className="grid items-end gap-1" style={gridStyle}>
          {items.map((item) => {
            const isActive = isNavItemActive(pathname, item);
            const Icon = getBottomNavIcon(item.href);
            const featured = Boolean(item.featured);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 transition duration-200 ${
                  featured
                    ? `-mt-3 min-h-[3.75rem] py-1.5 ${
                        isActive
                          ? "bottom-nav-item-featured-active text-amber-50"
                          : "text-amber-200/80 hover:text-amber-100"
                      }`
                    : `min-h-[3.25rem] py-1.5 ${
                        isActive
                          ? "bottom-nav-item-active text-sky-100"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`
                }`}
              >
                <span
                  className={`relative flex items-center justify-center rounded-xl transition ${
                    featured
                      ? `h-10 w-10 rounded-2xl ${
                          isActive ? "bottom-nav-cup-active" : "bottom-nav-cup"
                        }`
                      : `h-7 w-7 ${
                          isActive
                            ? "bottom-nav-icon-active"
                            : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-slate-200"
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
                    isActive
                      ? "text-inherit"
                      : featured
                        ? "text-amber-200/75"
                        : "text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
                {isActive && !featured ? (
                  <span
                    className="bottom-nav-active-dot absolute bottom-1 h-0.5 w-3.5 rounded-full"
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
