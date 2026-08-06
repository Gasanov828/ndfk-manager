export type NavItem = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  matchAdmin?: boolean;
  /** Центральная «hero»-кнопка нижней навигации */
  featured?: boolean;
};

/** 5 вкладок: Чемпионат по центру, Состав рядом */
export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Главная", icon: "🏠" },
  { href: "/players", label: "Игроки", icon: "👥" },
  {
    href: "/championship",
    label: "Чемпионат",
    icon: "🏆",
    featured: true,
  },
  { href: "/lineup", label: "Состав", icon: "📋" },
  { href: "/me", label: "Профиль", icon: "👤" },
];

export const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin/players",
  label: "Админ",
  icon: "⚙️",
  adminOnly: true,
  matchAdmin: true,
};

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.matchAdmin) {
    return pathname.startsWith("/admin");
  }
  if (item.href === "/championship") {
    return (
      pathname.startsWith("/championship") ||
      pathname.startsWith("/tournament")
    );
  }
  if (item.href === "/matches") {
    return pathname === "/matches" || pathname === "/history";
  }
  if (item.href === "/me") {
    return (
      pathname === "/me" ||
      pathname.startsWith("/career") ||
      pathname.startsWith("/player/login") ||
      pathname === "/login"
    );
  }
  if (item.href === "/lineup") {
    return (
      pathname.startsWith("/lineup") ||
      pathname.startsWith("/championship/lineup")
    );
  }
  if (item.href === "/") {
    return pathname === "/";
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Нижняя навигация — всегда 5 вкладок без админки (админ в меню профиля) */
export function getMobileNavItems(): NavItem[] {
  return MAIN_NAV_ITEMS;
}

/** Десктоп: 5 вкладок + админ при необходимости */
export function getNavItems(isAdmin: boolean): NavItem[] {
  return isAdmin ? [...MAIN_NAV_ITEMS, ADMIN_NAV_ITEM] : MAIN_NAV_ITEMS;
}
