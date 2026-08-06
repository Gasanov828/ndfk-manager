"use client";

import { useEffect, useRef, useState } from "react";
import { formatOverallRating } from "@/lib/matchRatings";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function formatCountDisplay(value: number, target: number): string {
  if (Number.isInteger(target)) {
    return String(Math.round(value));
  }
  return (Math.round(value * 10) / 10).toFixed(1);
}

function getStartRating(target: number): number {
  const floor = Math.floor(target);
  return Math.max(0, floor - 12);
}

type OvrCountUpProps = {
  rating: number;
  delayMs?: number;
  durationMs?: number;
  className?: string;
  onRisingChange?: (rising: boolean) => void;
  onValueChange?: (value: number) => void;
};

/** Counts OVR up to target on mount with a subtle glow blink. */
export default function OvrCountUp({
  rating,
  delayMs = 520,
  durationMs = 900,
  className = "",
  onRisingChange,
  onValueChange,
}: OvrCountUpProps) {
  const startValue = getStartRating(rating);
  const [phase, setPhase] = useState<"idle" | "rising" | "done">("idle");
  const [display, setDisplay] = useState(startValue);
  const onRisingChangeRef = useRef(onRisingChange);
  const onValueChangeRef = useRef(onValueChange);

  useEffect(() => {
    onRisingChangeRef.current = onRisingChange;
    onValueChangeRef.current = onValueChange;
  });

  useEffect(() => {
    onRisingChangeRef.current?.(phase === "rising");
  }, [phase]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const skip = reduced || Math.abs(startValue - rating) < 0.5;

    if (skip) {
      setDisplay(rating);
      setPhase("done");
      onValueChangeRef.current?.(rating);
      return;
    }

    let raf = 0;
    let cancelled = false;

    const delayTimer = window.setTimeout(() => {
      if (cancelled) return;

      setPhase("rising");
      setDisplay(startValue);
      onValueChangeRef.current?.(startValue);

      const t0 = performance.now();

      const tick = (now: number) => {
        if (cancelled) return;

        const t = Math.min(1, (now - t0) / durationMs);
        const eased = easeOutCubic(t);
        const current = startValue + (rating - startValue) * eased;
        setDisplay(current);
        onValueChangeRef.current?.(current);

        if (t < 1) {
          raf = window.requestAnimationFrame(tick);
        } else {
          setDisplay(rating);
          setPhase("done");
          onValueChangeRef.current?.(rating);
        }
      };

      raf = window.requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(delayTimer);
      window.cancelAnimationFrame(raf);
    };
  }, [rating, delayMs, durationMs, startValue]);

  const text =
    phase === "done"
      ? formatOverallRating(rating)
      : formatCountDisplay(display, rating);

  return (
    <span
      className={[
        "ui-ovr-count",
        phase === "idle" ? "ui-ovr-count--idle" : "",
        phase === "rising" ? "ui-ovr-count--rising" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
    >
      {text}
    </span>
  );
}
