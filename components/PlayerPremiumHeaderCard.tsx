"use client";

import Link from "next/link";
import ClubLogo from "@/components/ClubLogo";
import PlayerPhotoUpload from "@/components/PlayerPhotoUpload";
import { getRatingProgress } from "@/lib/ratingProgress";
import { formatOverallRating, formatVoteScore } from "@/lib/matchRatings";
import {
  getFirstName,
  type PlayerWelcomeData,
} from "@/lib/playerStats";
import { getPositionStyle } from "@/lib/positionStyles";

type PlayerPremiumHeaderCardProps = {
  welcome: PlayerWelcomeData;
  photoUrl?: string | null;
  variant?: "full" | "compact";
  href?: string | null;
  allowPhotoEdit?: boolean;
  onPhotoUpdated?: (photoUrl: string | null) => void;
  className?: string;
};

function formatDelta(delta: number): string {
  const abs = Math.abs(delta);
  const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return `${delta > 0 ? "+" : "−"}${text}`;
}

function getFormShort(status: string): string {
  if (status === "ready") return "Хорошая";
  if (status === "maybe") return "Средняя";
  if (status === "absent") return "Слабая";
  return "—";
}

function getLineupNumber(lineupLabel: string | null): string {
  if (!lineupLabel) return "—";
  const match = lineupLabel.match(/(\d+)/);
  if (match) return match[1];
  if (/вратар/i.test(lineupLabel)) return "1";
  return "—";
}

function MiniTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="pp-header__tile">
      <span className="pp-header__tile-icon" aria-hidden>
        {icon}
      </span>
      <span className="pp-header__tile-label">{label}</span>
      <span className="pp-header__tile-value">{value}</span>
    </div>
  );
}

function FooterBlock({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="pp-header__footer-block">
      <span className="pp-header__footer-icon" aria-hidden>
        {icon}
      </span>
      <span className="pp-header__footer-label">{label}</span>
      <span className="pp-header__footer-value">{value}</span>
      {hint ? <span className="pp-header__footer-hint">{hint}</span> : null}
    </div>
  );
}

function PhotoSection({
  welcome,
  photoUrl,
  allowPhotoEdit,
  onPhotoUpdated,
  compact,
}: {
  welcome: PlayerWelcomeData;
  photoUrl: string | null;
  allowPhotoEdit?: boolean;
  onPhotoUpdated?: (photoUrl: string | null) => void;
  compact?: boolean;
}) {
  const positionStyle = getPositionStyle(welcome.positionGroup);
  const number = getLineupNumber(welcome.lineupLabel);

  if (allowPhotoEdit) {
    return (
      <div className={`pp-header__photo-wrap ${compact ? "pp-header__photo-wrap--compact" : ""}`}>
        <div className="pp-header__photo-ring pp-header__photo-ring--pulse">
          <PlayerPhotoUpload
            playerId={welcome.id}
            name={welcome.name}
            photoUrl={photoUrl}
            positionGroup={welcome.positionGroup}
            size={compact ? "sm" : "md"}
            layout="inline"
            onPhotoUpdated={onPhotoUpdated}
          />
        </div>
        <div className="pp-header__club-badge">
          <ClubLogo size="sm" />
        </div>
        {number !== "—" ? (
          <span className="pp-header__number-badge">{number}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`pp-header__photo-wrap ${compact ? "pp-header__photo-wrap--compact" : ""}`}>
      <div className="pp-header__photo-ring pp-header__photo-ring--pulse">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="pp-header__photo" />
        ) : (
          <div
            className={`pp-header__photo pp-header__photo--fallback ${positionStyle.badge}`}
          >
            {welcome.name.trim().charAt(0) || "?"}
          </div>
        )}
      </div>
      <div className="pp-header__club-badge">
        <ClubLogo size="sm" />
      </div>
      {number !== "—" ? (
        <span className="pp-header__number-badge">{number}</span>
      ) : null}
    </div>
  );
}

