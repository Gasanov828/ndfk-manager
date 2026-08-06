"use client";

import ClubLogo from "@/components/ClubLogo";
import OvrCountUp from "@/components/ui/OvrCountUp";
import { getRatingProgress } from "@/lib/ratingProgress";
import { formatVoteScore } from "@/lib/matchRatings";
import { getFirstName, type PlayerWelcomeData } from "@/lib/playerStats";
import { getPositionStyle } from "@/lib/positionStyles";
import { useCallback, useEffect, useState } from "react";

type HomePlayerHeroProps = {
  welcome: PlayerWelcomeData;
  photoUrl?: string | null;
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
    <div className="home-hero__tile">
      <span className="home-hero__tile-icon" aria-hidden>
        {icon}
      </span>
      <span className="home-hero__tile-label">{label}</span>
      <span className="home-hero__tile-value">{value}</span>
    </div>
  );
}

export default function HomePlayerHero({
  welcome,
  photoUrl: photoUrlProp,
}: HomePlayerHeroProps) {
  const photoUrl = photoUrlProp ?? welcome.photoUrl;
  const firstName = getFirstName(welcome.name);
  const formShort = getFormShort(welcome.status);
  const lineupNumber = getLineupNumber(welcome.lineupLabel);
  const positionStyle = getPositionStyle(welcome.positionGroup);
  const progress = getRatingProgress(welcome.rating);
  const [barPct, setBarPct] = useState(0);
  const showDelta =
    welcome.ratingDelta != null && welcome.ratingDelta !== 0;

  const handleOvrValueChange = useCallback((value: number) => {
    setBarPct(getRatingProgress(value).pct);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBarPct((prev) => prev || progress.pct);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [progress.pct]);

  const matchRatingValue =
    welcome.matchVoteScore != null
      ? formatVoteScore(welcome.matchVoteScore)
      : "—";

  const lineupPlace = welcome.lineupLabel ?? "—";

  const subtitleParts = [
    welcome.position,
    lineupNumber !== "—" ? `#${lineupNumber}` : null,
    `${welcome.rank}/${welcome.totalPlayers} OVR`,
  ].filter(Boolean);

  return (
    <section className="home-hero home-hero--enter mb-2 sm:mb-4">
      <div className="home-hero__main">
        <div className="home-hero__photo-wrap">
          <div className="home-hero__photo-ring home-hero__photo-ring--pulse">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="home-hero__photo" />
            ) : (
              <div
                className={`home-hero__photo home-hero__photo--fallback ${positionStyle.badge}`}
              >
                {welcome.name.trim().charAt(0) || "?"}
              </div>
            )}
          </div>
          <div className="home-hero__club-badge">
            <ClubLogo size="sm" />
          </div>
          {lineupNumber !== "—" ? (
            <span className="home-hero__number-badge">{lineupNumber}</span>
          ) : null}
        </div>

        <div className="home-hero__center">
          <h2 className="home-hero__name">{firstName}</h2>
          <p className="home-hero__subtitle">{subtitleParts.join(" · ")}</p>

          <div className="home-hero__tiles">
            <StatTile icon="🟢" label="Форма" value={formShort} />
            <StatTile icon="⚽" label="Голы" value={String(welcome.goals)} />
            <StatTile icon="🎯" label="Передачи" value={String(welcome.assists)} />
            <StatTile icon="⭐" label="Рейтинг" value={matchRatingValue} />
            <StatTile icon="👕" label="Позиция" value={welcome.positionGroup} />
            <StatTile icon="🛡" label="Состав" value={lineupPlace} />
          </div>
        </div>

        <div className="home-hero__ovr">
          <p className="home-hero__ovr-label">Рейтинг</p>
          <p className="home-hero__ovr-value">
            <OvrCountUp rating={welcome.rating} onValueChange={handleOvrValueChange} />
          </p>
          <div
            className="home-hero__ovr-bar"
            role="progressbar"
            aria-valuenow={barPct || progress.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Прогресс до ${progress.next}`}
          >
            <div
              className="home-hero__ovr-bar-fill ui-ovr-bar-fill--rise"
              style={{ width: `${barPct}%` }}
            />
          </div>
          <p className="home-hero__ovr-meta">
            До {progress.next} · {progress.remaining}
          </p>
          {showDelta ? (
            <p
              className={`home-hero__ovr-delta ${
                welcome.ratingDelta! > 0
                  ? "home-hero__ovr-delta--up"
                  : "home-hero__ovr-delta--down"
              }`}
            >
              {welcome.ratingDelta! > 0 ? "▲" : "▼"}{" "}
              {formatDelta(welcome.ratingDelta!)} за последний матч
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
