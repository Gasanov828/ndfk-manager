import Link from "next/link";
import PlayerPhotoImage from "@/components/PlayerPhotoImage";
import { getPlayerInitials } from "@/lib/playerPhotos";
import { formatMatchDate } from "@/lib/matches";
import {
  formatOverallRating,
  formatVoteCount,
  formatVotePercent,
  formatVoteScore,
  MAX_VOTE_SCORE,
  normalizeVoteScore,
  type MatchMvpInfo,
} from "@/lib/matchRatings";

const RADAR_LABELS = ["АТАКА", "ПАС", "ЗАЩИТА", "ФИЗИКА", "ДРИБЛИНГ"] as const;

function MvpCrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M3.5 8.2 7 11l3.4-4.9c.3-.5 1-.5 1.3 0L15 11l3.5-2.8c.5-.4 1.2 0 1.1.6l-1.2 8.6a1 1 0 0 1-1 .86H4.6a1 1 0 0 1-1-.86L2.4 8.8c-.1-.6.6-1 1.1-.6Z" />
    </svg>
  );
}

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
  /** Итоговый счёт матча — только для premium-варианта на главной */
  ndfkGoals?: number | null;
  opponentGoals?: number | null;
  /** Сезонная статистика игрока MVP — только для premium-варианта на главной */
  playerRating?: number | null;
  playerTotalGoals?: number | null;
  playerTotalAssists?: number | null;
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

function PremiumStat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="mvp-home-premium__stat min-w-0">
      <span className="mvp-home-premium__stat-icon" aria-hidden>
        {icon}
      </span>
      <p className="mvp-home-premium__stat-label">{label}</p>
      <p className="mvp-home-premium__stat-value">{value}</p>
    </div>
  );
}

function PremiumHomeMvpCard({
  mvp,
  photoUrl,
  matchGoals,
  matchAssists,
  personal,
  className,
  ndfkGoals,
  opponentGoals,
  playerRating,
  playerTotalGoals,
  playerTotalAssists,
}: Omit<MatchMvpRichCardProps, "variant">) {
  const resolvedPhoto = photoUrl ?? mvp.photoUrl ?? null;
  const hasScoreLine =
    ndfkGoals != null &&
    opponentGoals != null &&
    Number.isFinite(Number(ndfkGoals)) &&
    Number.isFinite(Number(opponentGoals));
  const hasPlayerStatsLine =
    playerRating != null &&
    playerTotalGoals != null &&
    playerTotalAssists != null &&
    Number.isFinite(Number(playerRating)) &&
    Number.isFinite(Number(playerTotalGoals)) &&
    Number.isFinite(Number(playerTotalAssists));
  const goalsRaw = matchGoals ?? mvp.matchGoals;
  const assistsRaw = matchAssists ?? mvp.matchAssists;
  const initials = getPlayerInitials(mvp.playerName) || "?";
  const profileHref = `/players/${mvp.playerId}`;
  const score = normalizeVoteScore(mvp.avgScore);
  const progressPct = Math.max(
    0,
    Math.min(100, Math.round((score / MAX_VOTE_SCORE) * 100))
  );
  const statusValue =
    mvp.isConfirmedMvp || personal ? "Итог" : "Идёт";
  const subtitle =
    mvp.isConfirmedMvp || personal
      ? "Лучший игрок матча"
      : "Лидер оценок";
  const titleLabel = personal
    ? "Ваш MVP"
    : mvp.isConfirmedMvp
      ? "MVP матча"
      : "Лидер оценок";

  return (
    <div className={`mvp-home-premium__inner relative z-[1] ${className}`}>
      <div className="mvp-home-premium__top">
        <p className="mvp-home-premium__badge">
          <MvpCrownIcon className="mvp-home-premium__badge-icon" />
          <span>{titleLabel}</span>
        </p>
        <p className="mvp-home-premium__meta">
          {hasScoreLine ? (
            <>
              НДФК{" "}
              <span className="mvp-home-premium__meta-score">
                {ndfkGoals}:{opponentGoals}
              </span>{" "}
              <span className="mvp-home-premium__meta-opponent">
                {mvp.opponent || "—"}
              </span>
            </>
          ) : (
            <>
              VS {mvp.opponent || "—"}
              <span aria-hidden> · </span>
              {mvp.matchDate ? formatMatchDate(mvp.matchDate) : "—"}
            </>
          )}
        </p>
      </div>

      <div className="mvp-home-premium__hero">
        <Link
          href={profileHref}
          className="mvp-home-premium__photo-link group outline-none focus-visible:ring-2 focus-visible:ring-[#FFD75A]/50"
        >
          <div className="mvp-home-premium__photo-frame">
            <div className="mvp-home-premium__photo">
              <PlayerPhotoImage
                photoUrl={resolvedPhoto}
                alt={mvp.playerName}
                className="h-full w-full object-cover object-[center_18%]"
                fallback={
                  <span className="text-lg font-black text-slate-200">
                    {initials}
                  </span>
                }
              />
            </div>
          </div>
        </Link>

        <div className="mvp-home-premium__identity min-w-0">
          <Link
            href={profileHref}
            className="mvp-home-premium__name outline-none hover:brightness-110 focus-visible:underline"
          >
            {mvp.playerName || "—"}
          </Link>
          <p className="mvp-home-premium__role">{subtitle}</p>
          {hasPlayerStatsLine && (
            <p className="mvp-home-premium__player-stats">
              <span className="mvp-home-premium__stat-rating">
                ★ {formatOverallRating(Number(playerRating))}
              </span>
              <span aria-hidden> · </span>
              <span className="mvp-home-premium__stat-goals">
                {playerTotalGoals} ⚽
              </span>
              <span aria-hidden> · </span>
              <span className="mvp-home-premium__stat-assists">
                {playerTotalAssists} 👟
              </span>
            </p>
          )}
        </div>

        <div className="mvp-home-premium__score block">
          <div className="mvp-home-premium__score-row">
            <span className="mvp-home-premium__score-value">
              {score > 0 ? formatVoteScore(score) : "—"}
            </span>
            <span className="mvp-home-premium__score-max">/{MAX_VOTE_SCORE}</span>
          </div>
          <div
            className="mvp-home-premium__bar"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Оценка ${progressPct}%`}
          >
            <span
              className="mvp-home-premium__bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mvp-home-premium__score-sub">
            {score > 0 ? `${formatVotePercent(score)}%` : "—"}
          </p>
        </div>
      </div>

      <div className="mvp-home-premium__stats">
        <PremiumStat icon="⚽" label="Голы" value={formatStatValue(goalsRaw)} />
        <PremiumStat
          icon="👟"
          label="Пасы"
          value={formatStatValue(assistsRaw)}
        />
        <PremiumStat icon="🎙" label="Голоса" value={formatVotesLabel(mvp)} />
        <PremiumStat icon="🏆" label="Статус" value={statusValue} />
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
  ndfkGoals = null,
  opponentGoals = null,
  playerRating = null,
  playerTotalGoals = null,
  playerTotalAssists = null,
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
        ndfkGoals={ndfkGoals}
        opponentGoals={opponentGoals}
        playerRating={playerRating}
        playerTotalGoals={playerTotalGoals}
        playerTotalAssists={playerTotalAssists}
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
