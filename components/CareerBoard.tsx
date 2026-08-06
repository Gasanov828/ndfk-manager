"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import type { PlayerWelcomeData } from "@/lib/playerStats";
import {
  CAREER_LADDERS,
  CAREER_PATH_META,
  getCurrentCareerTitle,
  getLadderLevelProgress,
  getNextCareerTitle,
  resolveCareerGroup,
  type CareerTitle,
  type CareerTitleStatus,
  type CommonAchievement,
  type CommonAchievementStatus,
} from "@/lib/careerMock";
import type { CareerMvpRecord } from "@/lib/careerMvp";
import {
  groupTeamAchievementsByTrack,
  type TeamSeasonStats,
} from "@/lib/teamAchievements";
import type { PersonalRatingStats } from "@/lib/personalAchievements";
import { formatMatchDate } from "@/lib/matches";
import { formatVotePercent, formatVoteScore, formatVoteScoreWithMax } from "@/lib/matchRatings";
import {
  RATING_ELITE,
  RATING_SOLID,
  RATING_STRONG,
} from "@/lib/personalAchievements";
import AchievementsLiveBoard from "@/components/AchievementsLiveBoard";

type ScopeTab = "me" | "club";
type ScaleTone = "violet" | "cyan" | "emerald" | "amber";

