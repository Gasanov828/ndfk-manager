type NavIconProps = {
  active?: boolean;
  className?: string;
};

function iconClass(active?: boolean, className?: string) {
  return [
    "h-[1.15rem] w-[1.15rem]",
    active ? "stroke-[2.1]" : "stroke-[1.7]",
    className ?? "",
  ]
    .join(" ")
    .trim();
}

export function HomeNavIcon({ active, className }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClass(active, className)}
      aria-hidden
    >
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-5.4h-3.6V21H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

export function PlayersNavIcon({ active, className }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClass(active, className)}
      aria-hidden
    >
      <circle cx="9" cy="8" r="3.1" />
      <path d="M3.8 19.2c.7-3 2.8-4.7 5.2-4.7s4.5 1.7 5.2 4.7" />
      <circle cx="17.2" cy="9" r="2.4" />
      <path d="M14.4 19.2c.5-2.1 1.9-3.4 3.6-3.4 1.2 0 2.2.6 2.9 1.7" />
    </svg>
  );
}

export function LineupNavIcon({ active, className }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClass(active, className)}
      aria-hidden
    >
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M4 12h16" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M9.2 3.5v2.8M14.8 3.5v2.8M9.2 17.7V20.5M14.8 17.7V20.5" />
    </svg>
  );
}

export function MatchesNavIcon({ active, className }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClass(active, className)}
      aria-hidden
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
      <path d="M8.2 14h2.2M13.6 14h2.2M8.2 17.2h2.2M13.6 17.2h2.2" />
    </svg>
  );
}

export function ProfileNavIcon({ active, className }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClass(active, className)}
      aria-hidden
    >
      <circle cx="12" cy="8.2" r="3.3" />
      <path d="M5.2 19.5c1.1-3.2 3.5-4.8 6.8-4.8s5.7 1.6 6.8 4.8" />
    </svg>
  );
}

export function AdminNavIcon({ active, className }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClass(active, className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.8 6.8l1.6 1.6M17.6 15.6l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.2l1.6-1.6M17.6 8.4l1.6-1.6" />
    </svg>
  );
}

export function getBottomNavIcon(href: string) {
  if (href === "/") return HomeNavIcon;
  if (href === "/players") return PlayersNavIcon;
  if (href === "/lineup") return LineupNavIcon;
  if (href === "/matches") return MatchesNavIcon;
  if (href === "/me") return ProfileNavIcon;
  if (href.startsWith("/admin")) return AdminNavIcon;
  return HomeNavIcon;
}
