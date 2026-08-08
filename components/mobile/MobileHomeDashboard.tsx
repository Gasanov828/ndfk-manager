"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ClubLogo from "@/components/ClubLogo";
import PlayerMatchStatusControl from "@/components/PlayerMatchStatusControl";
import AnimatedValue from "@/components/ui/AnimatedValue";
import { getRatingProgress } from "@/lib/ratingProgress";
import { formatOverallRating, formatVoteScore, getMatchRatingColorClass } from "@/lib/matchRatings";
import type { FormRatingPoint } from "@/lib/playerHomeDashboard";
import {
  PLAYER_PHOTO_UPDATED_EVENT,
  validatePlayerPhotoFile,
} from "@/lib/playerPhotos";
import { type ReputationRow, PLAYER_REACTIONS } from "@/lib/playerReactions";
import { getFirstName, type PlayerWelcomeData } from "@/lib/playerStats";
import { getPositionStyle } from "@/lib/positionStyles";
import { useVisiblePhotoUrl } from "@/hooks/useVisiblePhotoUrl";

export type MobileHomeDashboardProps = {
  playerWelcome: PlayerWelcomeData;
  formRatings: FormRatingPoint[];
  playedMatchesCount: number;
  reputation: ReputationRow[];
};

function PremiumOvrPanel({
  rating,
  delta,
}: {
  rating: number;
  delta: number | null;
}) {
  const progress = getRatingProgress(rating);
  const showDelta = delta != null && delta !== 0;

  return (
    <div className="player-home-premium__ovr player-home-premium__ovr--motion-enter">
      <p className="player-home-premium__ovr-label">Рейтинг</p>
      <p className="player-home-premium__ovr-value ui-ovr-flash">
        {formatOverallRating(rating)}
      </p>
      <p className="player-home-premium__ovr-tag">OVR</p>
      {showDelta ? (
        <p
          className={`player-home-premium__ovr-delta ${
            delta! > 0
              ? "player-home-premium__ovr-delta--up"
              : "player-home-premium__ovr-delta--down"
          }`}
        >
          <AnimatedValue
            value={`${delta! > 0 ? "+" : "−"}${Math.abs(delta!)}`}
          />
        </p>
      ) : null}
      <div className="player-home-premium__ovr-bar" aria-hidden>
        <div
          className="player-home-premium__ovr-bar-fill"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
      <p className="player-home-premium__ovr-hint">
        до {progress.next} · {progress.remaining}
      </p>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="player-home-premium__stat">
      <p className="player-home-premium__stat-label">
        {icon} {label}
      </p>
      <p className="player-home-premium__stat-value">
        <AnimatedValue value={value} />
      </p>
    </div>
  );
}

const REACTION_PREVIEW = PLAYER_REACTIONS.filter((item) =>
  (["soul", "legend", "form"] as const).includes(item.code as "soul" | "legend" | "form")
);

function InsightEmpty() {
  return <span className="player-home-premium__insight-empty">—</span>;
}

function InsightTile({
  label,
  hint,
  title,
  className = "",
  children,
}: {
  label: string;
  hint: string;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`player-home-premium__info player-home-premium__info--compact ${className}`}
      title={title ?? `${label}: ${hint}`}
    >
      <p className="player-home-premium__info-label">{label}</p>
      {children}
      <p className="player-home-premium__info-hint">{hint}</p>
    </div>
  );
}

function LastFiveScores({ ratings }: { ratings: FormRatingPoint[] }) {
  const lastFive = ratings.slice(-5);
  if (lastFive.length === 0) return <InsightEmpty />;

  return (
    <div className="player-home-premium__scores">
      {lastFive.map((point, index) => (
        <span key={point.matchId} className="player-home-premium__scores-item">
          {index > 0 ? (
            <span className="player-home-premium__scores-sep" aria-hidden>
              |
            </span>
          ) : null}
          <span
            className={`player-home-premium__score ${getMatchRatingColorClass(point.rating)}`}
          >
            {formatVoteScore(point.rating)}
          </span>
        </span>
      ))}
    </div>
  );
}

function ReactionsPreview({ rows }: { rows: ReputationRow[] }) {
  const countByCode = new Map(rows.map((row) => [row.code, row.count]));
  const items = REACTION_PREVIEW.map((item) => ({
    ...item,
    count: countByCode.get(item.code) ?? 0,
  })).filter((item) => item.count > 0);

  if (items.length === 0) return <InsightEmpty />;

  return (
    <div className="player-home-premium__reactions">
      {items.map((item) => (
        <span
          key={item.code}
          className="player-home-premium__reaction-chip"
          title={item.label}
        >
          {item.emoji} {item.count}
        </span>
      ))}
    </div>
  );
}

