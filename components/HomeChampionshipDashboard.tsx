import Link from "next/link";
import AnimatedValue from "@/components/ui/AnimatedValue";
import ChampionshipRoundRing from "@/components/ui/ChampionshipRoundRing";
import ClubLogo from "@/components/ClubLogo";
import OpponentCrest from "@/components/OpponentCrest";
import type { HomeChampionshipDashboardData } from "@/lib/championship/homeDashboard";
import type { HomeClubLastMatchStrip } from "@/lib/server/homeClubLastMatch";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";

function shortName(name: string): string {
  const first = name.trim().split(/\s+/)[0] || name;
  return first.length > 10 ? `${first.slice(0, 9)}…` : first;
}

type LastMatchEventRow = { playerId: number; name: string; count: number };

/** Герб соперника: реальный загруженный логотип, если он есть в системе, иначе сгенерированный. */
function OpponentSideCrest({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className="home-last-match__crest-img"
        loading="lazy"
      />
    );
  }
  return <OpponentCrest name={name} size="md" />;
}

/** Отдельная премиальная карточка «Последняя игра» — под блоком Доргелиги. */
function LastMatchPremiumCard({
  badgeLabel,
  date,
  homeName,
  awayName,
  homeLogoUrl,
  awayLogoUrl,
  homeIsUs,
  homeGoals,
  awayGoals,
  scorers,
  assisters,
}: {
  badgeLabel: string;
  date: string;
  homeName: string;
  awayName: string;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  homeIsUs: boolean;
  homeGoals: number;
  awayGoals: number;
  scorers: LastMatchEventRow[];
  assisters: LastMatchEventRow[];
}) {
  const hasGoals = scorers.length > 0;
  const hasAssists = assisters.length > 0;

  return (
    <div className="home-last-match">
      <div className="home-last-match__top">
          <div className="home-last-match__title-group">
            <p className="home-last-match__title">⚽ Последняя игра</p>
            <span className="home-last-match__badge">{badgeLabel}</span>
          </div>
          <Link href="/matches#history" className="home-last-match__date">
            {date ? formatMatchDate(date) : "—"} <span aria-hidden>›</span>
          </Link>
        </div>

        <div className="home-last-match__score-row">
          <div className="home-last-match__side">
            {homeIsUs ? (
              <ClubLogo size="md" />
            ) : (
              <OpponentSideCrest name={homeName} logoUrl={homeLogoUrl} />
            )}
            <p className="home-last-match__side-name">{homeName}</p>
          </div>
          <div className="home-last-match__score-box">
            <span className="home-last-match__score-value">{homeGoals}</span>
            <span className="home-last-match__score-sep">:</span>
            <span className="home-last-match__score-value">{awayGoals}</span>
          </div>
          <div className="home-last-match__side">
            {homeIsUs ? (
              <OpponentSideCrest name={awayName} logoUrl={awayLogoUrl} />
            ) : (
              <ClubLogo size="md" />
            )}
            <p className="home-last-match__side-name">{awayName}</p>
          </div>
        </div>

        {(hasGoals || hasAssists) && (
          <div className="home-last-match__events">
            {scorers.map((row) => (
              <p key={`g-${row.playerId}`} className="home-last-match__event">
                <span className="home-last-match__event-icon" aria-hidden>
                  ⚽
                </span>
                <span className="home-last-match__event-name">
                  {shortName(row.name)}
                </span>
                {row.count > 1 ? (
                  <span className="home-last-match__event-count">
                    ×{row.count}
                  </span>
                ) : null}
              </p>
            ))}
            {assisters.map((row) => (
              <p
                key={`a-${row.playerId}`}
                className="home-last-match__event home-last-match__event--assist"
              >
                <span className="home-last-match__event-icon" aria-hidden>
                  👟
                </span>
                <span className="home-last-match__event-name">
                  {shortName(row.name)}
                </span>
                {row.count > 1 ? (
                  <span className="home-last-match__event-count">
                    ×{row.count}
                  </span>
                ) : null}
              </p>
            ))}
          </div>
        )}
      </div>
  );
}


function MovementBadge({ change }: { change?: number }) {
  if (!change) return null;
  const up = change > 0;
  return (
    <span
      className={`ml-0.5 text-[9px] font-black leading-none ${
        up ? "text-emerald-300" : "text-rose-300"
      }`}
      title={up ? `Поднялись на ${change}` : `Опустились на ${Math.abs(change)}`}
    >
      {up ? "↗" : "↘"}
    </span>
  );
}

