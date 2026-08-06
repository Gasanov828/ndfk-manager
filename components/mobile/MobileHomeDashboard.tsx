"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ClubLogo from "@/components/ClubLogo";
import { getRatingProgress } from "@/lib/ratingProgress";
import { formatOverallRating, formatVoteScore } from "@/lib/matchRatings";
import type { FormRatingPoint } from "@/lib/playerHomeDashboard";
import {
  PLAYER_PHOTO_UPDATED_EVENT,
  validatePlayerPhotoFile,
} from "@/lib/playerPhotos";
import { getFirstName, type PlayerWelcomeData } from "@/lib/playerStats";
import { getPositionStyle } from "@/lib/positionStyles";

export type MobileHomeDashboardProps = {
  playerWelcome: PlayerWelcomeData;
  formRatings: FormRatingPoint[];
  playedMatchesCount: number;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <span className="player-home-premium__status player-home-premium__status--ready">
        🟢 Готов
      </span>
    );
  }
  if (status === "maybe") {
    return (
      <span className="player-home-premium__status player-home-premium__status--maybe">
        🟡 Возможно
      </span>
    );
  }
  if (status === "absent") {
    return (
      <span className="player-home-premium__status player-home-premium__status--absent">
        🔴 Не сможет
      </span>
    );
  }
  return (
    <span className="player-home-premium__status player-home-premium__status--neutral">
      Нет статуса
    </span>
  );
}

function PremiumOvrPanel({
  rating,
  delta,
  animate,
}: {
  rating: number;
  delta: number | null;
  animate: boolean;
}) {
  const progress = getRatingProgress(rating);
  const showDelta = delta != null && delta !== 0;

  return (
    <div
      className={`player-home-premium__ovr ${animate ? "player-home-premium__ovr--animate" : ""}`}
    >
      <p className="player-home-premium__ovr-label">Рейтинг</p>
      <p className="player-home-premium__ovr-value">{formatOverallRating(rating)}</p>
      <p className="player-home-premium__ovr-tag">OVR</p>
      {showDelta ? (
        <p
          className={`player-home-premium__ovr-delta ${
            delta! > 0
              ? "player-home-premium__ovr-delta--up"
              : "player-home-premium__ovr-delta--down"
          }`}
        >
          {delta! > 0 ? "+" : "−"}
          {Math.abs(delta!)}
        </p>
      ) : null}
      <div className="player-home-premium__ovr-bar" aria-hidden>
        <div
          className={`player-home-premium__ovr-bar-fill ${
            animate ? "player-home-premium__ovr-bar-fill--animate" : ""
          }`}
          style={{ width: animate ? `${progress.pct}%` : "0%" }}
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
      <p className="player-home-premium__stat-value">{value}</p>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="player-home-premium__info">
      <p className="player-home-premium__info-label">
        {icon} {label}
      </p>
      <p className="player-home-premium__info-value">{value}</p>
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
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
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
}: MobileHomeDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const firstName = getFirstName(playerWelcome.name);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  const averageRating = useMemo(() => {
    if (formRatings.length === 0) return null;
    const sum = formRatings.reduce((acc, point) => acc + point.rating, 0);
    return sum / formRatings.length;
  }, [formRatings]);

  const lastFiveLabel = useMemo(() => {
    if (formRatings.length === 0) return "Нет данных";
    return formRatings
      .slice(-5)
      .map((point) => formatVoteScore(point.rating))
      .join(" · ");
  }, [formRatings]);

  const ratingChangeLabel = useMemo(() => {
    const delta = playerWelcome.ratingDelta;
    if (delta == null || delta === 0) return "Нет данных";
    const abs = Math.abs(delta);
    const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
    return `${delta > 0 ? "+" : "−"}${text}`;
  }, [playerWelcome.ratingDelta]);

  const averageLabel =
    averageRating != null ? formatVoteScore(averageRating) : "Нет данных";

  return (
    <section className="md:hidden">
      <article
        className={`player-home-premium ${mounted ? "player-home-premium--mounted" : ""}`}
      >
        <div className="player-home-premium__top">
          <PlayerHomePhoto
            name={playerWelcome.name}
            photoUrl={playerWelcome.photoUrl}
            positionGroup={playerWelcome.positionGroup}
          />

          <div className="player-home-premium__identity">
            <h1 className="player-home-premium__name">{firstName}</h1>
            <p className="player-home-premium__meta">
              {playerWelcome.position} • #{playerWelcome.rank}
            </p>
            <StatusBadge status={playerWelcome.status} />
          </div>

          <PremiumOvrPanel
            rating={playerWelcome.rating}
            delta={playerWelcome.ratingDelta}
            animate={mounted}
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
          <InfoTile icon="⭐" label="Средняя оценка" value={averageLabel} />
          <InfoTile icon="📈" label="Изменение" value={ratingChangeLabel} />
          <InfoTile icon="🔥" label="5 матчей" value={lastFiveLabel} />
          <InfoTile icon="❤️" label="Реакции" value="Нет данных" />
        </div>
      </article>
    </section>
  );
}
