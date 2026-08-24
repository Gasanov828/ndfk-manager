"use client";

import { useCallback, useState } from "react";
import AppBottomSheet from "@/components/ui/AppBottomSheet";
import PlayerPhotoImage from "@/components/PlayerPhotoImage";
import {
  formatVoteScore,
  MAX_VOTE_SCORE,
  normalizeVoteScore,
} from "@/lib/matchRatings";
import { getPlayerInitials } from "@/lib/playerPhotos";
import { canSelectStarScore } from "@/lib/starBallotLimits";

export type MatchPlayerRatingSheetPlayer = {
  playerId: number;
  name: string;
  position: string;
  photoUrl: string | null;
  goals: number;
  assists: number;
};

type MatchPlayerRatingSheetProps = {
  open: boolean;
  player: MatchPlayerRatingSheetPlayer | null;
  /** Текущая оценка в sheet (0 = ещё не выбрана) */
  score: number;
  onScoreChange: (score: number) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
  saving?: boolean;
  /** После успешного сохранения */
  saveSuccess?: boolean;
  nextPlayer?: MatchPlayerRatingSheetPlayer | null;
  onRateNext?: () => void;
  onPrevPlayer?: () => void;
  onNextPlayer?: () => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
  ballotScores?: Record<number, number>;
  alreadySaved?: boolean;
  savedScore?: number | null;
};

function uxRatingColorClass(score: number): string {
  const s = normalizeVoteScore(score);
  if (s <= 0) return "text-slate-400";
  if (s <= 3) return "text-red-400";
  if (s <= 5) return "text-orange-400";
  if (s <= 7) return "text-yellow-300";
  if (s <= 9) return "text-cyan-300";
  return "text-amber-300";
}

function uxRatingGlowClass(score: number): string {
  const s = normalizeVoteScore(score);
  if (s <= 0) return "";
  if (s <= 3) return "shadow-[0_0_20px_rgba(248,113,113,0.25)]";
  if (s <= 5) return "shadow-[0_0_20px_rgba(251,146,60,0.2)]";
  if (s <= 7) return "shadow-[0_0_20px_rgba(250,204,21,0.18)]";
  if (s <= 9) return "shadow-[0_0_22px_rgba(34,211,238,0.22)]";
  return "shadow-[0_0_24px_rgba(251,191,36,0.28)]";
}

const SLIDER_MIN = 1;
const SLIDER_MAX = 10;
const SLIDER_STEP = 0.5;
const DEFAULT_SCORE = 7;

