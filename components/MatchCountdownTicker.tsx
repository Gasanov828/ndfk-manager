"use client";

import { useEffect, useState } from "react";
import {
  formatMatchCountdownLabel,
  type MatchDateTimeInput,
} from "@/lib/matchCountdown";

export default function MatchCountdownTicker({
  match,
  initialLabel,
  className = "font-mono text-[11px] font-bold tabular-nums text-orange-100",
}: {
  match: MatchDateTimeInput;
  initialLabel: string;
  className?: string;
}) {
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    const tick = () => {
      const next = formatMatchCountdownLabel(match);
      if (!next) return;
      setLabel((prev) => (prev === next ? prev : next));
    };

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [match]);

  return <span className={className}>{label}</span>;
}
