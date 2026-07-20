export type NavItem = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  matchAdmin?: boolean;
};

export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "\u0413\u043b\u0430\u0432\u043d\u0430\u044f", icon: "\uD83C\uDFE0" },
  { href: "/players", label: "\u0418\u0433\u0440\u043e\u043a\u0438", icon: "\uD83D\uDC65" },
  { href: "/lineup", label: "\u0421\u043e\u0441\u0442\u0430\u0432", icon: "\u26BD" },
  { href: "/matches", label: "\u041c\u0430\u0442\u0447\u0438", icon: "\uD83D\uDCC5" },
  { href: "/me", label: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c", icon: "\uD83D\uDC64" },
];

export const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin/players",
  label: "\u0410\u0434\u043c\u0438\u043d",
  icon: "\u2699\uFE0F",
  adminOnly: true,
  matchAdmin: true,
};

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.matchAdmin) {
    return pathname.startsWith("/admin");
  }
  if (item.href === "/matches") {
    return pathname === "/matches" || pathname === "/history";
  }
  if (item.href === "/me") {
    return (
      pathname === "/me" ||
      pathname.startsWith("/player/login") ||
      pathname === "/login"
    );
  }
  return pathname === item.href;
}

export function getNavItems(isAdmin: boolean): NavItem[] {
  return isAdmin ? [...MAIN_NAV_ITEMS, ADMIN_NAV_ITEM] : MAIN_NAV_ITEMS;
}