export default function MatchPlayerRatingSheet({
  open,
  player,
  score,
  onScoreChange,
  onClose,
  onSave,
  saving = false,
  saveSuccess = false,
  nextPlayer,
  onRateNext,
  onPrevPlayer,
  onNextPlayer,
  canNavigatePrev = false,
  canNavigateNext = false,
  ballotScores = {},
  alreadySaved = false,
  savedScore = null,
}: MatchPlayerRatingSheetProps) {
  const displayScore = score > 0 ? score : DEFAULT_SCORE;
  const [limitHint, setLimitHint] = useState<string | null>(null);

  const handleSlider = useCallback(
    (raw: number) => {
      if (!player || alreadySaved) return;
      const next = Math.round(raw * 2) / 2;
      onScoreChange(next);
      const roundedForDb = Math.round(next);
      const check = canSelectStarScore(
        ballotScores,
        player.playerId,
        roundedForDb
      );
      setLimitHint(check.ok ? null : check.reason);
    },
    [alreadySaved, ballotScores, onScoreChange, player]
  );

  if (!player) return null;

  const initials = getPlayerInitials(player.name) || "?";
  const activeScore = score > 0 ? score : DEFAULT_SCORE;
  const saveDisabled =
    saving ||
    alreadySaved ||
    activeScore < SLIDER_MIN ||
    Boolean(limitHint);

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      dismissible={!saving}
      showHandle
      panelClassName="border-cyan-400/20 bg-[linear-gradient(180deg,rgba(8,14,28,0.98),rgba(4,8,18,0.99))] shadow-[0_-8px_48px_rgba(34,211,238,0.12),0_-16px_64px_rgba(0,0,0,0.55)]"
      zClassName="z-[320]"
    >
      <div className="px-4 pb-2 pt-1">
        {canNavigatePrev || canNavigateNext ? (
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onPrevPlayer}
              disabled={!canNavigatePrev || saving}
              className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-30 active:scale-95"
              aria-label="Предыдущий игрок"
            >
              ←
            </button>
            <span className="text-[10px] font-medium text-slate-500">
              листай игроков
            </span>
            <button
              type="button"
              onClick={onNextPlayer}
              disabled={!canNavigateNext || saving}
              className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-30 active:scale-95"
              aria-label="Следующий игрок"
            >
              →
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-950 ring-1 ring-cyan-400/15">
            <PlayerPhotoImage
              photoUrl={player.photoUrl}
              alt={player.name}
              className="h-full w-full object-cover object-[center_18%]"
              fallback={
                <span className="text-sm font-bold text-slate-300">
                  {initials}
                </span>
              }
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-black text-white">
              {player.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {player.position || "—"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-[12px] text-slate-300">
          <span>⚽ {player.goals}</span>
          <span>🎯 {player.assists}</span>
        </div>

        <div
          className={`match-rating-sheet-score mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center backdrop-blur-sm transition-all duration-300 ${uxRatingGlowClass(activeScore)}`}
        >
          <p
            className={`text-[2.75rem] font-black tabular-nums leading-none transition-colors duration-200 ${uxRatingColorClass(activeScore)}`}
          >
            {formatVoteScore(activeScore)}
          </p>
          <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-200/70">
            Оценка матча
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Ваша оценка:{" "}
            <span className="font-semibold text-slate-200">
              {alreadySaved && savedScore != null
                ? formatVoteScore(savedScore)
                : score > 0
                  ? formatVoteScore(score)
                  : "—"}
            </span>
          </p>
        </div>

        {!alreadySaved && !saveSuccess ? (
          <div className="mt-4 px-0.5">
            <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-slate-500">
              <span>{SLIDER_MIN.toFixed(1)}</span>
              <span>{SLIDER_MAX.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={SLIDER_STEP}
              value={displayScore}
              disabled={saving}
              onChange={(event) => handleSlider(Number(event.target.value))}
              className="match-rating-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-400 disabled:opacity-50"
              aria-label="Оценка от 1 до 10"
            />
            {limitHint ? (
              <p className="mt-2 text-center text-[10px] font-medium text-orange-300/90">
                {limitHint}
              </p>
            ) : null}
          </div>
        ) : null}

        {saveSuccess ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-3">
            <p className="text-center text-[13px] font-bold text-emerald-200">
              ✅ Оценка сохранена
            </p>
            {nextPlayer ? (
              <>
                <p className="text-center text-[11px] text-slate-400">
                  Следующий игрок:
                </p>
                <p className="text-center text-[14px] font-black text-white">
                  {nextPlayer.name}
                </p>
                <button
                  type="button"
                  onClick={onRateNext}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500/90 to-blue-500/90 px-3 py-2.5 text-[13px] font-bold text-white transition hover:from-cyan-400 hover:to-blue-400 active:scale-[0.98]"
                >
                  Оценить следующего →
                </button>
              </>
            ) : (
              <p className="text-center text-[13px] font-bold text-amber-200">
                🏆 Все игроки оценены
              </p>
            )}
          </div>
        ) : alreadySaved ? (
          <p className="mt-4 text-center text-[12px] font-semibold text-emerald-300/90">
            Вы уже оценили этого игрока
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saveDisabled}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-3 text-[14px] font-bold text-white transition hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить оценку"}
          </button>
        )}
      </div>
    </AppBottomSheet>
  );
}
