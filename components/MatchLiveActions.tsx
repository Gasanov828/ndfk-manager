"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import type { Match } from "@/lib/matches";
import { startLiveMatch } from "@/lib/startLiveMatch";

type MatchLiveActionsProps = {
  match: Match;
  isLive?: boolean;
  className?: string;
  compact?: boolean;
};

export default function MatchLiveActions({
  match,
  isLive = false,
  className = "",
  compact = false,
}: MatchLiveActionsProps) {
  const router = useRouter();
  const { isAdmin } = useAuthProfile();
  const [busy, setBusy] = useState(false);

  if (!isAdmin || match.is_played) return null;

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    const result = await startLiveMatch(match.id);
    setBusy(false);

    if (!result.ok) {
      alert(result.error ?? "Не удалось начать матч");
      return;
    }

    router.push("/live");
  }

  if (isLive || match.is_live) {
    return (
      <Link
        href="/live"
        className={`inline-flex items-center justify-center rounded-xl border border-red-400/35 bg-red-500/15 font-bold text-red-50 transition hover:bg-red-500/25 ${
          compact ? "px-3 py-1.5 text-[11px]" : "w-full px-4 py-2.5 text-xs"
        } ${className}`}
      >
        Пульт LIVE
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void handleStart()}
      className={`inline-flex items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-50 ${
        compact ? "px-3 py-1.5 text-[11px]" : "w-full px-4 py-2 text-xs"
      } ${className}`}
    >
      {busy ? "…" : "▶ Начать LIVE-матч"}
    </button>
  );
}
