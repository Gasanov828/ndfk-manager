"use client";

import type { FeedItem } from "@/lib/liveMatch";

type LiveEventFeedProps = {
  items: FeedItem[];
  /** Компактный вид под счётом на главной */
  compact?: boolean;
  emptyHint?: string;
  title?: string;
};

export default function LiveEventFeed({
  items,
  compact = false,
  emptyHint,
  title = "Голы",
}: LiveEventFeedProps) {
  // Хронология: первый гол сверху
  const list = items.filter(
    (item) => item.kind === "goal" || item.kind === "assist"
  );

  if (list.length === 0) {
    if (compact && !emptyHint) return null;
    return (
      <div
        className={
          compact
            ? "mt-2"
            : "rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md"
        }
      >
        {!compact ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>
        ) : null}
        <p className={`${compact ? "" : "mt-2"} text-[12px] text-slate-500`}>
          {emptyHint ?? "Голов пока нет"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "mt-2"
          : "rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md"
      }
    >
      {!compact ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {title}
        </p>
      ) : null}
      <ul
        className={`${compact ? "space-y-0.5" : "mt-2 max-h-40 space-y-1 overflow-y-auto overscroll-contain pr-1"}`}
      >
        {list.map((item) => {
          if (item.kind === "goal") {
            return (
              <li
                key={item.key}
                className="text-[13px] font-semibold leading-snug text-white"
              >
                <span className="text-emerald-300">⚽</span> {item.playerName}
                {item.withoutAssist ? (
                  <span className="mt-0.5 block pl-5 text-[11px] font-medium text-slate-500">
                    Без ассиста
                  </span>
                ) : null}
              </li>
            );
          }
          return (
            <li
              key={item.key}
              className="pl-5 text-[12px] font-semibold leading-snug text-cyan-100"
            >
              <span className="text-cyan-300">🎯</span> {item.playerName}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
