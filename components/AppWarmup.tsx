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

const WARMUP_INTERVAL_MS = 2 * 60 * 1000;
const BUILD_CHECK_INTERVAL_MS = 15 * 1000;
const BUILD_STORAGE_KEY = "ndfk-app-build-id";

export default function AppWarmup() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const warmRoutes = () => {
      if (cancelled) return;
      void fetch("/api/warmup", { cache: "no-store" }).catch(() => {});
      for (const route of PREFETCH_ROUTES) {
        router.prefetch(route);
      }
    };

    const checkForNewBuild = async () => {
      if (cancelled) return;

      try {
        const response = await fetch("/api/build-id", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { buildId?: string };
        const nextBuildId = payload.buildId;
        if (!nextBuildId) return;

        const currentBuildId = sessionStorage.getItem(BUILD_STORAGE_KEY);
        if (currentBuildId && currentBuildId !== nextBuildId) {
          sessionStorage.setItem(BUILD_STORAGE_KEY, nextBuildId);
          window.location.reload();
          return;
        }

        sessionStorage.setItem(BUILD_STORAGE_KEY, nextBuildId);
      } catch {
        // ignore network errors during background checks
      }
    };

    warmRoutes();
    void checkForNewBuild();

    const warmupIntervalId = window.setInterval(warmRoutes, WARMUP_INTERVAL_MS);
    const buildIntervalId = window.setInterval(
      checkForNewBuild,
      BUILD_CHECK_INTERVAL_MS
    );

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      warmRoutes();
      void checkForNewBuild();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(warmupIntervalId);
      window.clearInterval(buildIntervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
