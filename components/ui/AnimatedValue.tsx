"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedValueProps = {
  value: string | number;
  className?: string;
};

/** Smooth crossfade when numeric/text stat values change. */
export default function AnimatedValue({ value, className = "" }: AnimatedValueProps) {
  const next = String(value);
  const [display, setDisplay] = useState(next);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const prev = useRef(next);

  useEffect(() => {
    if (next === prev.current) return;

    setPhase("out");
    const timer = window.setTimeout(() => {
      setDisplay(next);
      prev.current = next;
      setPhase("in");
    }, 120);

    return () => window.clearTimeout(timer);
  }, [next]);

  return (
    <span
      className={`ui-animated-value ${
        phase === "out" ? "ui-animated-value--out" : "ui-animated-value--in"
      } ${className}`}
    >
      {display}
    </span>
  );
}
