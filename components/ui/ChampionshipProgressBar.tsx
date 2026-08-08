"use client";

import { useEffect, useState } from "react";

export default function ChampionshipProgressBar({ percent }: { percent: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setWidth(Math.max(0, Math.min(100, percent)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [percent]);

  return (
    <div className="h-1 overflow-hidden rounded-full bg-white/10">
      <div
        className="championship-progress-fill h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