function PlayerHomePhoto({
  name,
  photoUrl: initialPhotoUrl,
  positionGroup,
}: {
  name: string;
  photoUrl: string | null;
  positionGroup: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const visiblePhotoUrl = useVisiblePhotoUrl(photoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const positionStyle = getPositionStyle(positionGroup);

  useEffect(() => {
    setPhotoUrl(initialPhotoUrl);
  }, [initialPhotoUrl]);

  async function handleFile(file: File) {
    const validationError = validatePlayerPhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch("/api/me/photo", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        photoUrl?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить");
        return;
      }

      const nextUrl = payload.photoUrl ?? null;
      setPhotoUrl(nextUrl);
      window.dispatchEvent(new Event(PLAYER_PHOTO_UPDATED_EVENT));
    } catch {
      setError("Ошибка сети");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="player-home-premium__photo-wrap">
      <div className="player-home-premium__photo">
        {visiblePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={visiblePhotoUrl}
            alt={name}
            className="player-home-premium__photo-img"
          />
        ) : (
          <span
            className={`player-home-premium__photo-fallback ${positionStyle.badge}`}
          >
            {name.trim().charAt(0) || "?"}
          </span>
        )}
      </div>

      <button
        type="button"
        className="player-home-premium__photo-edit"
        disabled={uploading}
        aria-label="Изменить фото"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <span className="player-home-premium__photo-edit-spinner" aria-hidden />
        ) : (
          <svg viewBox="0 0 24 24" className="player-home-premium__photo-edit-icon" aria-hidden>
            <path
              d="M4 20h4l10.5-10.5a1.8 1.8 0 0 0 0-2.5l-2-2a1.8 1.8 0 0 0-2.5 0L4 15.5V20z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.5 6.5l4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <span className="player-home-premium__club-badge" aria-hidden>
        <ClubLogo size="sm" className="!h-5 !w-5" />
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {error ? (
        <p className="player-home-premium__photo-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function MobileHomeDashboard({
  playerWelcome,
  formRatings,
  playedMatchesCount,
  reputation,
}: MobileHomeDashboardProps) {
  const firstName = getFirstName(playerWelcome.name);

  const averageRating = useMemo(() => {
    if (formRatings.length === 0) return null;
    const sum = formRatings.reduce((acc, point) => acc + point.rating, 0);
    return sum / formRatings.length;
  }, [formRatings]);

  const ratingDelta = playerWelcome.ratingDelta;
  const hasRatingChange = ratingDelta != null && ratingDelta !== 0;
  const ratingChangeText = hasRatingChange
    ? (() => {
        const abs = Math.abs(ratingDelta!);
        const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
        return `${ratingDelta! > 0 ? "+" : "−"}${text}`;
      })()
    : null;

  return (
    <section className="md:hidden">
      <article className="player-home-premium player-home-premium--motion-enter">
        <div className="player-home-premium__top">
          <PlayerHomePhoto
            name={playerWelcome.name}
            photoUrl={playerWelcome.photoUrl}
            positionGroup={playerWelcome.positionGroup}
          />

          <div className="player-home-premium__identity">
            <div className="player-home-premium__name-wrap">
              <h1 className="player-home-premium__name">{firstName}</h1>
              <span className="player-home-premium__name-mirror" aria-hidden>
                {firstName}
              </span>
            </div>
            <p className="player-home-premium__meta">
              {playerWelcome.position} • #
              <AnimatedValue value={playerWelcome.rank} />
            </p>
            <PlayerMatchStatusControl
              playerId={playerWelcome.id}
              status={playerWelcome.status}
              variant="home"
            />
          </div>

          <PremiumOvrPanel
            rating={playerWelcome.rating}
            delta={playerWelcome.ratingDelta}
          />
        </div>

        <div className="player-home-premium__stats">
          <StatTile
            icon="🏆"
            label="Место"
            value={`${playerWelcome.rank} / ${playerWelcome.totalPlayers}`}
          />
          <StatTile icon="⚽" label="Матчи" value={String(playedMatchesCount)} />
          <StatTile icon="🥅" label="Голы" value={String(playerWelcome.goals)} />
          <StatTile
            icon="🎯"
            label="Ассисты"
            value={String(playerWelcome.assists)}
          />
        </div>

        <div className="player-home-premium__insights">
          <InsightTile label="⭐ Средняя" hint="оценка в матчах">
            {averageRating != null ? (
              <p className="player-home-premium__info-value player-home-premium__info-value--hero">
                <AnimatedValue value={formatVoteScore(averageRating)} />
              </p>
            ) : (
              <InsightEmpty />
            )}
          </InsightTile>

          <InsightTile label="📈 Изменение" hint="OVR за матч">
            {hasRatingChange ? (
              <p
                className={`player-home-premium__info-value player-home-premium__info-value--delta ${
                  ratingDelta! > 0
                    ? "player-home-premium__info-value--up"
                    : "player-home-premium__info-value--down"
                }`}
              >
                <AnimatedValue value={ratingChangeText!} />
              </p>
            ) : (
              <InsightEmpty />
            )}
          </InsightTile>

          <InsightTile
            label="🔥 Форма"
            hint="5 последних игр"
            className="player-home-premium__info--scores"
          >
            <LastFiveScores ratings={formRatings} />
          </InsightTile>

          <InsightTile label="❤️ Реакции" hint="от игроков команды">
            <ReactionsPreview rows={reputation} />
          </InsightTile>
        </div>
      </article>
    </section>
  );
}