function OvrPanel({
  rating,
  delta,
  compact,
}: {
  rating: number;
  delta: number | null;
  compact?: boolean;
}) {
  const progress = getRatingProgress(rating);
  const showDelta = delta != null && delta !== 0;

  return (
    <div className={`pp-header__ovr ${compact ? "pp-header__ovr--compact" : ""}`}>
      <p className="pp-header__ovr-label">Рейтинг</p>
      <p className="pp-header__ovr-value pp-header__ovr-value--pulse">
        {formatOverallRating(rating)}
      </p>
      <div
        className="pp-header__ovr-bar"
        role="progressbar"
        aria-valuenow={progress.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Прогресс до ${progress.next}`}
      >
        <div
          className="pp-header__ovr-bar-fill pp-header__ovr-bar-fill--animate"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
      <p className="pp-header__ovr-meta">
        До {progress.next} · {progress.remaining}
      </p>
      {showDelta ? (
        <p
          className={`pp-header__ovr-delta ${
            delta! > 0 ? "pp-header__ovr-delta--up" : "pp-header__ovr-delta--down"
          }`}
        >
          {delta! > 0 ? "▲" : "▼"} {formatDelta(delta!)} за последний матч
        </p>
      ) : null}
    </div>
  );
}

export default function PlayerPremiumHeaderCard({
  welcome,
  photoUrl: photoUrlProp,
  variant = "full",
  href = null,
  allowPhotoEdit = false,
  onPhotoUpdated,
  className = "",
}: PlayerPremiumHeaderCardProps) {
  const compact = variant === "compact";
  const photoUrl = photoUrlProp ?? welcome.photoUrl;
  const firstName = getFirstName(welcome.name);
  const formShort = getFormShort(welcome.status);
  const lineupNumber = getLineupNumber(welcome.lineupLabel);

  const subtitleParts = [
    welcome.position,
    welcome.lineupLabel,
    `${welcome.rank}/${welcome.totalPlayers}`,
  ].filter(Boolean);

  const seasonFooterValue =
    welcome.seasonRating != null && welcome.seasonRating > 0
      ? `ср. ${welcome.seasonRating.toFixed(1)}`
      : welcome.seasonLevel != null
        ? `Ур. ${welcome.seasonLevel}`
        : "—";

  const seasonFooterHint =
    welcome.seasonXpIntoLevel != null && welcome.seasonXpForNext != null
      ? `${welcome.seasonXpIntoLevel}/${welcome.seasonXpForNext} XP`
      : null;

  const streakFooterValue =
    welcome.matchVoteScore != null
      ? formatVoteScore(welcome.matchVoteScore)
      : welcome.ratingDelta != null && welcome.ratingDelta !== 0
        ? formatDelta(welcome.ratingDelta)
        : "—";

  const streakFooterHint =
    welcome.lastMatchLabel ??
    (welcome.matchVoteScore != null ? "последний матч" : null);

  const card = (
    <article
      className={`pp-header pp-header--enter ${compact ? "pp-header--compact" : ""} ${className}`}
    >
      <div className="pp-header__main">
        <PhotoSection
          welcome={welcome}
          photoUrl={photoUrl}
          allowPhotoEdit={allowPhotoEdit}
          onPhotoUpdated={onPhotoUpdated}
          compact={compact}
        />

        <div className="pp-header__center">
          <h2 className="pp-header__name">{firstName}</h2>
          <p className="pp-header__subtitle">{subtitleParts.join(" · ")}</p>

          {!compact ? (
            <div className="pp-header__tiles">
              <MiniTile
                icon="◎"
                label="Позиция"
                value={welcome.positionGroup}
              />
              <MiniTile icon="#" label="Номер" value={lineupNumber} />
              <MiniTile
                icon="★"
                label="Место OVR"
                value={`${welcome.rank}/${welcome.totalPlayers}`}
              />
              <MiniTile icon="↗" label="Форма" value={formShort} />
            </div>
          ) : (
            <p className="pp-header__compact-meta">
              {welcome.positionGroup}
              {lineupNumber !== "—" ? ` · #${lineupNumber}` : ""}
              {" · "}
              {formShort}
              {" · "}
              ⚽ {welcome.goals} / ◆ {welcome.assists}
            </p>
          )}
        </div>

        <OvrPanel
          rating={welcome.rating}
          delta={welcome.ratingDelta}
          compact={compact}
        />
      </div>

      {!compact ? (
        <div className="pp-header__footer">
          <FooterBlock
            icon="📈"
            label="Форма"
            value={formShort}
            hint={
              welcome.status === "ready"
                ? "Готов к игре"
                : welcome.status === "maybe"
                  ? "Под вопросом"
                  : welcome.status === "absent"
                    ? "Не придёт"
                    : null
            }
          />
          <span className="pp-header__footer-divider" aria-hidden />
          <FooterBlock
            icon="⚽"
            label="Голы / Пасы"
            value={`${welcome.goals} / ${welcome.assists}`}
          />
          <span className="pp-header__footer-divider" aria-hidden />
          <FooterBlock
            icon="👟"
            label="Сезон"
            value={seasonFooterValue}
            hint={seasonFooterHint}
          />
          <span className="pp-header__footer-divider" aria-hidden />
          <FooterBlock
            icon="🔥"
            label="Последний матч"
            value={streakFooterValue}
            hint={streakFooterHint}
          />
        </div>
      ) : null}
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="pp-header__link block min-w-0">
        {card}
      </Link>
    );
  }

  return card;
}
