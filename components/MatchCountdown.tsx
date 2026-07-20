"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCountdownParts,
  getMatchDateTime,
  padTime,
} from "@/lib/matchCountdown";
import { formatMatchDate, formatMatchTime, type Match } from "@/lib/matches";

type MatchCountdownProps = {
  match: Match;
  embedded?: boolean;
  compact?: boolean;
};

export default function MatchCountdown({
  match,
  embedded = false,
  compact = false,
}: MatchCountdownProps) {
  const target = getMatchDateTime(match);
  const [countdown, setCountdown] = useState(() =>
    target ? getCountdownParts(target) : null,
  );

  useEffect(() => {
    if (!target) return;

    const tick = () => setCountdown(getCountdownParts(target));
    tick();

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target?.getTime()]);

  const wrapperClass = embedded
    ? "block w-full"
    : "group block w-full rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/15 via-transparent to-violet-600/10 px-3 py-3 shadow-[0_0_30px_rgba(249,115,22,0.12)] transition hover:border-orange-400/50 sm:px-4";

  const content = compact ? (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-white">
            vs {match.opponent}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-slate-400">
            {formatMatchDate(match.date)} · {formatMatchTime(match.time)}
            {match.location ? ` · ${match.location}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-2">
        {!target || !countdown ? (
          <p className="text-[10px] text-slate-400">
            {"\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u0430\u0442\u0443"}
          </p>
        ) : countdown.expired ? (
          <p className="text-[11px] font-semibold text-amber-300">
            {"\u0414\u0430\u0442\u0430 \u0443\u0436\u0435 \u043f\u0440\u043e\u0448\u043b\u0430"}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-1 text-center">
            <TimeBlock label={"\u0434\u043d"} value={countdown.days} compact />
            <TimeBlock label={"\u0447"} value={countdown.hours} compact />
            <TimeBlock label={"\u043c\u0438\u043d"} value={countdown.minutes} compact />
            <TimeBlock
              label={"\u0441\u0435\u043a"}
              value={countdown.seconds}
              highlight
              compact
            />
          </div>
        )}
      </div>
    </>
  ) : (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-200 sm:text-xs">
            {"\u0411\u043b\u0438\u0436\u0430\u0439\u0448\u0438\u0439 \u043c\u0430\u0442\u0447"}
          </p>
          <p className="mt-1 text-base font-extrabold text-white sm:text-lg">
            vs {match.opponent}
          </p>
          <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
            {formatMatchDate(match.date)} · {formatMatchTime(match.time)}
          </p>
          {match.location && (
            <p className="text-xs text-slate-500">
              {"\uD83D\uDCCD"} {match.location}
            </p>
          )}
        </div>
        {!embedded && (
          <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-200 ring-1 ring-orange-400/30">
            {"\u26BD"}
          </span>
        )}
      </div>

      <div className={`mt-3 ${embedded ? "" : "border-t border-white/10 pt-3"}`}>
        {!target || !countdown ? (
          <p className="text-xs text-slate-400">
            {"\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u0430\u0442\u0443 \u0432 \u0430\u0434\u043c\u0438\u043d\u043a\u0435"}
          </p>
        ) : countdown.expired ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-amber-300">
              {"\u0414\u0430\u0442\u0430 \u043c\u0430\u0442\u0447\u0430 \u0443\u0436\u0435 \u043f\u0440\u043e\u0448\u043b\u0430"}
            </p>
            <Link
              href="/admin/matches"
              className="mt-1 inline-block text-xs text-cyan-400 hover:underline"
            >
              {"\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0434\u0430\u0442\u0443 \u2192"}
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
              {"\u0414\u043e \u043d\u0430\u0447\u0430\u043b\u0430 \u043c\u0430\u0442\u0447\u0430"}
            </p>
            <div className="grid grid-cols-4 gap-1.5 text-center sm:gap-2">
              <TimeBlock label={"\u0434\u043d"} value={countdown.days} />
              <TimeBlock label={"\u0447"} value={countdown.hours} />
              <TimeBlock label={"\u043c\u0438\u043d"} value={countdown.minutes} />
              <TimeBlock
                label={"\u0441\u0435\u043a"}
                value={countdown.seconds}
                highlight
              />
            </div>
          </>
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className={wrapperClass}>{content}</div>;
  }

  return (
    <Link href="/matches" className={wrapperClass}>
      {content}
    </Link>
  );
}

function TimeBlock({
  label,
  value,
  highlight = false,
  compact = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border ${
        compact ? "px-1 py-1" : "rounded-xl px-1 py-2 sm:px-2"
      } ${
        highlight
          ? "border-cyan-400/30 bg-cyan-500/10"
          : "border-white/10 bg-black/30"
      }`}
    >
      <p
        className={`font-mono font-extrabold ${
          compact
            ? "text-sm"
            : "text-lg sm:text-2xl"
        } ${highlight ? "text-cyan-300 neon-text-blue" : "text-white"}`}
      >
        {padTime(value)}
      </p>
      <p
        className={`font-medium uppercase text-slate-500 ${
          compact ? "text-[8px]" : "text-[10px]"
        }`}
      >
        {label}
      </p>
    </div>
  );
}
