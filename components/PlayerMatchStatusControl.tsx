"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPlayerMatchStatusLabel,
  getPlayerMatchStatusMeta,
  PLAYER_MATCH_STATUSES,
  type PlayerMatchStatus,
} from "@/lib/playerMatchStatus";
import { supabase } from "@/lib/supabase";

type Variant = "home" | "profile" | "me";

function badgeClass(variant: Variant, status: string): string {
  const meta = getPlayerMatchStatusMeta(status);
  if (variant === "home") {
    return `player-home-premium__status ${meta.homeClass}`;
  }
  if (variant === "me") {
    return `me-profile-tab__status ${meta.meProfileClass}`;
  }
  return `player-profile-status ${meta.profileClass}`;
}

export function PlayerMatchStatusBadge({
  status,
  variant = "profile",
}: {
  status: string;
  variant?: Variant;
}) {
  const compact = variant === "home" || variant === "me";
  return (
    <span className={badgeClass(variant, status)}>
      {getPlayerMatchStatusLabel(status, true, compact)}
    </span>
  );
}

export default function PlayerMatchStatusControl({
  playerId,
  status: initialStatus,
  variant = "home",
  editable = true,
}: {
  playerId: number;
  status: string;
  variant?: Variant;
  editable?: boolean;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState(initialStatus);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  async function chooseStatus(next: PlayerMatchStatus) {
    if (!editable || saving || next === normalizeStatus(status)) {
      setOpen(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("players")
        .update({ status: next })
        .eq("id", playerId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setStatus(next);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Не удалось сохранить статус");
    } finally {
      setSaving(false);
    }
  }

  const meta = getPlayerMatchStatusMeta(status);
  const compact = variant === "home" || variant === "me";
  const displayLabel = compact ? meta.shortLabel : meta.label;

  if (!editable) {
    return <PlayerMatchStatusBadge status={status} variant={variant} />;
  }

  return (
    <div ref={rootRef} className="relative inline-flex max-w-full flex-col items-start">
      <button
        type="button"
        disabled={saving}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`${badgeClass(variant, status)} player-match-status-btn cursor-pointer transition hover:brightness-110 disabled:opacity-60`}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Нажмите, чтобы изменить готовность к матчу"
      >
        <span className="whitespace-nowrap">
          {meta.emoji} {displayLabel}
        </span>
        <span className="ml-0.5 shrink-0 opacity-60">▾</span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-50 min-w-[9.5rem] overflow-hidden rounded-xl border border-white/12 bg-[#12141c]/98 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md"
        >
          {PLAYER_MATCH_STATUSES.map((option) => {
            const optionMeta = getPlayerMatchStatusMeta(option);
            const active = normalizeStatus(status) === option;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={active}
                disabled={saving}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void chooseStatus(option);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                <span>{optionMeta.emoji}</span>
                <span>{optionMeta.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p className="mt-1 max-w-[12rem] text-[10px] text-rose-300">{error}</p>
      ) : null}
    </div>
  );
}

function normalizeStatus(status: string): PlayerMatchStatus {
  if (status === "maybe" || status === "absent") return status;
  return "ready";
}
