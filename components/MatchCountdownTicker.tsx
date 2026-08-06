"use client";

import { useEffect, useState } from "react";
import {
  getCountdownParts,
  getMatchDateTime,
  padTime,
  type MatchDateTimeInput,
} from "@/lib/matchCountdown";

function CountdownSegment({
  value,
  pulse,
}: {
  value: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={`countdown-segment ${pulse ? "countdown-segment--pulse" : ""}`}
    >
      {value}
    </span>
  );
}

export default function MatchCountdownTicker({
  match,
  className = "font-mono text-[11px] font-bold tabular-nums text-orange-100",
}: {
  match: MatchDateTimeInput;
  initialLabel?: string;
  className?: string;
}) {
  const target = getMatchDateTime(match);
  const [parts, setParts] = useState(() =>
    target ? getCountdownParts(target) : null
  );
  const [secPulse, setSecPulse] = useState(false);

  useEffect(() => {
    if (!target) return;

    let lastSecond = getCountdownParts(target).seconds;

    const tick = () => {
      const next = getCountdownParts(target);

      if (next.seconds !== lastSecond) {
        lastSecond = next.seconds;
        setSecPulse(true);
        window.setTimeout(() => setSecPulse(false), 160);
      }

      setParts((prev) => {
        if (
          !prev ||
          prev.expired !== next.expired ||
          prev.days !== next.days ||
          prev.hours !== next.hours ||
          prev.minutes !== next.minutes ||
          prev.seconds !== next.seconds
        ) {
          return next;
        }
        return prev;
      });
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [target?.getTime()]);

  if (!parts || parts.expired) {
    return <span className={className}>скоро старт</span>;
  }

  return (
    <span className={`countdown-ticker ${className}`}>
      {parts.days > 0 ? <span>{parts.days}д </span> : null}
      <CountdownSegment value={padTime(parts.hours)} />
      <span className="countdown-ticker__colon">:</span>
      <CountdownSegment value={padTime(parts.minutes)} />
      <span className="countdown-ticker__colon">:</span>
      <CountdownSegment value={padTime(parts.seconds)} pulse={secPulse} />
    </span>
  );
}
