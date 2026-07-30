"use client";

import { useEffect, useState } from "react";
import type { BlackGoldProgress } from "@/lib/championship/blackGold";
import { getPlayerInitials } from "@/lib/playerPhotos";

export default function BlackGoldPrizeCard({
  progress,
  highlightReveal = false,
}: {
  progress: BlackGoldProgress;
  highlightReveal?: boolean;
}) {
  const [revealed, setRevealed] = useState(
    progress.unlocked && !highlightReveal
  );
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (!progress.unlocked) {
      setRevealed(false);
      setFlipping(false);
      return;
    }
    if (!highlightReveal) {
      setRevealed(true);
      return;
    }
    const start = window.setTimeout(() => setFlipping(true), 180);
    const done = window.setTimeout(() => {
      setRevealed(true);
      setFlipping(false);
    }, 980);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(done);
    };
  }, [progress.unlocked, highlightReveal]);

  const percent = Math.round(
    (progress.completedCount / Math.max(1, progress.totalCount)) * 100
  );
  const initials = getPlayerInitials(progress.playerName) || "?";
  const showFace = revealed || flipping;

  return (
    <article
      className={`black-gold-shell ${
        progress.unlocked ? "black-gold-shell--unlocked" : ""
      }`}
    >
      <div
        className={`black-gold-stage ${flipping ? "black-gold-stage--flip" : ""} ${
          revealed ? "black-gold-stage--open" : ""
        }`}
      >
        <div className="black-gold-card__aura" aria-hidden />

        {/* Locked back */}
        <div
          className={`black-gold-face black-gold-face--back ${
            showFace ? "black-gold-face--hidden" : ""
          }`}
        >
          <div className="black-gold-card__frame black-gold-card__frame--locked">
            <p className="black-gold-card__mystery">????</p>
            <p className="black-gold-card__rarity">Мифический приз</p>
            <p className="mt-2 text-[11px] text-amber-100/55">
              Закрытая карточка · нельзя выпасть случайно
            </p>
          </div>
        </div>

        {/* Unlocked gold player card */}
        <div
          className={`black-gold-face black-gold-face--front ${
            showFace ? "black-gold-face--visible" : ""
          }`}
        >
          <div className="black-gold-player">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cards/black-gold-card-bg.png"
              alt=""
              className="black-gold-player__bg"
              aria-hidden
            />
            <div className="black-gold-player__vignette" aria-hidden />

            <div className="black-gold-player__photo-wrap">
              {progress.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={progress.photoUrl}
                  alt={progress.playerName}
                  className="black-gold-player__photo"
                />
              ) : (
                <div className="black-gold-player__photo black-gold-player__photo--empty">
                  <span>{initials}</span>
                </div>
              )}
              <div className="black-gold-player__photo-glow" aria-hidden />
            </div>

            <div className="black-gold-player__meta">
              <p className="black-gold-card__rarity">Мифическая</p>
              <h3 className="black-gold-player__name">{progress.playerName}</h3>
              <p className="black-gold-player__subtitle">💀 Чёрное Золото</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/55">
              Прогресс
            </p>
            <p className="text-sm font-semibold text-amber-50">
              {progress.playerName}
            </p>
          </div>
          <p className="text-[12px] font-bold text-amber-200">
            {progress.completedCount}/{progress.totalCount} · {percent}%
          </p>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-amber-400/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-300 to-yellow-200 transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="space-y-1.5">
          {progress.challenges.map((challenge) => (
            <li
              key={challenge.id}
              className={`flex items-start gap-2 rounded-xl px-2.5 py-2 text-[12px] ring-1 ${
                challenge.done
                  ? "bg-amber-400/10 text-amber-50 ring-amber-300/25"
                  : "bg-black/25 text-slate-400 ring-white/5"
              }`}
            >
              <span className="mt-0.5 w-4 shrink-0 text-center font-bold">
                {challenge.done ? "☑" : "☐"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-inherit">
                  {challenge.icon} {challenge.title}
                </span>
                <span className="mt-0.5 block text-[11px] opacity-80">
                  {challenge.description}
                </span>
                <span className="mt-0.5 block text-[10px] text-amber-200/50">
                  {challenge.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