function ProgressScale({
  current,
  target,
  tone = "violet",
  showTicks = false,
  size = "sm",
}: {
  current: number;
  target: number;
  tone?: ScaleTone;
  showTicks?: boolean;
  size?: "sm" | "md";
}) {
  const safeTarget = Math.max(1, target);
  const pct = Math.min(100, Math.round((current / safeTarget) * 100));
  const tickCount = Math.min(6, Math.max(2, Math.round(safeTarget)));
  const fillClass =
    tone === "emerald"
      ? "career-scale-fill--emerald"
      : tone === "cyan"
        ? "career-scale-fill--cyan"
        : tone === "amber"
          ? "career-scale-fill--amber"
          : "career-scale-fill--violet";
  const height = size === "md" ? "h-2" : "h-1.5";

  return (
    <div className="mt-1.5">
      <div className="mb-1 flex items-center justify-between gap-2 text-[9px]">
        <span className="font-semibold tabular-nums text-slate-300">
          {current}
          <span className="text-slate-500">/{target}</span>
        </span>
        <span className="tabular-nums text-slate-500">{pct}%</span>
      </div>
      <div className={`career-scale ${height}`}>
        <div
          className={`career-scale-fill ${fillClass}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
        />
        {showTicks && (
          <div className="career-scale-ticks" aria-hidden>
            {Array.from({ length: tickCount - 1 }, (_, i) => (
              <span
                key={i}
                style={{ left: `${((i + 1) / tickCount) * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LevelRail({ ladder }: { ladder: CareerTitle[] }) {
  return (
    <div className="career-level-rail career-level-rail--compact" aria-label="Уровни">
      {ladder.map((item, index) => {
        const done = item.status === "earned" || item.status === "current";
        const active = item.status === "progress";
        const locked = item.status === "locked";

        return (
          <div key={item.id} className="career-level-rail__item">
            {index > 0 && (
              <span
                className={`career-level-rail__line ${
                  done || active ? "is-lit" : ""
                }`}
                aria-hidden
              />
            )}
            <div
              className={`career-level-rail__node ${
                done ? "is-done" : active ? "is-active" : locked ? "is-locked" : ""
              }`}
              title={`Ур. ${item.level}: ${item.title}`}
            >
              <span>{item.level}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function statusLabel(status: CareerTitleStatus | CommonAchievementStatus) {
  if (status === "earned" || status === "current") return "✓";
  if (status === "progress") return "…";
  return "🔒";
}

function statusClass(status: CareerTitleStatus | CommonAchievementStatus) {
  if (status === "earned" || status === "current") {
    return "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30";
  }
  if (status === "progress") {
    return "bg-cyan-500/12 text-cyan-200 ring-cyan-400/25";
  }
  return "bg-slate-500/15 text-slate-400 ring-white/10";
}

function LadderRow({ item }: { item: CareerTitle }) {
  const locked = item.status === "locked";
  const done = item.status === "earned" || item.status === "current";
  const growing = item.status === "progress";

  return (
    <div
      className={`rounded-xl border px-2.5 py-2 ${
        growing
          ? "border-cyan-400/25 bg-cyan-500/8"
          : done
            ? "border-emerald-400/15 bg-emerald-500/[0.06]"
            : "border-white/8 bg-white/[0.02] opacity-70"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="career-level-chip shrink-0">L{item.level}</span>
        <span className="text-sm leading-none" aria-hidden>
          {item.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-extrabold text-white">
              {item.title}
            </p>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ring-1 ${statusClass(
                item.status
              )}`}
            >
              {statusLabel(item.status)}
            </span>
          </div>
          <p className="truncate text-[10px] text-slate-500">
            {item.description}
          </p>
        </div>
      </div>
      {growing && (
        <ProgressScale
          current={item.current}
          target={item.target}
          tone="cyan"
          size="sm"
        />
      )}
      {locked && (
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
          После предыдущего уровня
        </p>
      )}
    </div>
  );
}

function AchievementCard({
  item,
  tone,
}: {
  item: CommonAchievement;
  tone: "personal" | "team";
}) {
  const locked = item.status === "locked";
  const scaleTone: ScaleTone =
    item.status === "earned"
      ? "emerald"
      : tone === "team"
        ? "amber"
        : "violet";

  return (
    <article
      className={`rounded-xl border px-2.5 py-2 ${
        item.status === "earned"
          ? tone === "team"
            ? "border-amber-400/20 bg-amber-500/8"
            : "border-emerald-400/20 bg-emerald-500/8"
          : locked
            ? "border-white/8 bg-white/[0.02] opacity-75"
            : tone === "team"
              ? "border-amber-400/12 bg-amber-500/[0.04]"
              : "border-cyan-400/12 bg-cyan-500/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none" aria-hidden>
              {item.icon}
            </span>
            <h3 className="truncate text-[13px] font-extrabold text-white">
              {item.title}
            </h3>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-500">
            {item.description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ring-1 ${statusClass(
            item.status
          )}`}
        >
          {statusLabel(item.status)}
        </span>
      </div>
      {!locked && (
        <ProgressScale
          current={item.current}
          target={item.target}
          tone={scaleTone}
          size="sm"
        />
      )}
    </article>
  );
}

export default function CareerBoard() {
  const { user, profile, loading } = useAuthProfile();
  const [welcome, setWelcome] = useState<PlayerWelcomeData | null>(null);
  const [mvpRecords, setMvpRecords] = useState<CareerMvpRecord[]>([]);
  const [teamAchievements, setTeamAchievements] = useState<CommonAchievement[]>(
    []
  );
  const [personalAchievements, setPersonalAchievements] = useState<
    CommonAchievement[]
  >([]);
  const [personalStats, setPersonalStats] =
    useState<PersonalRatingStats | null>(null);
  const [clubStats, setClubStats] = useState<TeamSeasonStats | null>(null);
  const [fetching, setFetching] = useState(false);
  const [tab, setTab] = useState<ScopeTab>("me");

  const canLoadPlayer =
    !!user && !!profile?.player_id && profile.role !== "admin";

  useEffect(() => {
    if (loading || !canLoadPlayer) {
      setWelcome(null);
      setMvpRecords([]);
      setTeamAchievements([]);
      setPersonalAchievements([]);
      setPersonalStats(null);
      setClubStats(null);
      return;
    }

    let cancelled = false;
    setFetching(true);

    Promise.all([
      fetch("/api/me/welcome", { cache: "no-store" }).then((response) =>
        response.json()
      ),
      fetch("/api/career/club", { cache: "no-store" }).then((response) =>
        response.json()
      ),
    ])
      .then(
        ([welcomeData, clubData]: [
          { welcome: PlayerWelcomeData | null },
          {
            records?: CareerMvpRecord[];
            achievements?: CommonAchievement[];
            stats?: TeamSeasonStats;
            personalAchievements?: CommonAchievement[];
            personalStats?: PersonalRatingStats;
          },
        ]) => {
          if (cancelled) return;
          setWelcome(welcomeData.welcome);
          setMvpRecords(clubData.records ?? []);
          setTeamAchievements(clubData.achievements ?? []);
          setClubStats(clubData.stats ?? null);
          setPersonalAchievements(clubData.personalAchievements ?? []);
          setPersonalStats(clubData.personalStats ?? null);
        }
      )
      .catch(() => {
        if (!cancelled) {
          setWelcome(null);
          setMvpRecords([]);
          setTeamAchievements([]);
          setPersonalAchievements([]);
          setPersonalStats(null);
          setClubStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, canLoadPlayer, user, profile]);

  const group = resolveCareerGroup(welcome?.positionGroup);
  const meta = CAREER_PATH_META[group];
  const ladder = CAREER_LADDERS[group];

  const currentTitle = useMemo(() => getCurrentCareerTitle(ladder), [ladder]);
  const nextTitle = useMemo(() => getNextCareerTitle(ladder), [ladder]);
  const levelProgress = useMemo(() => getLadderLevelProgress(ladder), [ladder]);

  const teamGroups = useMemo(
    () => groupTeamAchievementsByTrack(teamAchievements),
    [teamAchievements]
  );

  if (loading || fetching) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-10 rounded-xl bg-white/5" />
        <div className="h-28 rounded-2xl bg-white/5" />
        <div className="h-40 rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (!canLoadPlayer) {
    return (
      <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
        <p className="text-sm font-semibold text-amber-100">
          Карьера доступна игрокам состава
        </p>
        <p className="mt-1.5 text-sm text-amber-100/80">
          Войдите как игрок — страница покажет путь вашей позиции.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {/* Scope switch */}
      <div
        className="career-scope-tabs"
        role="tablist"
        aria-label="Тип достижений"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "me"}
          className={`career-scope-tab ${tab === "me" ? "is-active is-me" : ""}`}
          onClick={() => setTab("me")}
        >
          <span className="career-scope-tab__title">Я</span>
          <span className="career-scope-tab__sub">Мои достижения</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "club"}
          className={`career-scope-tab ${
            tab === "club" ? "is-active is-club" : ""
          }`}
          onClick={() => setTab("club")}
        >
          <span className="career-scope-tab__title">Клуб</span>
          <span className="career-scope-tab__sub">Достижения команды</span>
        </button>
      </div>

      {tab === "me" ? (
        <div className="space-y-3" role="tabpanel">
          {/* Compact path header */}
          <section className="premium-card overflow-hidden rounded-2xl">
            <div className="p-3 sm:p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-200/75">
                    Личный путь
                  </p>
                  <h2 className="mt-0.5 truncate text-[16px] font-extrabold text-white">
                    {meta.pathIcon} {meta.pathTitle}
                  </h2>
                  {welcome?.firstName && (
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {welcome.firstName}
                      {welcome.lineupLabel ? ` · ${welcome.lineupLabel}` : ""}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Прогресс
                  </p>
                  <p className="text-lg font-extrabold tabular-nums text-cyan-200">
                    {levelProgress.pct}%
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <ProgressScale
                  current={levelProgress.cleared}
                  target={levelProgress.total}
                  tone="cyan"
                  size="md"
                  showTicks
                />
                <div className="mt-2 overflow-x-auto">
                  <LevelRail ladder={ladder} />
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                {currentTitle && (
                  <div className="rounded-xl border border-white/10 bg-black/25 px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Сейчас
                    </p>
                    <p className="mt-0.5 truncate text-[12px] font-extrabold text-white">
                      {currentTitle.icon} L{currentTitle.level} ·{" "}
                      {currentTitle.title}
                    </p>
                    {currentTitle.status === "progress" && (
                      <ProgressScale
                        current={currentTitle.current}
                        target={currentTitle.target}
                        tone="violet"
                        size="sm"
                      />
                    )}
                  </div>
                )}
                {nextTitle && nextTitle.id !== currentTitle?.id && (
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/8 px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-cyan-200/75">
                      Дальше
                    </p>
                    <p className="mt-0.5 truncate text-[12px] font-extrabold text-white">
                      {nextTitle.icon} L{nextTitle.level} · {nextTitle.title}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-200/80">
                Лестница
              </h3>
              <span className="text-[10px] text-slate-500">
                {
                  ladder.filter(
                    (item) =>
                      item.status === "earned" || item.status === "current"
                  ).length
                }
                /{ladder.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {ladder.map((item) => (
                <LadderRow key={item.id} item={item} />
              ))}
            </div>
          </section>

          <AchievementsLiveBoard />

          <section className="space-y-1.5">
            <h3 className="px-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-200/80">
              Копилка оценок
            </h3>
            <p className="px-0.5 text-[10px] text-slate-500">
              После матча: ≥6.5 → +1, ≥7 → +2, ≥8 → +3 в копилку
            </p>

            {personalStats && (
              <div className="rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-violet-500/6 to-transparent px-2.5 py-2.5">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-200/75">
                      Копилка оценок
                    </p>
                    <p className="mt-0.5 text-[20px] font-extrabold tabular-nums text-white">
                      {personalStats.bankPoints}
                      <span className="ml-1 text-[11px] font-semibold text-slate-400">
                        очков
                      </span>
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    {[
                      { label: "6.5+", value: personalStats.matchesGe65 },
                      { label: "7+", value: personalStats.matchesGe70 },
                      { label: "8+", value: personalStats.matchesGe80 },
                    ].map((cell) => (
                      <div
                        key={cell.label}
                        className="rounded-lg border border-white/10 bg-black/25 px-1.5 py-1"
                      >
                        <p className="text-[8px] font-bold uppercase text-slate-500">
                          {cell.label}
                        </p>
                        <p className="text-[12px] font-extrabold tabular-nums text-cyan-100">
                          {cell.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {personalStats.bestRating > 0 && (
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    Лучшая оценка:{" "}
                    <span className="font-bold text-cyan-200">
                      {formatVoteScoreWithMax(personalStats.bestRating)}
                    </span>
                    {personalStats.mvpCount > 0
                      ? ` · MVP ×${personalStats.mvpCount}`
                      : ""}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-1.5 sm:grid-cols-2">
              {personalAchievements.map((item) => (
                <AchievementCard key={item.id} item={item} tone="personal" />
              ))}
            </div>
            {personalAchievements.some(
              (item) => item.track === "championship"
            ) ? (
              <p className="px-0.5 text-[10px] text-amber-200/70">
                🏅 Награды чемпионата сохраняются в карьере навсегда (сезонный
                XP при этом обнуляется с новым сезоном)
              </p>
            ) : null}

            {personalStats && personalStats.recent.length > 0 && (
              <div className="space-y-1">
                <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Последние оценки
                </p>
                <ul className="space-y-1">
                  {personalStats.recent.map((row) => (
                    <li
                      key={row.matchId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5"
                    >
                      <p className="min-w-0 truncate text-[11px] text-slate-300">
                        vs {row.opponent}
                        <span className="text-slate-500">
                          {" "}
                          · {formatMatchDate(row.matchDate)}
                        </span>
                      </p>
                      <p
                        className={`shrink-0 text-[12px] font-extrabold tabular-nums ${
                          row.matchRating >= RATING_ELITE
                            ? "text-emerald-300"
                            : row.matchRating >= RATING_STRONG
                              ? "text-cyan-300"
                              : row.matchRating >= RATING_SOLID
                                ? "text-violet-200"
                                : "text-slate-400"
                        }`}
                      >
                        {formatVoteScoreWithMax(row.matchRating)}
                        <span className="ml-1 text-[9px] font-semibold text-slate-500">
                          {formatVotePercent(row.matchRating)}%
                        </span>
                        {row.isMvp ? " ★" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-3" role="tabpanel">
          <section className="rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-200/80">
              Весь клуб
            </p>
            <h2 className="mt-0.5 text-[15px] font-extrabold text-white">
              Достижения NDFK
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Цепочки целей по голам, победам и сухим матчам
            </p>
            {clubStats && (
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {[
                  { label: "Голы", value: clubStats.goals },
                  { label: "Победы", value: clubStats.wins },
                  { label: "Серия", value: clubStats.winStreak },
                  { label: "На 0", value: clubStats.cleanSheets },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-amber-400/15 bg-black/20 px-1.5 py-1.5 text-center"
                  >
                    <p className="text-[8px] font-bold uppercase tracking-wide text-amber-200/55">
                      {stat.label}
                    </p>
                    <p className="text-[13px] font-extrabold tabular-nums text-white">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {teamGroups.map((groupItem) => (
            <section key={groupItem.track} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200/80">
                  {groupItem.label}
                </h3>
                <span className="text-[10px] text-slate-500">
                  {
                    groupItem.items.filter((item) => item.status === "earned")
                      .length
                  }
                  /{groupItem.items.length}
                </span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {groupItem.items.map((item) => (
                  <AchievementCard key={item.id} item={item} tone="team" />
                ))}
              </div>
            </section>
          ))}

          <section className="space-y-1.5">
            <h3 className="px-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200/80">
              Зал славы MVP
            </h3>
            {mvpRecords.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[12px] text-slate-400">
                Пока нет подтверждённых MVP
              </div>
            ) : (
              <ul className="space-y-1.5">
                {mvpRecords.map((row) => {
                  const isMe = row.playerId === profile?.player_id;
                  return (
                    <li
                      key={`${row.matchId}-${row.playerId}`}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 ${
                        isMe
                          ? "border-cyan-400/25 bg-cyan-500/10"
                          : "border-amber-400/15 bg-amber-500/[0.05]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-extrabold text-white">
                          {row.playerName}
                          {isMe ? (
                            <span className="ml-1.5 text-[9px] font-bold uppercase text-cyan-300">
                              ты
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-[10px] text-slate-500">
                          vs {row.opponent} · {formatMatchDate(row.matchDate)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[9px] font-bold uppercase text-amber-200/80">
                          MVP
                        </p>
                        <p className="text-[14px] font-extrabold tabular-nums text-white">
                          {formatVoteScore(row.matchRating)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <p className="px-0.5 pb-1 text-center text-[9px] text-slate-600">
        Личные награды — из оценок после голосования · лестница позиции пока прототип
      </p>
    </div>
  );
}
