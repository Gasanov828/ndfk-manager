export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
};

/** Единый список разделов админки (без дублей History) */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/players", label: "\u0418\u0433\u0440\u043e\u043a\u0438", icon: "\uD83D\uDC65" },
  { href: "/admin/technique", label: "\u0422\u0435\u0445\u043d\u0438\u043a\u0430", icon: "\uD83C\uDFAF" },
  { href: "/admin/matches", label: "\u041c\u0430\u0442\u0447\u0438", icon: "\uD83D\uDCC5" },
  { href: "/admin/rating", label: "\u041e\u043f\u0440\u043e\u0441 \u2605", icon: "\u2B50" },
  { href: "/admin/training", label: "\u0422\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0438", icon: "\uD83C\uDFC3" },
];

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/matches") {
    return pathname.startsWith("/admin/matches") || pathname.startsWith("/admin/history");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