export default function HomeChampionshipDashboard({
  data,
  clubLastMatch = null,
}: {
  data: HomeChampionshipDashboardData;
  /** Клубный товарищеский матч — блок под таблицей */
  clubLastMatch?: HomeClubLastMatchStrip | null;
}) {
  const {
    championshipName,
    standingsSlice,
    lastMatch,
    nextMatch,
    progress,
    ourPlace,
  } = data;

  const hasPlayed = Boolean(lastMatch?.isPlayed);
  const hasDate = Boolean(nextMatch?.date);

  let lastMatchCard: React.ReactNode = null;
  if (clubLastMatch) {
    lastMatchCard = (
      <LastMatchPremiumCard
        badgeLabel="Товарищеский матч"
        date={clubLastMatch.date}
        homeName="НДФК"
        awayName={clubLastMatch.opponent}
        homeIsUs
        homeGoals={clubLastMatch.ndfkGoals}
        awayGoals={clubLastMatch.opponentGoals}
        scorers={clubLastMatch.scorers}
        assisters={clubLastMatch.assisters}
      />
    );
  } else if (hasPlayed && lastMatch) {
    lastMatchCard = (
      <LastMatchPremiumCard
        badgeLabel="Чемпионат"
        date={lastMatch.date}
        homeName={lastMatch.homeName}
        awayName={lastMatch.awayName}
        homeLogoUrl={lastMatch.homeLogoUrl}
        awayLogoUrl={lastMatch.awayLogoUrl}
        homeIsUs={lastMatch.isHome}
        homeGoals={lastMatch.homeGoals ?? 0}
        awayGoals={lastMatch.awayGoals ?? 0}
        scorers={lastMatch.scorers}
        assisters={lastMatch.assisters}
      />
    );
  }

  return (
    <section className="mb-2 sm:mb-4">
      <div className="home-dash-card overflow-hidden rounded-2xl ring-1 ring-amber-400/20">
        <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/75">
            🏆 {championshipName}
          </p>
          <Link
            href="/championship"
            className="shrink-0 text-[10px] font-bold text-amber-200/80 hover:text-amber-100"
          >
            Таблица →
          </Link>
        </div>

        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] items-stretch gap-2 px-3 pb-1.5">
          <div className="min-w-0">
            <div className="mb-1 grid grid-cols-[20px_minmax(0,1fr)_26px_26px] items-center gap-1.5 px-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">
              <span>№</span>
              <span>Команда</span>
              <span className="text-center">О</span>
              <span className="text-center">В</span>
            </div>
            <ul className="space-y-0.5">
              {standingsSlice.map((row) => (
                <li
                  key={row.teamId}
                  className={`grid grid-cols-[20px_minmax(0,1fr)_26px_26px] items-center gap-1.5 rounded-lg px-2 py-0.5 ${
                    row.isHomeClub ? "bg-amber-500/20 championship-home-row-glow" : ""
                  }`}
                >
                  <span className="flex items-center text-[11px] font-bold tabular-nums text-slate-500">
                    <AnimatedValue value={row.place} />
                    <MovementBadge change={row.positionChange} />
                  </span>
                  <span
                    className={`min-w-0 truncate text-[12px] font-extrabold ${
                      row.isHomeClub ? "text-amber-100" : "text-slate-300"
                    }`}
                  >
                    {row.teamName}
                  </span>
                  <span
                    className={`text-center text-[12px] font-black tabular-nums ${
                      row.isHomeClub ? "text-amber-200" : "text-slate-400"
                    }`}
                  >
                    <AnimatedValue value={row.points} />
                  </span>
                  <span className="text-center text-[11px] font-bold tabular-nums text-emerald-300/80">
                    <AnimatedValue value={row.won} />
                  </span>

                </li>
              ))}
            </ul>
            {ourPlace ? (
              <p className="mt-1 text-[10px] font-semibold text-amber-100/70">
                Мы сейчас на <AnimatedValue value={ourPlace} />-м месте
              </p>
            ) : null}

          </div>

          <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-white/8 bg-black/20 px-2 py-1">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
              📅 Следующий матч
            </p>
            {nextMatch ? (
              <>
                <p className="mt-0.5 text-[11px] font-extrabold leading-snug text-white">
                  {nextMatch.ourName} — {nextMatch.opponent}
                </p>
                {hasDate ? (
                  <>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-300">
                      {formatMatchDate(nextMatch.date)}
                    </p>
                    {nextMatch.time ? (
                      <p className="text-[11px] font-bold text-amber-200/90">
                        {formatMatchTime(nextMatch.time)}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    Дата уточняется
                  </p>
                )}
              </>
            ) : (
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                Дата уточняется
              </p>
            )}

            <div className="mt-auto flex flex-1 items-end justify-center pt-1">
              <ChampionshipRoundRing
                currentRound={progress.currentRound}
                totalRounds={progress.totalRounds}
                percent={progress.percent}
                size={42}
              />
            </div>
          </div>
        </div>

        {lastMatchCard}
      </div>
    </section>
  );
}
