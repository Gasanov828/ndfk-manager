"use client";

import {
  formatVotePercent,
  formatVoteScoreWithMax,
  MAX_VOTE_SCORE,
} from "@/lib/matchRatings";
import { getRatingBand, ratingBandTextClass } from "@/lib/ratingBands";
import type { UnlockedAchievement } from "@/lib/achievements/types";
import { RARITY_LABEL } from "@/lib/achievements/types";
import AppBottomSheet from "@/components/ui/AppBottomSheet";
import { SHOW_MATCH_MVP_UI } from "@/lib/matchMvpUi";

type MatchRatingResultsModalProps = {
  open: boolean;
  onClose: () => void;
  opponent: string;
  myScore: number | null;
  voteCount: number;
  isMvp: boolean;
  unlocked: UnlockedAchievement[];
  totalXpGained: number;
};

export default function MatchRatingResultsModal({
  open,
  onClose,
  opponent,
  myScore,
  voteCount,
  isMvp,
  unlocked,
  totalXpGained,
}: MatchRatingResultsModalProps) {
  const hasScore = myScore != null && myScore > 0 && voteCount > 0;
  const percent = hasScore ? formatVotePercent(myScore) : 0;
  const band = hasScore ? getRatingBand(myScore!) : null;

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      showCloseButton
      showHandle
      title={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/85">
            🏆 Голосование завершено
          </p>
          <h2 className="mt-0.5 text-lg font-extrabold text-white">
            vs {opponent}
          </h2>
        </div>
      }
      panelClassName="border-amber-300/25 bg-gradient-to-br from-[#121a2e] via-[#0b1224] to-[#080d18]"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="mb-1 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-[13px] font-bold text-white"
        >
          Понятно
        </button>
      }
    >
      <div className="space-y-3 px-4 py-3">
        {hasScore ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/75">
              ⭐ Итоговая оценка
            </p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p
                className={`text-3xl font-black tabular-nums ${ratingBandTextClass(myScore!)}`}
              >
                {formatVoteScoreWithMax(myScore!)}
              </p>
              <p className="pb-1 text-right text-[13px] font-extrabold text-amber-200/90">
                {percent}%
                {SHOW_MATCH_MVP_UI && isMvp ? (
                  <span className="mt-0.5 block text-[10px] text-amber-300">
                    MVP матча
                  </span>
                ) : null}
              </p>
            </div>
            {band ? (
              <p className="mt-1 text-[11px] text-slate-400">
                {band.emoji} {band.label} · по {voteCount}{" "}
                {voteCount === 1
                  ? "голосу"
                  : voteCount < 5
                    ? "голосам"
                    : "голосам"}{" "}
                · шкала 1–{MAX_VOTE_SCORE}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
            <p className="text-[13px] font-semibold text-slate-300">
              Нет оценок за этот матч
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Итог не влияет на среднюю сезона, достижения и карьерный прогресс.
            </p>
          </div>
        )}

        {unlocked.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-200/80">
              🏅 Новые достижения
            </p>
            {unlocked.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-2"
              >
                <span className="text-xl" aria-hidden>
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold text-white">
                    {item.title}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">
                    {RARITY_LABEL[item.rarity]} · +{item.xp} XP
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            ⬆️ Карьерный прогресс
          </p>
          <p className="mt-0.5 text-[15px] font-extrabold text-white">
            {totalXpGained > 0 ? `+${totalXpGained} XP` : "Без нового XP"}
          </p>
        </div>
      </div>
    </AppBottomSheet>
  );
}
