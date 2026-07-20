export function shouldHideBottomNav(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/player/login") ||
    pathname.startsWith("/join") ||
    pathname.startsWith("/rate")
  );
}
