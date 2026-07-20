"use client";

import MatchScoreboard from "@/components/MatchScoreboard";
import {
  formatMatchHeader,
  getMatchResultLabel,
  getResultColor,
  getTopScorers,
  getTotalAssistsFromStats,
  getTotalGoalsFromStats,
  hasMatchPlayerStatActivity,
  type MatchHistoryEntry,
} from "@/lib/matchHistory";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import { useState } from "react";

type HistoryBoardProps = {
  history: MatchHistoryEntry[];
};

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 flex-1 px-1.5 py-1.5 text-center">
      <p className="truncate text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-black leading-none text-slate-100">
        {value}
      </p>
    </div>
  );
}

export default function HistoryBoard({ history }: HistoryBoardProps) {
  const [expandedId, setExpandedId] = useState<number | null>(
    history[0]?.id ?? null,
  );

  const totalGoals = history.reduce(
    (sum, match) => sum + getTotalGoalsFromStats(match.stats),
    0,
  );
  const totalAssists = history.reduce(
    (sum, match) => sum + getTotalAssistsFromStats(match.stats),
    0,
  );
  const wins = history.filter((m) => m.ndfk_goals > m.opponent_goals).length;

  const statsStrip = (
    <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
      <div className="grid grid-cols-4 divide-x divide-white/10">
        <MiniStat
          label={"\u041c\u0430\u0442\u0447\u0438"}
          value={history.length}
        />
        <MiniStat label={"\u041f\u043e\u0431\u0435\u0434\u044b"} value={wins} />
        <MiniStat label={"\u0413\u043e\u043b\u044b"} value={totalGoals} />
        <MiniStat
          label={"\u041f\u0435\u0440\u0435\u0434\u0430\u0447\u0438"}
          value={totalAssists}
        />
      </div>
    </div>
  );

  if (history.length === 0) {
    return (
      <>
        {statsStrip}
        <div className="rounded-xl border border-white/10 px-3 py-6 text-center">
          <p className="text-sm text-slate-400">
            {"\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u0430\u044f"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {"\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0432 \u0430\u0434\u043c\u0438\u043d\u043a\u0435"}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {statsStrip}

      <div className="overflow-hidden rounded-xl border border-white/10 divide-y divide-white/8">
        {history.map((match) => {
          const isOpen = expandedId === match.id;
          const topScorers = getTopScorers(match.stats);
          const activeStats = match.stats
            .filter((stat) =>
              hasMatchPlayerStatActivity({
                goals: stat.goals,
                assists: stat.assists,
                saves: stat.saves,
              }),
            )
            .sort(
              (a, b) =>
                b.goals - a.goals ||
                b.assists - a.assists ||
                (b.saves ?? 0) - (a.saves ?? 0),
            );

          return (
            <div key={match.id} className="bg-white/[0.015]">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : match.id)}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition hover:bg-white/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <MatchScoreboard
                    match={match}
                    density="compact"
                    showMeta={false}
                  />
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${getResultColor(match)} bg-black/25`}
                    >
                      {getMatchResultLabel(match)}
                    </span>
                    <p className="truncate text-[10px] text-slate-400">
                      {formatMatchHeader(match)}
                      {match.location ? ` · ${match.location}` : ""}
                    </p>
                  </div>
                  {topScorers.length > 0 && (
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {"\u26BD"}{" "}
                      {topScorers
                        .map(
                          (stat) =>
                            `${stat.player?.name?.split(" ")[0] ?? "?"}${stat.goals}`,
                        )
                        .join(" · ")}
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-[10px] text-slate-500">
                  {isOpen ? "\u25B2" : "\u25BC"}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-white/8 bg-black/20 px-2 py-1.5">
                  {activeStats.length === 0 ? (
                    <p className="py-2 text-center text-[11px] text-slate-500">
                      {"\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430"}
                    </p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {activeStats.map((stat) => {
                        const group = getPositionGroup(
                          null,
                          stat.player?.position ?? "",
                        );
                        const style = getPositionStyle(group);

                        return (
                          <div
                            key={stat.id}
                            className="flex items-center gap-2 py-1.5"
                          >
                            <span
                              className={`flex h-5 min-w-[28px] items-center justify-center rounded text-[8px] font-bold text-white ${style.badge}`}
                            >
                              {group}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white">
                              {stat.player?.name ?? "\u0418\u0433\u0440\u043e\u043a"}
                            </span>
                            <span className="text-[11px] text-slate-300">
                              {"\u26BD"}
                              {stat.goals}
                            </span>
                            <span className="text-[11px] text-slate-300">
                              {"\uD83C\uDFAF"}
                              {stat.assists}
                            </span>
                            {(stat.saves ?? 0) > 0 && (
                              <span className="text-[11px] text-slate-300">
                                {"\uD83E\uDD4A"}
                                {stat.saves}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
