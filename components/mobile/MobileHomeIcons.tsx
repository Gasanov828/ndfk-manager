type IconProps = {
  className?: string;
};

export function NavHomeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NavPlayersIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 19c.8-3.2 3-4.8 5.5-4.8S13.7 15.8 14.5 19"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M14.8 17.5c.7-2.2 2.1-3.3 4.2-3.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NavLineupIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 5v3M12 16v3M4 12h3M17 12h3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function NavMatchesIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function NavTrainingIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M6 18 12 6l6 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 14h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function BallStatIcon({ className = "h-9 w-9" }: IconProps) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-blue-500/25 blur-md" />
      <svg viewBox="0 0 32 32" className="relative h-full w-full" fill="none">
        <circle cx="16" cy="16" r="11" fill="url(#ballGrad)" />
        <path
          d="M16 7 20 12l-1.5 6H13.5L12 12l4-5Z"
          fill="rgba(255,255,255,0.35)"
        />
        <path
          d="M10 18.5 16 21l6-2.5"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.2"
        />
        <defs>
          <radialGradient id="ballGrad" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

export function BootStatIcon({ className = "h-9 w-9" }: IconProps) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-violet-500/25 blur-md" />
      <svg viewBox="0 0 32 32" className="relative h-full w-full" fill="none">
        <path
          d="M8 20c2-6 6-9 11-9 3 0 5 1.5 6.5 4.5L27 18c-1 2.5-3 4-6 4H10c-1.5 0-2.2-.8-2-2Z"
          fill="url(#bootGrad)"
        />
        <path
          d="M11 20h12"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="bootGrad" x1="8" y1="11" x2="27" y2="22">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function EditPencilIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden>
      <path
        d="M12.2 3.8 16.2 7.8 7.5 16.5H3.5v-4l8.7-8.7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M11 5 15 9" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function UsersButtonIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden>
      <circle cx="7.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M3 15.5c.6-2.4 2.2-3.6 4.5-3.6s3.9 1.2 4.5 3.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="13.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M12 14.8c.5-1.6 1.5-2.4 3-2.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LineupButtonIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="14"
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
