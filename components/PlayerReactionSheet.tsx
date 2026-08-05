"use client";

import { useState } from "react";
import PlayerAvatar from "@/components/PlayerAvatar";
import AppBottomSheet from "@/components/ui/AppBottomSheet";
import {
  PLAYER_REACTIONS,
  type ReactionCode,
} from "@/lib/playerReactions";
import { formatOverallRating } from "@/lib/matchRatings";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";

type PlayerReactionSheetProps = {
  open: boolean;
  onClose: () => void;
  player: {
    id: number;
    name: string;
    position: string;
    rating: number;
    photo_url?: string | null;
  } | null;
  matchId: number | null;
  reactionsOpen: boolean;
  myReaction: ReactionCode | null;
  canReact: boolean;
  onReacted: (toPlayerId: number, code: ReactionCode) => void;
};

export default function PlayerReactionSheet({
  open,
  onClose,
  player,
  matchId,
  reactionsOpen,
  myReaction,
  canReact,
  onReacted,
}: PlayerReactionSheetProps) {
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<ReactionCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState<string | null>(null);

  if (!player) return null;

  const group = getPositionGroup(null, player.position);
  const style = getPositionStyle(group);

  async function submit(code: ReactionCode) {
    if (!canReact || !reactionsOpen || !matchId || saving) return;
    setPending(code);
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          toPlayerId: player!.id,
          reactionCode: code,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        unchanged?: boolean;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось сохранить");
      }

      if (data.unchanged) {
        return;
      }

      const emoji = PLAYER_REACTIONS.find((item) => item.code === code)?.emoji;
      setBurst(emoji ?? "✨");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(12);
      }
      onReacted(player!.id, code);
      window.setTimeout(() => setBurst(null), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
      setPending(null);
    }
  }

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      showCloseButton
      showHandle
      centerOnDesktop
      title={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Игрок
          </p>
          <h2 className="text-lg font-extrabold text-white">{player.name}</h2>
        </div>
      }
      panelClassName="border-white/10 bg-gradient-to-br from-[#10182a] via-[#0b1220] to-[#070d18]"
    >
      <div className="relative space-y-4 px-4 py-3">
        {burst ? (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
            <span className="animate-bounce text-4xl drop-shadow-lg">{burst}</span>
          </div>
        ) : null}

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <PlayerAvatar
            name={player.name}
            photoUrl={player.photo_url}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-extrabold text-white">
              {player.name}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-[12px]">
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-black text-white ${style.badge}`}
              >
                {group}
              </span>
              <span className="font-black tabular-nums text-amber-200">
                ★ {formatOverallRating(player.rating)}
              </span>
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Оценить игрока
          </p>

          {!reactionsOpen ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[12px] text-slate-400">
              Реакции откроются после завершения матча и закроются, когда
              админ создаст следующий.
            </p>
          ) : !canReact ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[12px] text-slate-400">
              Войдите как игрок, чтобы ставить реакции.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {PLAYER_REACTIONS.map((reaction) => {
                const selected = myReaction === reaction.code;
                const loading = pending === reaction.code;
                return (
                  <button
                    key={reaction.code}
                    type="button"
                    disabled={saving}
                    onClick={() => submit(reaction.code)}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition ${
                      selected
                        ? "scale-[1.03] border-cyan-400/45 bg-cyan-500/20 shadow-[0_0_16px_rgba(34,211,238,0.2)]"
                        : "border-white/10 bg-white/[0.04] hover:scale-[1.02] hover:border-white/20"
                    } disabled:opacity-60`}
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {reaction.emoji}
                    </span>
                    <span className="min-w-0 flex-1 text-[11px] font-bold leading-tight text-white">
                      {loading ? "…" : reaction.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {myReaction && reactionsOpen && canReact ? (
            <p className="mt-2 text-center text-[10px] text-slate-500">
              Можно изменить реакцию — вторая не добавляется
            </p>
          ) : null}

          {error ? (
            <p className="mt-2 text-center text-[11px] font-semibold text-rose-300">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </AppBottomSheet>
  );
}
