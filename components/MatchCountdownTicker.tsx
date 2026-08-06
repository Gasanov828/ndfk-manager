"use client";

import { useEffect, useState } from "react";
import {
  getCountdownParts,
  getMatchDateTime,
  padTime,
  type MatchDateTimeInput,
} from "@/lib/matchCountdown";

function formatCountdownLabel(
  target: Date,
  countdown: ReturnType<typeof getCountdownParts>
): string {
  if (countdown.expired) return "скоро старт";

  const days =
    countdown.days > 0 ? `${countdown.days}д ` : "";
  return `${days}${padTime(countdown.hours)}:${padTime(countdown.minutes)}:${padTime(countdown.seconds)}`;
}

export default function MatchCountdownTicker({
  match,
  className = "font-mono text-[11px] font-bold tabular-nums text-orange-100",
}: {
  match: MatchDateTimeInput;
  className?: string;
}) {
  const target = getMatchDateTime(match);
  const [label, setLabel] = useState(() => {
    if (!target) return null;
    return formatCountdownLabel(target, getCountdownParts(target));
  });

  useEffect(() => {
    if (!target) return;

    const tick = () => {
      const next = formatCountdownLabel(target, getCountdownParts(target));
      setLabel((prev) => (prev === next ? prev : next));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [target?.getTime()]);

  if (!label) return null;

  return <span className={className}>{label}</span>;
}
