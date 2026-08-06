"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const PREFETCH_ROUTES = [
  "/",
  "/lineup",
  "/players",
  "/me",
  "/championship",
  "/matches",
] as const;

const WARMUP_INTERVAL_MS = 4 * 60 * 1000;

export default function AppWarmup() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const warm = () => {
      if (cancelled) return;

      void fetch("/api/warmup", { cache: "no-store" }).catch(() => {});

      for (const route of PREFETCH_ROUTES) {
        router.prefetch(route);
      }
    };

    warm();

    const intervalId = window.setInterval(warm, WARMUP_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") warm();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
