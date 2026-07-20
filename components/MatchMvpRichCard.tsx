import Link from "next/link";
import { getPlayerInitials } from "@/lib/playerPhotos";
import { formatMatchDate } from "@/lib/matches";
import {
  formatVoteCount,
  formatVoteScore,
  MAX_VOTE_SCORE,
  type MatchMvpInfo,
} from "@/lib/matchRatings";

const RADAR_LABELS = ["АТАКА", "ПАС", "ЗАЩИТА", "ФИЗИКА", "ДРИБЛИНГ"] as const;

function TrophyWatermark() {
  return (
    <svg
      viewBox="0 0 120 140"
      className="pointer-events-none absolute -right-3 top-1/2 h-[7.5rem] w-[6.5rem] -translate-y-1/2 opacity-[0.2] sm:h-[9rem] sm:w-[7.5rem] sm:opacity-[0.26]"
      aria-hidden
    >
      <defs>
        <linearGradient id="mvpTrophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="mvpTrophyShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff7ed" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M28 22h64c2 0 4 2 4 4v10c0 22-14 40-32 46-18-6-32-24-32-46V26c0-2 2-4 4-4Z"
        fill="url(#mvpTrophyGold)"
      />
      <path
        d="M36 28h30c1 0 2 1 2 2v8c0 14-8 26-18 30-10-4-18-16-18-30v-8c0-1 1-2 2-2Z"
        fill="url(#mvpTrophyShine)"
      />
      <path
        d="M28 30c-12 2-18 12-16 24 2 10 10 16 20 16"
        fill="none"
        stroke="url(#mvpTrophyGold)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M92 30c12 2 18 12 16 24-2 10-10 16-20 16"
        fill="none"
        stroke="url(#mvpTrophyGold)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect x="52" y="82" width="16" height="18" rx="3" fill="url(#mvpTrophyGold)" />
      <path d="M40 100h40l6 12H34l6-12Z" fill="url(#mvpTrophyGold)" />
      <rect x="30" y="112" width="60" height="10" rx="4" fill="url(#mvpTrophyGold)" />
      <path
        d="M60 40l3.2 6.4 7 .9-5.1 4.9 1.3 7-6.4-3.5-6.4 3.5 1.3-7-5.1-4.9 7-.9Z"
        fill="#fff7ed"
        opacity="0.85"
      />
    </svg>
  );
}

function MvpRadar({ value, tone }: { value: number; tone: "gold" | "live" }) {
  const scale = Math.max(0.38, Math.min(1, value / 10));
  const points = [
    [50, 12 + (1 - scale) * 18],
    [82 - (1 - scale) * 22, 38],
    [68 - (1 - scale) * 12, 76 - (1 - scale) * 18],
    [32 + (1 - scale) * 12, 76 - (1 - scale) * 18],
    [18 + (1 - scale) * 22, 38],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  const labelPositions = [
    { x: 50, y: 8, anchor: "middle" as const },
    { x: 90, y: 36, anchor: "start" as const },
    { x: 73, y: 82, anchor: "middle" as const },
    { x: 27, y: 82, anchor: "middle" as const },
    { x: 10, y: 36, anchor: "end" as const },
  ];

  const stroke =
    tone === "gold" ? "rgba(251,191,36,0.95)" : "rgba(45,212,191,0.95)";
  const fill =
    tone === "gold" ? "rgba(245,158,11,0.32)" : "rgba(20,184,166,0.32)";

  return (
    <svg
      viewBox="0 0 100 90"
      className={`h-[3.4rem] w-[3.4rem] sm:h-[4.25rem] sm:w-[4.25rem] ${
        tone === "gold" ? "text-amber-300" : "text-teal-300"
      }`}
      aria-hidden
    >
      {RADAR_LABELS.map((label, index) => {
        const pos = labelPositions[index];
        return (
          <text
            key={label}
            x={pos.x}
            y={pos.y}
            textAnchor={pos.anchor}
            fill={
              tone === "gold"
                ? "rgba(253,230,138,0.55)"
                : "rgba(153,246,228,0.55)"
            }
            fontSize="5"
            fontWeight="700"
          >
            {label}
          </text>
        );
      })}
      <polygon
        points="50,8 88,36 73,80 27,80 12,36"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.22"
      />
      <polygon
        points="50,22 74,40 65,68 35,68 26,40"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.16"
      />
      <polygon points={points} fill={fill} stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

export type MatchMvpRichCardProps = {
  mvp: MatchMvpInfo;
  photoUrl?: string | null;
  matchGoals?: number | null;
  matchAssists?: number | null;
  personal?: boolean;
  className?: string;
};

function InfoChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "amber" | "teal" | "sky" | "rose" | "lime";
}) {
  const styles = {
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-50",
    teal: "border-teal-400/30 bg-teal-500/10 text-teal-50",
    sky: "border-sky-400/30 bg-sky-500/10 text-sky-50",
    rose: "border-rose-400/30 bg-rose-500/10 text-rose-50",
    lime: "border-lime-400/30 bg-lime-500/10 text-lime-50",
  }[accent];
  const labelStyles = {
    amber: "text-amber-200/60",
    teal: "text-teal-200/60",
    sky: "text-sky-200/60",
    rose: "text-rose-200/60",
    lime: "text-lime-200/60",
  }[accent];

  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-1.5 rounded-md border px-1.5 py-1 ${styles}`}
    >
      <p
        className={`shrink-0 text-[8px] font-bold uppercase tracking-[0.1em] ${labelStyles}`}
      >
        {label}
      </p>
      <p className="truncate text-[11px] font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function formatStatCount(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${value} ${many}`;
  if (mod10 === 1) return `${value} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${value} ${few}`;
  return `${value} ${many}`;
}

export default function MatchMvpRichCard({
  mvp,
  photoUrl = null,
  matchGoals = null,
  matchAssists = null,
  personal = false,
  className = "",
}: MatchMvpRichCardProps) {
  const isGold = mvp.isConfirmedMvp || personal;
  const tone = isGold ? "gold" : "live";
  const resolvedPhoto = photoUrl ?? mvp.photoUrl ?? null;
  const resolvedGoals = matchGoals ?? mvp.matchGoals ?? null;
  const resolvedAssists = matchAssists ?? mvp.matchAssists ?? null;
  const initials = getPlayerInitials(mvp.playerName) || "?";
  const profileHref = `/players/${mvp.playerId}`;

  const statusLabel = personal
    ? "Ваш MVP"
    : mvp.isConfirmedMvp
      ? "MVP матча"
      : "Лидер оценок";

  const metaLine = personal
    ? `Это вы · vs ${mvp.opponent}`
    : `vs ${mvp.opponent} · ${formatMatchDate(mvp.matchDate)}`;

  const matchStatsParts: string[] = [];
  if (resolvedGoals != null && resolvedGoals > 0) {
    matchStatsParts.push(formatStatCount(resolvedGoals, "гол", "гола", "голов"));
  }
  if (resolvedAssists != null && resolvedAssists > 0) {
    matchStatsParts.push(
      formatStatCount(resolvedAssists, "ассист", "ассиста", "ассистов")
    );
  }
  const matchStatsLine =
    matchStatsParts.length > 0 ? matchStatsParts.join(" · ") : null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isGold && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_45%,rgba(251,191,36,0.22),transparent_55%)]"
            aria-hidden
          />
          <TrophyWatermark />
        </>
      )}

      <div className="relative z-[1] space-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] ${
              isGold
                ? "bg-gradient-to-r from-amber-300/30 to-yellow-500/20 text-amber-50 ring-1 ring-amber-200/50"
                : "bg-teal-400/20 text-teal-50 ring-1 ring-teal-300/40"
            }`}
          >
            {isGold ? "🏆 " : "★ "}
            {statusLabel}
          </span>
          {!isGold && (
            <span className="rounded-md bg-rose-500/15 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-rose-200 ring-1 ring-rose-400/30">
              live
            </span>
          )}
          <span
            className={`min-w-0 truncate text-[10px] ${
              isGold ? "text-amber-100/55" : "text-sky-200/55"
            }`}
          >
            {metaLine}
          </span>
        </div>

        <Link
          href={profileHref}
          className={`group block rounded-lg border px-2 py-1.5 outline-none transition focus-visible:ring-2 focus-visible:ring-amber-300/50 ${
            isGold
              ? "border-amber-300/40 bg-gradient-to-r from-amber-400/18 via-yellow-500/10 to-transparent hover:border-amber-200/55"
              : "border-teal-400/25 bg-gradient-to-r from-teal-500/15 via-sky-500/8 to-rose-500/5 hover:border-teal-300/40"
          }`}
        >
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-1.5 sm:gap-2">
            <div
              className={`rounded-full p-[1.5px] transition group-hover:brightness-110 ${
                isGold
                  ? "bg-gradient-to-br from-amber-300/80 via-yellow-400/40 to-amber-600/50 shadow-[0_0_12px_rgba(250,204,21,0.4)]"
                  : "bg-gradient-to-br from-teal-300/80 via-sky-400/40 to-rose-400/45 shadow-[0_0_12px_rgba(45,212,191,0.35)]"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-950 sm:h-11 sm:w-11">
                {resolvedPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvedPhoto}
                    alt={mvp.playerName}
                    className="h-full w-full object-cover object-[center_18%]"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-200 sm:text-sm">
                    {initials}
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <p
                className={`truncate text-[13px] font-black leading-tight sm:text-[15px] ${
                  isGold ? "text-amber-50" : "text-white"
                }`}
              >
                {mvp.playerName}
              </p>
              <p
                className={`truncate text-[10px] leading-tight ${
                  isGold ? "text-amber-100/55" : "text-teal-100/55"
                }`}
              >
                {mvp.isConfirmedMvp || personal ? "MVP" : "лидер"}
                {matchStatsLine ? ` · ${matchStatsLine}` : ""}
              </p>
            </div>

            <MvpRadar value={mvp.avgScore} tone={tone} />

            <div className="shrink-0 text-right">
              <div className="flex items-baseline justify-end gap-0.5">
                <span
                  className={`text-[1.65rem] font-black leading-none sm:text-3xl ${
                    isGold ? "rating-gold-mvp" : "rating-teal-live"
                  }`}
                >
                  {formatVoteScore(mvp.avgScore)}
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    isGold ? "text-amber-200/55" : "text-teal-200/50"
                  }`}
                >
                  /{MAX_VOTE_SCORE}
                </span>
              </div>
            </div>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-1">
          <InfoChip
            label="Голоса"
            value={formatVoteCount(mvp.voteCount)}
            accent={isGold ? "amber" : "sky"}
          />
          <InfoChip
            label="Статус"
            value={mvp.isConfirmedMvp || personal ? "Итог" : "Идёт"}
            accent={isGold ? "amber" : "rose"}
          />
        </div>
      </div>
    </div>
  );
}
