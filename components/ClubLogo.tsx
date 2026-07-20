"use client";

import { useId } from "react";

type ClubLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZE = {
  sm: "h-10 w-10",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  xl: "h-[4.25rem] w-[4.25rem]",
} as const;

/** Герб ФК Нижний Дженгутай — щит, мяч, название, 2026 */
export default function ClubLogo({ className = "", size = "md" }: ClubLogoProps) {
  const uid = useId().replace(/:/g, "");
  const bg = `ndBg-${uid}`;
  const rim = `ndRim-${uid}`;
  const shine = `ndShine-${uid}`;
  const ball = `ndBall-${uid}`;
  const clip = `ndClip-${uid}`;

  return (
    <div
      className={`club-logo relative shrink-0 ${SIZE[size]} ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" role="img">
        <defs>
          <linearGradient id={bg} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="45%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#0c4a6e" />
          </linearGradient>
          <linearGradient id={rim} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="45%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id={shine} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={ball} cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>
          <clipPath id={clip}>
            <path d="M32 2.5c9 4.4 18 5.6 24.2 6.6v24c0 15.4-11 26.2-24.2 30.4C18.8 59.3 7.8 48.5 7.8 33.1v-24C14 8.1 23 6.9 32 2.5Z" />
          </clipPath>
        </defs>

        {/* Outer glow rim */}
        <path
          d="M32 2.5c9 4.4 18 5.6 24.2 6.6v24c0 15.4-11 26.2-24.2 30.4C18.8 59.3 7.8 48.5 7.8 33.1v-24C14 8.1 23 6.9 32 2.5Z"
          fill="none"
          stroke={`url(#${rim})`}
          strokeWidth="2.4"
          opacity="0.95"
        />

        {/* Shield fill */}
        <path
          d="M32 4.2c8.2 4 16.4 5.1 22 6v22.4c0 14-10 23.8-22 27.6C18 56.4 10 46.6 10 32.6V10.2c5.6-.9 13.8-2 22-6Z"
          fill={`url(#${bg})`}
        />
        <path
          d="M32 4.2c8.2 4 16.4 5.1 22 6v22.4c0 14-10 23.8-22 27.6C18 56.4 10 46.6 10 32.6V10.2c5.6-.9 13.8-2 22-6Z"
          fill={`url(#${shine})`}
        />

        {/* Inner thin rim */}
        <path
          d="M32 6.8c7.4 3.5 14.6 4.5 19.6 5.3v20.2c0 12.4-8.8 21.2-19.6 24.8C21.2 53.5 12.4 44.7 12.4 32.3V12.1c5-.8 12.2-1.8 19.6-5.3Z"
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="0.9"
        />

        <g clipPath={`url(#${clip})`}>
          {/* Soft ambient lights */}
          <circle cx="44" cy="16" r="11" fill="#67e8f9" opacity="0.1" />
          <circle cx="20" cy="22" r="9" fill="#a78bfa" opacity="0.1" />

          {/* Subtle mountain silhouette behind ball */}
          <path
            d="M10 40 20 28l6 7 6-10 7 9 6-6 10 8v8H10Z"
            fill="#22d3ee"
            opacity="0.12"
          />
          <path
            d="M10 44 18 34l5.5 6 5-8 5.5 7 5.5-6L48 40l7 3v7H10Z"
            fill="#67e8f9"
            opacity="0.1"
          />

          {/* Soccer ball */}
          <circle cx="32" cy="21.5" r="9.2" fill={`url(#${ball})`} />
          <circle
            cx="32"
            cy="21.5"
            r="9.2"
            fill="none"
            stroke="#0f172a"
            strokeWidth="0.7"
            opacity="0.35"
          />

          {/* Ball panels */}
          <path
            d="M32 12.7 35.1 16.8 32 19 28.9 16.8Z"
            fill="#0f172a"
            opacity="0.88"
          />
          <path
            d="M23.3 19 27.6 17.4 29 21.2 25.8 24.1 22.7 21.7Z"
            fill="#0f172a"
            opacity="0.82"
          />
          <path
            d="M40.7 19 36.4 17.4 35 21.2 38.2 24.1 41.3 21.7Z"
            fill="#0f172a"
            opacity="0.82"
          />
          <path
            d="M26 26.6 29 23.8 32 25.6 35 23.8 38 26.6 35.8 30 32 30.7 28.2 30Z"
            fill="#0f172a"
            opacity="0.78"
          />

          {/* Seam lines */}
          <path
            d="M32 12.7v6.3M28.9 16.8 25.8 24.1M35.1 16.8 38.2 24.1M29 23.8 28.2 30M35 23.8 35.8 30"
            fill="none"
            stroke="#334155"
            strokeWidth="0.5"
            opacity="0.55"
          />

          {/* Club name */}
          <text
            x="32"
            y="40.8"
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="4.6"
            fontWeight="800"
            fontFamily="Segoe UI, Arial, sans-serif"
            letterSpacing="0.1"
          >
            Нижний
          </text>
          <text
            x="32"
            y="46.6"
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="4.6"
            fontWeight="800"
            fontFamily="Segoe UI, Arial, sans-serif"
            letterSpacing="0.05"
          >
            Дженгутай
          </text>

          {/* Year */}
          <text
            x="32"
            y="53.4"
            textAnchor="middle"
            fill="#a5f3fc"
            fontSize="5.2"
            fontWeight="700"
            fontFamily="Segoe UI, Arial, sans-serif"
            letterSpacing="1.1"
            opacity="0.9"
          >
            2026
          </text>
        </g>
      </svg>
    </div>
  );
}
