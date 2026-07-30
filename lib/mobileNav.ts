export function shouldHideBottomNav(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/player/login") ||
    pathname.startsWith("/join") ||
    pathname.startsWith("/rate")
  );
}

/** Скрыть клубную шапку — режим «Чемпионат» как отдельное приложение */
export function shouldHideClubChrome(pathname: string): boolean {
  return (
    pathname.startsWith("/championship") || pathname.startsWith("/tournament")
  );
}

