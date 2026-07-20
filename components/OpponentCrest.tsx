"use client";

import { useId } from "react";

type OpponentCrestProps = {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
} as const;

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function isDorgeli(name: string): boolean {
  return /доргел/i.test(name);
}

/** Мини-герб соперника (Доргели — отдельный дизайн) */
export default function OpponentCrest({
  name,
  className = "",
  size = "md",
}: OpponentCrestProps) {
  const uid = useId().replace(/:/g, "");
  const bg = `oppBg-${uid}`;
  const rim = `oppRim-${uid}`;
  const accent = `oppAccent-${uid}`;
  const clip = `oppClip-${uid}`;
  const dorgeli = isDorgeli(name);
  const initials = getInitials(name);
  const hue = hashName(name) % 360;

  return (
    <div
      className={`relative shrink-0 ${SIZE[size]} ${className}`}
      aria-hidden
      title={name}
    >
      <svg viewBox="0 0 64 72" className="h-full w-full drop-shadow-sm" role="img">
        <defs>
          {dorgeli ? (
            <>
              <linearGradient id={bg} x1="15%" y1="0%" x2="90%" y2="100%">
                <stop offset="0%" stopColor="#14532d" />
                <stop offset="45%" stopColor="#052e16" />
                <stop offset="100%" stopColor="#1a2e05" />
              </linearGradient>
              <linearGradient id={rim} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
              <linearGradient id={accent} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
            </>
          ) : (
            <>
              <linearGradient id={bg} x1="15%" y1="0%" x2="90%" y2="100%">
                <stop offset="0%" stopColor={`hsl(${hue} 55% 28%)`} />
                <stop offset="55%" stopColor={`hsl(${(hue + 40) % 360} 45% 14%)`} />
                <stop offset="100%" stopColor={`hsl(${(hue + 80) % 360} 40% 10%)`} />
              </linearGradient>
              <linearGradient id={rim} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={`hsl(${hue} 80% 72%)`} />
                <stop offset="100%" stopColor={`hsl(${(hue + 50) % 360} 70% 58%)`} />
              </linearGradient>
              <linearGradient id={accent} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor={`hsl(${hue} 70% 70%)`} />
              </linearGradient>
            </>
          )}
          <clipPath id={clip}>
            <path d="M32 2.5c9 4.4 18 5.6 24.2 6.6v26c0 16.2-11 28-24.2 32.4C18.8 63.1 7.8 51.3 7.8 35.1v-26C14 8.1 23 6.9 32 2.5Z" />
          </clipPath>
        </defs>

        {/* Slightly taller shield */}
        <path
          d="M32 2.5c9 4.4 18 5.6 24.2 6.6v26c0 16.2-11 28-24.2 32.4C18.8 63.1 7.8 51.3 7.8 35.1v-26C14 8.1 23 6.9 32 2.5Z"
          fill="none"
          stroke={`url(#${rim})`}
          strokeWidth="2.2"
        />
        <path
          d="M32 4.4c8.2 4 16.4 5.1 22 6v24.2c0 14.8-10 25.6-22 29.6C18 60.2 10 49.4 10 35.2V10.4c5.6-.9 13.8-2 22-6Z"
          fill={`url(#${bg})`}
        />

        <g clipPath={`url(#${clip})`}>
          {dorgeli ? (
            <>
              <path
                d="M10 36c6-4 12-2 18 1s12 4 18 0 8-6 10-4v26H10V36Z"
                fill="#22c55e"
                opacity="0.26"
              />
              <path
                d="M10 46c7-5 14-1 20 2s11 3 16-1 8-5 10-3v18H10V46Z"
                fill="#4ade80"
                opacity="0.2"
              />
              <circle cx="32" cy="23" r="8.2" fill={`url(#${accent})`} opacity="0.95" />
              <circle
                cx="32"
                cy="23"
                r="8.2"
                fill="none"
                stroke="#365314"
                strokeWidth="0.7"
                opacity="0.45"
              />
              <path
                d="M32 15.8c1.8 1.5 2.9 3.7 2.9 6.4S33.8 28.6 32 30.1c-1.8-1.5-2.9-3.7-2.9-6.4S30.2 17.3 32 15.8Z"
                fill="none"
                stroke="#3f6212"
                strokeWidth="0.75"
                opacity="0.55"
              />
              <text
                x="32"
                y="52.5"
                textAnchor="middle"
                fill="#ecfccb"
                fontSize="6.2"
                fontWeight="800"
                fontFamily="Segoe UI, Arial, sans-serif"
                letterSpacing="0.15"
              >
                Доргели
              </text>
            </>
          ) : (
            <>
              <circle cx="32" cy="26" r="11" fill={`url(#${accent})`} opacity="0.18" />
              <text
                x="32"
                y="31"
                textAnchor="middle"
                fill="#f8fafc"
                fontSize="14"
                fontWeight="900"
                fontFamily="Segoe UI, Arial, sans-serif"
                letterSpacing="0.5"
              >
                {initials.slice(0, 2)}
              </text>
              <text
                x="32"
                y="52"
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="5.2"
                fontWeight="700"
                fontFamily="Segoe UI, Arial, sans-serif"
                opacity="0.8"
              >
                {name.length > 10 ? `${name.slice(0, 9)}…` : name}
              </text>
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
