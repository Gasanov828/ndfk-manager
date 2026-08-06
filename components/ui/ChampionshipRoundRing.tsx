"use client";

import { useEffect, useState } from "react";

type ChampionshipRoundRingProps = {
  currentRound: number;
  totalRounds: number;
  percent: number;
};

export default function ChampionshipRoundRing({
  currentRound,
  totalRounds,
  percent,
}: ChampionshipRoundRingProps) {
  const size = 54;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const target = circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference;
    const frame = window.requestAnimationFrame(() => setOffset(target));
    return () => window.cancelAnimationFrame(frame);
  }, [percent, circumference]);

  return (
    <div
      className="championship-round-ring"
      aria-label={`Тур ${currentRound} из ${totalRounds}, ${percent}% сезона`}
    >
      <div className="championship-round-ring__graphic">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="championship-round-ring__svg"
          aria-hidden
        >
          <circle
            className="championship-round-ring__track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
          />
          <circle
            className="championship-round-ring__progress"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="championship-round-ring__center">
          <span className="championship-round-ring__round">
            {currentRound}/{totalRounds}
          </span>
          <span className="championship-round-ring__label">тур</span>
        </div>
      </div>
      <p className="championship-round-ring__percent">{percent}%</p>
    </div>
  );
}
