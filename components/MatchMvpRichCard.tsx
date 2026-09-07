import type { ReactNode } from "react";
import Link from "next/link";
import PlayerPhotoImage from "@/components/PlayerPhotoImage";
import { getPlayerInitials } from "@/lib/playerPhotos";
import { formatMatchDate } from "@/lib/matches";
import {
  formatVoteCount,
  formatVotePercent,
  formatVoteScore,
  MAX_VOTE_SCORE,
  normalizeVoteScore,
  type MatchMvpInfo,
} from "@/lib/matchRatings";

const RADAR_LABELS = ["АТАКА", "ПАС", "ЗАЩИТА", "ФИЗИКА", "ДРИБЛИНГ"] as const;

function TrophyWatermark() {
  return (
    <svg
      viewBox="0 0 120 140"
      className="pointer-events-none absolute -right-2 top-1/2 h-[6.5rem] w-[5.5rem] -translate-y-1/2 opacity-[0.12] sm:h-[8rem] sm:w-[7rem] sm:opacity-[0.16]"
      aria-hidden
    >
      <defs>
        <linearGradient id="mvpTrophyChrome" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="40%" stopColor="#7dd3fc" />
          <stop offset="75%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="mvpTrophyShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M28 22h64c2 0 4 2 4 4v10c0 22-14 40-32 46-18-6-32-24-32-46V26c0-2 2-4 4-4Z"
        fill="url(#mvpTrophyChrome)"
      />
      <path
        d="M36 28h30c1 0 2 1 2 2v8c0 14-8 26-18 30-10-4-18-16-18-30v-8c0-1 1-2 2-2Z"
        fill="url(#mvpTrophyShine)"
      />
      <path
        d="M28 30c-12 2-18 12-16 24 2 10 10 16 20 16"
        fill="none"
        stroke="url(#mvpTrophyChrome)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M92 30c12 2 18 12 16 24-2 10-10 16-20 16"
        fill="none"
        stroke="url(#mvpTrophyChrome)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect x="52" y="82" width="16" height="18" rx="3" fill="url(#mvpTrophyChrome)" />
      <path d="M40 100h40l6 12H34l6-12Z" fill="url(#mvpTrophyChrome)" />
      <rect x="30" y="112" width="60" height="10" rx="4" fill="url(#mvpTrophyChrome)" />
      <path
        d="M60 40l3.2 6.4 7 .9-5.1 4.9 1.3 7-6.4-3.5-6.4 3.5 1.3-7-5.1-4.9 7-.9Z"
        fill="#f8fafc"
        opacity="0.8"
      />
    </svg>
  );
}

function MvpRadar({ value, tone }: { value: number; tone: "gold" | "live" }) {
  const score = normalizeVoteScore(value);
  const scale = Math.max(0.38, Math.min(1, score / MAX_VOTE_SCORE));
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
    tone === "gold" ? "rgba(186,230,253,0.9)" : "rgba(45,212,191,0.95)";
  const fill =
    tone === "gold" ? "rgba(56,189,248,0.2)" : "rgba(20,184,166,0.32)";

  return (
    <svg
      viewBox="0 0 100 90"
      className={`h-[3rem] w-[3rem] sm:h-[4rem] sm:w-[4rem] ${
        tone === "gold" ? "text-sky-200" : "text-teal-300"
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
                ? "rgba(186,230,253,0.55)"
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
  /** Premium wide panel — only for home page MVP */
  variant?: "default" | "premium";
  /** Позиция игрока (players.position) — реальное поле, показываем если известно */
  playerPosition?: string | null;
  /** Счёт матча (matches.ndfk_goals/opponent_goals) — только если оба известны */
  ndfkGoals?: number | null;
  opponentGoals?: number | null;
};

function InfoChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "chrome" | "teal" | "sky" | "rose" | "lime";
}) {
  const styles = {
    chrome: "border-white/12 bg-white/[0.05] text-slate-50",
    teal: "border-teal-400/30 bg-teal-500/10 text-teal-50",
    sky: "border-sky-400/30 bg-sky-500/10 text-sky-50",
    rose: "border-rose-400/30 bg-rose-500/10 text-rose-50",
    lime: "border-lime-400/30 bg-lime-500/10 text-lime-50",
  }[accent];
  const labelStyles = {
    chrome: "text-sky-100/55",
    teal: "text-teal-200/65",
    sky: "text-sky-200/65",
    rose: "text-rose-200/65",
    lime: "text-lime-200/65",
  }[accent];

  return (
    <div
      className={`flex min-w-0 flex-col items-center justify-center rounded-md border px-1 py-1 text-center backdrop-blur-[2px] ${styles}`}
      title={`${label}: ${value}`}
    >
      <p
        className={`w-full truncate text-[7px] font-bold uppercase tracking-[0.08em] ${labelStyles}`}
      >
        {label}
      </p>
      <p className="mt-0.5 w-full truncate text-[11px] font-extrabold tabular-nums leading-none">
        {value}
      </p>
    </div>
  );
}

function formatVotesLabel(mvp: MatchMvpInfo): string {
  const received = Math.max(0, Number(mvp.voteCount) || 0);
  const total = Math.max(0, Number(mvp.voterTotal) || 0);
  if (total > 0 && total !== received) {
    return `${received}/${total}`;
  }
  return formatVoteCount(received);
}

function formatStatValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return String(Math.max(0, Math.floor(Number(value))));
}

/** "+0.8" / "−0.3" — тот же формат, что и в PlayerOvrPanel/HomePlayerHero */
function formatDelta(delta: number): string {
  const abs = Math.abs(delta);
  const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return `${delta > 0 ? "+" : "−"}${text}`;
}

function MvpCrownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M3.5 8.2 7 11l3.4-4.9c.3-.5 1-.5 1.3 0L15 11l3.5-2.8c.5-.4 1.2 0 1.1.6l-1.2 8.6a1 1 0 0 1-1 .86H4.6a1 1 0 0 1-1-.86L2.4 8.8c-.1-.6.6-1 1.1-.6Z" />
    </svg>
  );
}

function MvpBallIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.6 15.35 10l-1.28 4.05H9.93L8.65 10Z" fill="currentColor" stroke="none" />
      <path d="M12 7.6V4.6M15.35 10l3.1-1.85M14.07 14.05l1.9 3.05M9.93 14.05l-1.9 3.05M8.65 10l-3.1-1.85" />
    </svg>
  );
}

function MvpTargetIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <circle cx="12" cy="12" r="7.8" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MvpTrendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 16.5 9.2 11l3.6 3.6L20 7.2" />
      <path d="M14.4 7h5.6v5.6" />
    </svg>
  );
}

function MvpVotersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="7.6" r="3" />
      <path d="M3.6 19v-1.4a4 4 0 0 1 4-4h2.8a4 4 0 0 1 4 4V19" />
      <circle cx="17.3" cy="8.6" r="2.3" />
      <path d="M15.2 11.4c2.2.2 3.9 1.9 3.9 4.1V19" />
    </svg>
  );
}

type MvpAwardStat = {
  key: string;
  icon: ReactNode;
  label: string;
  value: string;
  positive?: boolean;
};

function PremiumHomeMvpCard({
  mvp,
  photoUrl,
  matchGoals,
  matchAssists,
  personal,
  className,
  playerPosition,
  ndfkGoals,
  opponentGoals,
}: Omit<MatchMvpRichCardProps, "variant">) {
  const resolvedPhoto = photoUrl ?? mvp.photoUrl ?? null;
  const goalsRaw = matchGoals ?? mvp.matchGoals;
  const assistsRaw = matchAssists ?? mvp.matchAssists;
  const initials = getPlayerInitials(mvp.playerName) || "?";
  const profileHref = `/players/${mvp.playerId}`;
  const score = normalizeVoteScore(mvp.avgScore);
  const scorePct = Math.max(
    0,
    Math.min(100, Math.round((score / MAX_VOTE_SCORE) * 100))
  );
  const subtitle = personal ? "Ваш вклад в матч" : "Лучший игрок матча";
  const titleLabel = personal ? "Ваш MVP" : "MVP матча";

  const hasScoreline = ndfkGoals != null && opponentGoals != null;

  const voteCount = Math.max(0, Number(mvp.voteCount) || 0);
  const voterTotal =
    mvp.voterTotal != null && Number(mvp.voterTotal) > 0
      ? Math.max(0, Number(mvp.voterTotal))
      : null;
  const votePct =
    voterTotal != null ? Math.round((voteCount / voterTotal) * 100) : null;

  const ratingDelta =
    mvp.ratingDelta != null &&
    Number.isFinite(Number(mvp.ratingDelta)) &&
    Number(mvp.ratingDelta) !== 0
      ? Number(mvp.ratingDelta)
      : null;

  const stats: MvpAwardStat[] = [
    {
      key: "goals",
      icon: <MvpBallIcon className="h-full w-full" />,
      label: "Голы",
      value: formatStatValue(goalsRaw),
    },
    {
      key: "assists",
      icon: <MvpTargetIcon className="h-full w-full" />,
      label: "Ассисты",
      value: formatStatValue(assistsRaw),
    },
  ];
  if (ratingDelta != null) {
    stats.push({
      key: "delta",
      icon: <MvpTrendIcon className="h-full w-full" />,
      label: "Рейтинг",
      value: `${formatDelta(ratingDelta)} OVR`,
      positive: ratingDelta > 0,
    });
  }

  return (
    <div className={`mvp-award relative z-[1] ${className}`}>
      <div className="mvp-award__top">
        <p className="mvp-award__badge">
          <MvpCrownIcon className="mvp-award__badge-icon" />
          <span>{titleLabel}</span>
        </p>
        <div className="mvp-award__matchmeta">
          {hasScoreline ? (
            <p className="mvp-award__scoreline">
              НДФК {ndfkGoals} : {opponentGoals} {mvp.opponent || ""}
            </p>
          ) : (
            <p className="mvp-award__scoreline mvp-award__scoreline--muted">
              vs {mvp.opponent || "—"}
            </p>
          )}
          <p className="mvp-award__date">
            {mvp.matchDate ? formatMatchDate(mvp.matchDate) : "—"}
          </p>
        </div>
      </div>

      <div className="mvp-award__hero">
        <Link
          href={profileHref}
          className="mvp-award__photo-link group outline-none focus-visible:ring-2 focus-visible:ring-[#FFD75A]/50"
        >
          <div className="mvp-award__photo-frame">
            <div className="mvp-award__photo">
              <PlayerPhotoImage
                photoUrl={resolvedPhoto}
                alt={mvp.playerName}
                className="h-full w-full object-cover object-[center_18%]"
                fallback={
                  <span className="mvp-award__photo-fallback">{initials}</span>
                }
              />
            </div>
            <span className="mvp-award__photo-crown" aria-hidden>
              <MvpCrownIcon className="h-full w-full" />
            </span>
          </div>
        </Link>

        <div className="mvp-award__identity min-w-0">
          <Link
            href={profileHref}
            className="mvp-award__name outline-none hover:brightness-110 focus-visible:underline"
          >
            {mvp.playerName || "—"}
          </Link>
          <p className="mvp-award__role">{subtitle}</p>
          {playerPosition ? (
            <p className="mvp-award__position">{playerPosition}</p>
          ) : null}
        </div>

        <div className="mvp-award__ring" aria-hidden={false}>
          <svg viewBox="0 0 74 74" className="mvp-award__ring-svg">
            <circle
              cx="37"
              cy="37"
              r="32"
              className="mvp-award__ring-track"
              fill="none"
              strokeWidth="5"
            />
            <circle
              cx="37"
              cy="37"
              r="32"
              className="mvp-award__ring-fill"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 32}
              strokeDashoffset={2 * Math.PI * 32 * (1 - scorePct / 100)}
              transform="rotate(-90 37 37)"
            />
          </svg>
          <div className="mvp-award__ring-inner">
            <span className="mvp-award__ring-value">
              {score > 0 ? formatVoteScore(score) : "—"}
            </span>
            <span className="mvp-award__ring-max">/{MAX_VOTE_SCORE}</span>
          </div>
        </div>
      </div>

      {voterTotal != null ? (
        <div className="mvp-award__votes">
          <div className="mvp-award__votes-row">
            <MvpVotersIcon className="mvp-award__votes-icon" />
            <span className="mvp-award__votes-text">
              {voteCount} из {voterTotal} голосов
            </span>
            {votePct != null ? (
              <span className="mvp-award__votes-pct">{votePct}%</span>
            ) : null}
          </div>
          {votePct != null ? (
            <div
              className="mvp-award__votes-bar"
              role="progressbar"
              aria-valuenow={votePct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Проголосовало ${votePct}%`}
            >
              <span
                className="mvp-award__votes-bar-fill"
                style={{ width: `${votePct}%` }}
              />
            </div>
          ) : null}
        </div>
      ) : voteCount > 0 ? (
        <p className="mvp-award__votes-fallback">
          <MvpVotersIcon className="mvp-award__votes-icon" />
          {formatVoteCount(voteCount)}
        </p>
      ) : null}

      <div
        className="mvp-award__stats"
        style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
      >
        {stats.map((stat) => (
          <div key={stat.key} className="mvp-award__stat">
            <span className="mvp-award__stat-icon" aria-hidden>
              {stat.icon}
            </span>
            <p className="mvp-award__stat-label">{stat.label}</p>
            <p
              className={`mvp-award__stat-value${
                stat.positive ? " mvp-award__stat-value--positive" : ""
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MatchMvpRichCard({
  mvp,
  photoUrl = null,
  matchGoals = null,
  matchAssists = null,
  personal = false,
  className = "",
  variant = "default",
}: MatchMvpRichCardProps) {
  if (variant === "premium") {
    return (
      <PremiumHomeMvpCard
        mvp={mvp}
        photoUrl={photoUrl}
        matchGoals={matchGoals}
        matchAssists={matchAssists}
        personal={personal}
        className={className}
      />
    );
  }

  const isGold = mvp.isConfirmedMvp || personal;
  const tone = isGold ? "gold" : "live";
  const resolvedPhoto = photoUrl ?? mvp.photoUrl ?? null;
  const resolvedGoals = matchGoals ?? mvp.matchGoals ?? 0;
  const resolvedAssists = matchAssists ?? mvp.matchAssists ?? 0;
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

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isGold && (
        <>
          <div
            className="pointer-events-none absolute -left-6 -top-8 h-24 w-24 rounded-full bg-cyan-400/25 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-4 top-0 h-28 w-28 rounded-full bg-indigo-400/25 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-0 left-1/3 h-16 w-40 rounded-full bg-sky-300/15 blur-xl"
            aria-hidden
          />
          <TrophyWatermark />
        </>
      )}

      <div className="relative z-[1] space-y-1.5">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <span
            className={
              isGold
                ? "mvp-status-badge shrink-0"
                : "inline-flex shrink-0 items-center rounded-full bg-teal-400/25 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-teal-50 ring-1 ring-teal-300/50"
            }
          >
            {isGold ? "★ " : "★ "}
            {statusLabel}
          </span>
          {!isGold && (
            <span className="shrink-0 rounded-md bg-rose-500/15 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-rose-200 ring-1 ring-rose-400/30">
              live
            </span>
          )}
          <span
            className={`min-w-0 truncate text-[10px] font-medium ${
              isGold ? "text-cyan-100/70" : "text-sky-200/55"
            }`}
          >
            {metaLine}
          </span>
        </div>

        <Link
          href={profileHref}
          className={`group block min-w-0 overflow-hidden rounded-lg border px-2 py-1.5 outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300/50 ${
            isGold
              ? "border-cyan-200/20 bg-gradient-to-r from-white/[0.12] via-cyan-400/[0.1] to-indigo-400/[0.06] hover:border-cyan-200/40"
              : "border-teal-400/25 bg-gradient-to-r from-teal-500/15 via-sky-500/8 to-rose-500/5 hover:border-teal-300/40"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`shrink-0 rounded-full p-[2px] transition group-hover:brightness-110 ${
                isGold
                  ? "mvp-avatar-ring bg-gradient-to-br from-white via-cyan-300 to-indigo-400"
                  : "bg-gradient-to-br from-teal-300/80 via-sky-400/40 to-rose-400/45 shadow-[0_0_12px_rgba(45,212,191,0.35)]"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-950 sm:h-10 sm:w-10">
                <PlayerPhotoImage
                  photoUrl={resolvedPhoto}
                  alt={mvp.playerName}
                  className="h-full w-full object-cover object-[center_18%]"
                  fallback={
                    <span className="text-xs font-bold text-slate-200">
                      {initials}
                    </span>
                  }
                />
              </div>
            </div>

            <div className="min-w-0 flex-1 overflow-hidden pb-2.5">
              <div className="mvp-mirror-name max-w-full">
                <p
                  className={`mvp-mirror-name__text text-[13px] font-black leading-tight sm:text-[15px] ${
                    isGold ? "" : "text-white"
                  }`}
                >
                  {mvp.playerName}
                </p>
                {isGold ? (
                  <span className="mvp-mirror-name__reflection" aria-hidden>
                    {mvp.playerName}
                  </span>
                ) : null}
              </div>
              <p
                className={`truncate text-[10px] font-semibold leading-tight ${
                  isGold ? "text-cyan-200/75" : "text-teal-100/55"
                }`}
              >
                {mvp.isConfirmedMvp || personal
                  ? "лучший игрок матча"
                  : "лидер оценок"}
              </p>
            </div>

            <div className="hidden shrink-0 sm:block">
              <MvpRadar value={mvp.avgScore} tone={tone} />
            </div>

            <div className="shrink-0 text-right">
              <div className="flex items-baseline justify-end gap-0.5">
                <span
                  className={`text-[1.55rem] font-black leading-none sm:text-[1.75rem] ${
                    isGold ? "rating-gold-mvp" : "rating-teal-live"
                  }`}
                >
                  {formatVoteScore(mvp.avgScore)}
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    isGold ? "text-cyan-200/55" : "text-teal-200/50"
                  }`}
                >
                  /{MAX_VOTE_SCORE}
                </span>
              </div>
              <p
                className={`mt-0.5 text-[8px] font-bold uppercase tracking-wide ${
                  isGold ? "text-indigo-200/70" : "text-teal-200/60"
                }`}
              >
                {formatVotePercent(mvp.avgScore)}%
              </p>
            </div>
          </div>
        </Link>

        <div className="grid grid-cols-4 gap-1">
          <InfoChip
            label="Голы"
            value={String(resolvedGoals)}
            accent={isGold ? "chrome" : "lime"}
          />
          <InfoChip
            label="Пасы"
            value={String(resolvedAssists)}
            accent={isGold ? "chrome" : "teal"}
          />
          <InfoChip
            label="Голоса"
            value={formatVotesLabel(mvp)}
            accent={isGold ? "sky" : "sky"}
          />
          <InfoChip
            label="Статус"
            value={mvp.isConfirmedMvp || personal ? "Итог" : "Идёт"}
            accent={isGold ? "chrome" : "rose"}
          />
        </div>
      </div>
    </div>
  );
}
