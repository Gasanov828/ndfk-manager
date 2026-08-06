"use client";

import { useEffect, useRef, useState } from "react";
import { formatOverallRating } from "@/lib/matchRatings";

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function formatCountDisplay(value: number, target: number): string {
  if (Number.isInteger(target)) {
    return String(Math.round(value));
  }
  return (Math.round(value * 10) / 10).toFixed(1);
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
  delayMs = 320,
  durationMs = 720,
  className = "",
  onRisingChange,
  onValueChange,
}: OvrCountUpProps) {
  const startValue = Math.max(0, Math.floor(rating) - 4);
  const [display, setDisplay] = useState(startValue);
  const [rising, setRising] = useState(false);
  const [done, setDone] = useState(false);
  const prevRating = useRef(rating);
  const onRisingChangeRef = useRef(onRisingChange);
  const onValueChangeRef = useRef(onValueChange);

  useEffect(() => {
    onRisingChangeRef.current = onRisingChange;
    onValueChangeRef.current = onValueChange;
  });

  useEffect(() => {
    onRisingChangeRef.current?.(rising);
  }, [rising]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || startValue >= rating) {
      setDisplay(rating);
      setDone(true);
      onValueChangeRef.current?.(rating);
      return;
    }

    let raf = 0;
    const delayTimer = window.setTimeout(() => {
      setRising(true);
      setDisplay(startValue);
      onValueChangeRef.current?.(startValue);
      const start = performance.now();

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = easeOutExpo(t);
        const current = startValue + (rating - startValue) * eased;
        setDisplay(current);
        onValueChangeRef.current?.(current);

        if (t < 1) {
          raf = window.requestAnimationFrame(tick);
        } else {
          setDisplay(rating);
          setRising(false);
          setDone(true);
          onValueChangeRef.current?.(rating);
        }
      };

      raf = window.requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(delayTimer);
      window.cancelAnimationFrame(raf);
    };
  }, [rating, delayMs, durationMs, startValue]);

  useEffect(() => {
    if (!done || prevRating.current === rating) return;
    prevRating.current = rating;
    setDisplay(rating);
  }, [rating, done]);

  const text = done
    ? formatOverallRating(rating)
    : formatCountDisplay(display, rating);

  return (
    <span
      className={`${rising ? "player-home-premium__ovr-value--rising" : ""} ${className}`}
    >
      {text}
    </span>
  );
}
