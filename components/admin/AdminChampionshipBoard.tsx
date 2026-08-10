"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChampionshipStandingsContext from "@/components/championship/ChampionshipStandingsContext";
import ChampionshipTable from "@/components/championship/ChampionshipTable";
import {
  applyScoreDrafts,
  buildAdminRoundGroups,
  findActiveRoundGroup,
  type MatchRoundGroup,
} from "@/lib/championship/groupMatchesByRound";
import { buildChampionshipStandings } from "@/lib/championship/standings";
import { getStandingsContext } from "@/lib/championship/standingsContext";
import type {
  ChampionshipMatch,
  ChampionshipRound,
  ChampionshipStandingRow,
  ChampionshipTeam,
} from "@/lib/championship/types";

type PlayerOption = {
  id: number;
  name: string;
};

type LineDraft = {
  playerId: number;
  goals: number;
  assists: number;
  isMvp: boolean;
  matchRating: string;
  redCards: boolean;
};

function teamName(match: ChampionshipMatch, side: "home" | "away"): string {
  const team = side === "home" ? match.home_team : match.away_team;
  const raw = Array.isArray(team) ? team[0] : team;
  return raw?.name ?? (side === "home" ? "Хозяева" : "Гости");
}

function involvesClub(match: ChampionshipMatch, clubTeamId: number | null): boolean {
  if (clubTeamId == null) return false;
  return match.home_team_id === clubTeamId || match.away_team_id === clubTeamId;
}

function draftIsDirty(
  match: ChampionshipMatch,
  draft: { home: string; away: string } | undefined
): boolean {
  if (!draft) return false;
  const homeRaw = draft.home.trim();
  const awayRaw = draft.away.trim();
  if (homeRaw === "" || awayRaw === "") return false;

  const home = Number(homeRaw);
  const away = Number(awayRaw);
  if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) {
    return false;
  }

  return (
    match.home_goals !== home ||
    match.away_goals !== away ||
    !match.is_played
  );
}

function CreateNextRoundButton({
  nextRoundNumber,
  onCreated,
}: {
  nextRoundNumber: number;
  onCreated: (roundNumber: number) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRound() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/championship/create-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundNumber: nextRoundNumber }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Не удалось создать тур");
        return;
      }
      onCreated(nextRoundNumber);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-dashed border-amber-400/30 bg-amber-500/[0.06] p-3">
      <p className="text-[12px] font-bold text-amber-100">
        Следующий тур ещё не создан
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
        Чтобы заранее добавить пары на <strong className="text-white">тур {nextRoundNumber}</strong>,
        сначала создайте тур — затем внутри него появится «+ Добавить матч».
      </p>
      <button
        type="button"
        onClick={createRound}
        disabled={creating}
        className="mt-2 rounded-xl bg-amber-500/25 px-3 py-2 text-[12px] font-bold text-amber-50 ring-1 ring-amber-400/35 disabled:opacity-50"
      >
        {creating ? "Создаём…" : `+ Создать тур ${nextRoundNumber}`}
      </button>
      {error ? <p className="mt-2 text-[11px] text-red-300">{error}</p> : null}
    </div>
  );
}

function AddRoundMatchForm({
  group,
  teams,
  homeTeamId,
  onCreated,
}: {
  group: MatchRoundGroup;
  teams: ChampionshipTeam[];
  homeTeamId: number | null;
  onCreated: () => void;
}) {
  const defaultDate = group.matches[0]?.match_date ?? new Date().toISOString().slice(0, 10);
  const defaultTime = group.matches[0]?.match_time || "18:00";
  const otherTeamId = teams.find((t) => t.id !== homeTeamId)?.id ?? teams[1]?.id ?? teams[0]?.id;
  const [matchDate, setMatchDate] = useState(defaultDate);
  const [matchTime, setMatchTime] = useState(defaultTime);
  const [location, setLocation] = useState(group.matches[0]?.location ?? "");
  const [withScore, setWithScore] = useState(false);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [homeTeamIdForm, setHomeTeamIdForm] = useState(
    String(homeTeamId ?? teams[0]?.id ?? "")
  );
  const [awayTeamIdForm, setAwayTeamIdForm] = useState(String(otherTeamId ?? ""));
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(markPlayed: boolean) {
    if (markPlayed) {
      const home = Number(homeGoals);
      const away = Number(awayGoals);
      if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) {
        setError("Укажите корректный счёт");
        return;
      }
    }

    setCreating(true);
    setError(null);
    setOkMessage(null);
    if (group.roundId == null) {
      setError("Сначала создайте тур кнопкой «Создать тур» выше");
      setCreating(false);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) {
      setError("Укажите дату матча");
      setCreating(false);
      return;
    }
    try {
      const response = await fetch("/api/championship/create-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeTeamId: Number(homeTeamIdForm),
          awayTeamId: Number(awayTeamIdForm),
          matchDate,
          matchTime,
          location,
          roundId: group.roundId,
          ...(markPlayed
            ? {
                markPlayed: true,
                homeGoals: Number(homeGoals),
                awayGoals: Number(awayGoals),
              }
            : {}),
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Не удалось добавить матч");
        return;
      }
      setHomeGoals("");
      setAwayGoals("");
      setOkMessage(
        markPlayed
          ? "Матч сохранён со счётом"
          : json.clubScheduled
            ? "Матч запланирован — виден игрокам в расписании"
            : "Матч запланирован — виден в Чемпионат → Матчи"
      );
      onCreated();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setCreating(false);
    }
  }

  if (teams.length < 2) return null;

  return (
    <div className="mt-3 rounded-xl border border-dashed border-cyan-400/25 bg-cyan-500/[0.05] p-2.5">
      <p className="text-[11px] font-bold text-cyan-100">
        + Добавить матч в {group.title}
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
        «Запланировать матч» — без счёта. Счёт — после игры или через «Сохранить тур».
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="text-[10px] text-slate-400">
          Дата
          <input
            type="date"
            className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
          />
        </label>
        <label className="text-[10px] text-slate-400">
          Время
          <input
            type="time"
            className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white"
            value={matchTime}
            onChange={(e) => setMatchTime(e.target.value)}
          />
        </label>
        <label className="col-span-2 text-[10px] text-slate-400 sm:col-span-1">
          Место
          <input
            className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Поле / стадион"
          />
        </label>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-[10px] text-slate-400">
          Хозяева
          <select
            className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white"
            value={homeTeamIdForm}
            onChange={(e) => setHomeTeamIdForm(e.target.value)}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] text-slate-400">
          Гости
          <select
            className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white"
            value={awayTeamIdForm}
            onChange={(e) => setAwayTeamIdForm(e.target.value)}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {withScore ? (
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-1.5">
          <label className="text-[10px] text-slate-400">
            Голы хоз.
            <input
              type="number"
              min={0}
              className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm font-bold text-white"
              value={homeGoals}
              onChange={(e) => setHomeGoals(e.target.value)}
              placeholder="0"
            />
          </label>
          <span className="pb-1.5 text-sm font-black text-slate-500">:</span>
          <label className="text-[10px] text-slate-400">
            Голы гост.
            <input
              type="number"
              min={0}
              className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm font-bold text-white"
              value={awayGoals}
              onChange={(e) => setAwayGoals(e.target.value)}
              placeholder="0"
            />
          </label>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-[11px] text-rose-300">{error}</p> : null}
      {okMessage ? (
        <p className="mt-2 text-[11px] text-emerald-300">{okMessage}</p>
      ) : null}
      <div className="mt-2 space-y-1.5">
        <button
          type="button"
          disabled={creating}
          onClick={() => void submit(false)}
          className="w-full rounded-lg bg-cyan-500/25 px-2 py-2 text-[12px] font-bold text-cyan-50 ring-1 ring-cyan-400/35 disabled:opacity-50"
        >
          {creating ? "Сохраняем…" : "📅 Запланировать матч"}
        </button>
        <button
          type="button"
          disabled={creating}
          onClick={() => {
            if (!withScore) {
              setWithScore(true);
              return;
            }
            void submit(true);
          }}
          className="w-full rounded-lg bg-white/5 px-2 py-1.5 text-[11px] font-bold text-slate-300 ring-1 ring-white/10 disabled:opacity-50"
        >
          {withScore ? (creating ? "…" : "Сохранить с результатом") : "Уже сыграно — ввести счёт"}
        </button>
      </div>
    </div>
  );
}

function RoundScoreSection({
  group,
  scoreDrafts,
  setScoreDrafts,
  savingRound,
  onSaveRound,
  onDeleteMatch,
  onResetMatch,
  deletingMatchId,
  resettingMatchId,
  homeTeamId,
  teams,
  onRefresh,
}: {
  group: MatchRoundGroup;
  scoreDrafts: Record<number, { home: string; away: string }>;
  setScoreDrafts: React.Dispatch<
    React.SetStateAction<Record<number, { home: string; away: string }>>
  >;
  savingRound: number | null;
  onSaveRound: (group: MatchRoundGroup) => void;
  onDeleteMatch: (match: ChampionshipMatch) => void;
  onResetMatch: (match: ChampionshipMatch) => void;
  deletingMatchId: number | null;
  resettingMatchId: number | null;
  homeTeamId: number | null;
  teams: ChampionshipTeam[];
  onRefresh: () => void;
}) {
  const dirtyCount = group.matches.filter((match) =>
    draftIsDirty(match, scoreDrafts[match.id])
  ).length;
  const saving = savingRound === group.roundNumber;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-bold text-white">{group.title}</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {group.playedCount}/{group.totalCount} сыграно
            {group.matches[0]?.match_date
              ? ` · ${group.matches[0].match_date}`
              : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${
            group.totalCount === 0
              ? "bg-slate-500/15 text-slate-200 ring-1 ring-white/10"
              : group.isComplete
                ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25"
                : "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/25"
          }`}
        >
          {group.totalCount === 0
            ? "Нет матчей"
            : group.isComplete
              ? "Завершён"
              : "В процессе"}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {group.matches.length === 0 ? (
          <p className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-[11px] text-slate-400">
            Матчей в этом туре пока нет — добавьте пары ниже.
          </p>
        ) : null}
        {group.matches.map((match) => {
          const draft = scoreDrafts[match.id] ?? { home: "", away: "" };
          const isClub = involvesClub(match, homeTeamId);
          const dirty = draftIsDirty(match, draft);

          return (
            <div
              key={match.id}
              className={`rounded-xl border px-2.5 py-2 ${
                dirty
                  ? "border-amber-400/25 bg-amber-500/[0.06]"
                  : match.is_played
                    ? "border-white/6 bg-black/15"
                    : "border-white/8 bg-black/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-white">
                    {teamName(match, "home")}
                    <span className="mx-1 font-normal text-slate-500">—</span>
                    {teamName(match, "away")}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {match.match_date}
                    {" · "}
                    {match.match_time || "18:00"}
                    {match.location ? ` · ${match.location}` : ""}
                    {match.is_played ? " · в таблице" : " · запланирован"}
                    {isClub ? " · наш матч" : ""}
                  </p>
                </div>
                {!match.is_played && !match.is_live ? (
                  <span className="shrink-0 rounded-lg bg-cyan-500/15 px-2 py-1 text-[10px] font-bold text-cyan-100 ring-1 ring-cyan-400/25">
                    📅 Расписание
                  </span>
                ) : null}
                {match.is_live ? (
                  <span className="shrink-0 rounded-lg bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-100 ring-1 ring-red-400/25">
                    LIVE
                  </span>
                ) : null}
              </div>

              {!match.is_played ? (
                <p className="mt-2 text-[10px] text-slate-500">
                  Счёт ниже — только после игры. Пока матч запланирован, игроки
                  видят пару и дату в расписании.
                </p>
              ) : null}

              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-1.5">
                <label className="text-[9px] text-slate-500">
                  {teamName(match, "home")}
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm font-bold text-white"
                    value={draft.home}
                    disabled={match.is_live}
                    onChange={(e) =>
                      setScoreDrafts((prev) => ({
                        ...prev,
                        [match.id]: {
                          home: e.target.value,
                          away: prev[match.id]?.away ?? "",
                        },
                      }))
                    }
                  />
                </label>
                <span className="pb-1.5 text-sm font-black text-slate-500">:</span>
                <label className="text-[9px] text-slate-500">
                  {teamName(match, "away")}
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm font-bold text-white"
                    value={draft.away}
                    disabled={match.is_live}
                    onChange={(e) =>
                      setScoreDrafts((prev) => ({
                        ...prev,
                        [match.id]: {
                          home: prev[match.id]?.home ?? "",
                          away: e.target.value,
                        },
                      }))
                    }
                  />
                </label>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {match.is_played ? (
                  <button
                    type="button"
                    onClick={() => onResetMatch(match)}
                    disabled={resettingMatchId === match.id || match.is_live}
                    className="rounded-lg bg-cyan-500/15 px-2 py-1 text-[10px] font-bold text-cyan-100 ring-1 ring-cyan-400/25 disabled:opacity-50"
                  >
                    {resettingMatchId === match.id ? "..." : "Сбросить результат"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDeleteMatch(match)}
                  disabled={deletingMatchId === match.id || match.is_live}
                  className="rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-bold text-rose-100 ring-1 ring-rose-400/25 disabled:opacity-50"
                >
                  {deletingMatchId === match.id ? "..." : "Удалить матч"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSaveRound(group)}
        disabled={saving || dirtyCount === 0 || group.totalCount === 0}
        className="mt-3 w-full rounded-xl bg-emerald-500/20 px-3 py-2.5 text-[12px] font-bold text-emerald-100 ring-1 ring-emerald-400/30 disabled:opacity-40"
      >
        {saving
          ? "Сохраняем тур…"
          : dirtyCount > 0
            ? `Сохранить тур (${dirtyCount})`
            : "Все счета сохранены"}
      </button>

      <AddRoundMatchForm
        group={group}
        teams={teams}
        homeTeamId={homeTeamId}
        onCreated={onRefresh}
      />
    </section>
  );
}

export default function AdminChampionshipBoard({
  teams,
  matches,
  players,
  homeTeamId,
  standings,
  rounds,
  schemaHint,
}: {
  teams: ChampionshipTeam[];
  matches: ChampionshipMatch[];
  players: PlayerOption[];
  homeTeamId: number | null;
  standings: ChampionshipStandingRow[];
  rounds: Pick<ChampionshipRound, "id" | "round_number" | "title">[];
  schemaHint: string | null;
}) {
  const router = useRouter();

  const roundGroups = useMemo(
    () => buildAdminRoundGroups(matches, rounds),
    [matches, rounds]
  );
  const nextRoundNumber = useMemo(() => {
    const numbers = [
      ...rounds.map((round) => round.round_number),
      ...roundGroups.map((group) => group.roundNumber),
    ];
    return (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  }, [rounds, roundGroups]);
  const canCreateNextRound = !rounds.some(
    (round) => round.round_number === nextRoundNumber
  );
  const activeRound = useMemo(
    () => findActiveRoundGroup(roundGroups),
    [roundGroups]
  );
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  useEffect(() => {
    if (activeRound && expandedRound == null) {
      setExpandedRound(activeRound.roundNumber);
    }
  }, [activeRound, expandedRound]);

  const editableMatches = useMemo(
    () =>
      matches
        .filter((match) => !match.is_played && !match.is_live)
        .sort(
          (a, b) =>
            new Date(`${a.match_date}T${a.match_time || "00:00"}`).getTime() -
            new Date(`${b.match_date}T${b.match_time || "00:00"}`).getTime()
        ),
    [matches]
  );
  const [manageMatchId, setManageMatchId] = useState(
    String(editableMatches[0]?.id ?? "")
  );
  const [manageMatchDate, setManageMatchDate] = useState(
    editableMatches[0]?.match_date ?? ""
  );
  const [manageMatchTime, setManageMatchTime] = useState(
    editableMatches[0]?.match_time ?? "18:00"
  );
  const [manageLocation, setManageLocation] = useState(
    editableMatches[0]?.location ?? ""
  );
  const [managing, setManaging] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageOk, setManageOk] = useState<string | null>(null);

  const [scoreDrafts, setScoreDrafts] = useState<
    Record<number, { home: string; away: string }>
  >(() =>
    Object.fromEntries(
      matches.map((match) => [
        match.id,
        {
          home: match.home_goals != null ? String(match.home_goals) : "",
          away: match.away_goals != null ? String(match.away_goals) : "",
        },
      ])
    )
  );
  const [savingRound, setSavingRound] = useState<number | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<number | null>(null);
  const [resettingMatchId, setResettingMatchId] = useState<number | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreOk, setScoreOk] = useState<string | null>(null);
  const [previewTable, setPreviewTable] = useState(false);

  const clubMatches = useMemo(
    () => matches.filter((match) => involvesClub(match, homeTeamId)),
    [matches, homeTeamId]
  );
  const [selectedMatchId, setSelectedMatchId] = useState(
    String(
      clubMatches.find((m) => !m.is_played)?.id ??
        clubMatches[0]?.id ??
        matches[0]?.id ??
        ""
    )
  );
  const [homeGoals, setHomeGoals] = useState("0");
  const [awayGoals, setAwayGoals] = useState("0");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishOk, setFinishOk] = useState<string | null>(null);

  const previewStandings = useMemo(() => {
    if (!previewTable) return standings;
    const withDrafts = applyScoreDrafts(matches, scoreDrafts);
    return buildChampionshipStandings(teams, withDrafts, homeTeamId);
  }, [previewTable, standings, matches, scoreDrafts, teams, homeTeamId]);

  const standingsContext = useMemo(
    () => getStandingsContext(previewStandings, homeTeamId),
    [previewStandings, homeTeamId]
  );

  const selectedManageMatch = useMemo(
    () => editableMatches.find((m) => String(m.id) === manageMatchId) ?? null,
    [editableMatches, manageMatchId]
  );
  const selectedMatch = useMemo(
    () => matches.find((m) => String(m.id) === selectedMatchId) ?? null,
    [matches, selectedMatchId]
  );

  useEffect(() => {
    setScoreDrafts((prev) => {
      const next = { ...prev };
      for (const match of matches) {
        next[match.id] = {
          home:
            match.home_goals != null
              ? String(match.home_goals)
              : next[match.id]?.home ?? "",
          away:
            match.away_goals != null
              ? String(match.away_goals)
              : next[match.id]?.away ?? "",
        };
      }
      return next;
    });
  }, [matches]);

  useEffect(() => {
    if (!selectedManageMatch) return;
    setManageMatchDate(selectedManageMatch.match_date);
    setManageMatchTime(selectedManageMatch.match_time || "18:00");
    setManageLocation(selectedManageMatch.location ?? "");
  }, [selectedManageMatch]);

  useEffect(() => {
    if (!selectedMatch) return;
    const draft = scoreDrafts[selectedMatch.id];
    if (draft?.home && draft?.away) {
      setHomeGoals(draft.home);
      setAwayGoals(draft.away);
    } else if (
      selectedMatch.home_goals != null &&
      selectedMatch.away_goals != null
    ) {
      setHomeGoals(String(selectedMatch.home_goals));
      setAwayGoals(String(selectedMatch.away_goals));
    }
  }, [selectedMatch, scoreDrafts]);

  const clubTeamId = homeTeamId;

  function addLine(playerId: number) {
    if (lines.some((line) => line.playerId === playerId)) return;
    setLines((prev) => [
      ...prev,
      {
        playerId,
        goals: 0,
        assists: 0,
        isMvp: false,
        matchRating: "",
        redCards: false,
      },
    ]);
  }

  async function saveRoundScores(group: MatchRoundGroup) {
    const entries = group.matches
      .map((match) => {
        const draft = scoreDrafts[match.id];
        if (!draft || !draftIsDirty(match, draft)) return null;
        return {
          matchId: match.id,
          homeGoals: Number(draft.home),
          awayGoals: Number(draft.away),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null);

    if (entries.length === 0) {
      setScoreError("Нет изменённых счетов в этом туре");
      return;
    }

    setSavingRound(group.roundNumber);
    setScoreError(null);
    setScoreOk(null);

    try {
      const response = await fetch("/api/championship/matches/batch-score", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: entries }),
      });
      const json = await response.json();
      if (!response.ok) {
        setScoreError(json.error ?? "Не удалось сохранить счёт тура");
        return;
      }
      setScoreOk(`Тур сохранён: ${json.saved} матч(ей), таблица обновлена`);
      router.refresh();
    } catch {
      setScoreError("Сеть недоступна");
    } finally {
      setSavingRound(null);
    }
  }

  async function deleteMatchRecord(match: ChampionshipMatch) {
    const label = `${teamName(match, "home")} — ${teamName(match, "away")}`;
    const prompt = match.is_played
      ? `Удалить сыгранный матч ${label}? Он исчезнет из таблицы и истории.`
      : `Удалить матч ${label}?`;
    if (!confirm(prompt)) return;

    setDeletingMatchId(match.id);
    setScoreError(null);
    setScoreOk(null);
    try {
      const force = match.is_played ? "?force=1" : "";
      const response = await fetch(
        `/api/championship/matches/${match.id}${force}`,
        { method: "DELETE" }
      );
      const json = await response.json();
      if (!response.ok) {
        setScoreError(json.error ?? "Не удалось удалить матч");
        return;
      }
      setScoreOk("Матч удалён");
      router.refresh();
    } catch {
      setScoreError("Сеть недоступна");
    } finally {
      setDeletingMatchId(null);
    }
  }

  async function resetMatchRecord(match: ChampionshipMatch) {
    const label = `${teamName(match, "home")} — ${teamName(match, "away")}`;
    if (
      !confirm(
        `Сбросить результат ${label}? Матч вернётся в расписание без счёта.`
      )
    ) {
      return;
    }

    setResettingMatchId(match.id);
    setScoreError(null);
    setScoreOk(null);
    try {
      const response = await fetch(`/api/championship/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetResult: true }),
      });
      const json = await response.json();
      if (!response.ok) {
        setScoreError(json.error ?? "Не удалось сбросить результат");
        return;
      }
      setScoreOk("Результат сброшен, матч снова в расписании");
      router.refresh();
    } catch {
      setScoreError("Сеть недоступна");
    } finally {
      setResettingMatchId(null);
    }
  }

  async function updateManagedMatch() {
    if (!selectedManageMatch) return;
    setManaging(true);
    setManageError(null);
    setManageOk(null);
    try {
      const response = await fetch(
        `/api/championship/matches/${selectedManageMatch.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchDate: manageMatchDate,
            matchTime: manageMatchTime,
            location: manageLocation,
          }),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        setManageError(json.error ?? "Не удалось обновить матч");
        return;
      }
      setManageOk("Матч обновлён");
      router.refresh();
    } catch {
      setManageError("Сеть недоступна");
    } finally {
      setManaging(false);
    }
  }

  async function deleteManagedMatch() {
    if (!selectedManageMatch) return;
    const label = `${teamName(selectedManageMatch, "home")} — ${teamName(
      selectedManageMatch,
      "away"
    )}`;
    if (!confirm(`Удалить матч ${label}?`)) return;

    setManaging(true);
    setManageError(null);
    setManageOk(null);
    try {
      const response = await fetch(
        `/api/championship/matches/${selectedManageMatch.id}`,
        { method: "DELETE" }
      );
      const json = await response.json();
      if (!response.ok) {
        setManageError(json.error ?? "Не удалось удалить матч");
        return;
      }
      setManageOk("Матч удалён");
      setManageMatchId("");
      router.refresh();
    } catch {
      setManageError("Сеть недоступна");
    } finally {
      setManaging(false);
    }
  }

  async function finishMatch() {
    if (!selectedMatch || clubTeamId == null) {
      setFinishError("Нет матча или домашней команды");
      return;
    }
    if (!involvesClub(selectedMatch, clubTeamId)) {
      setFinishError("Статистика игроков только для матчей Дженгутая");
      return;
    }
    setFinishing(true);
    setFinishError(null);
    setFinishOk(null);
    try {
      const response = await fetch("/api/championship/finish-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selectedMatch.id,
          homeGoals: Number(homeGoals),
          awayGoals: Number(awayGoals),
          lines: lines.map((line) => ({
            playerId: line.playerId,
            teamId: clubTeamId,
            goals: line.goals,
            assists: line.assists,
            isMvp: line.isMvp,
            matchRating: line.matchRating ? Number(line.matchRating) : null,
            redCards: line.redCards ? 1 : 0,
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setFinishError(json.error ?? "Ошибка сохранения");
        return;
      }
      setFinishOk("Матч сохранён: обновлены статистика чемпионата и карьера");
      setLines([]);
      router.refresh();
    } catch {
      setFinishError("Сеть недоступна");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="space-y-4">
      {schemaHint ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          {schemaHint}
        </p>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white">
              <span className="mr-1.5 text-amber-400/90">1.</span>
              Таблица сезона
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Обновляется после сохранения счёта в туре.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => setPreviewTable((prev) => !prev)}
              className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                previewTable
                  ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/30"
                  : "bg-white/5 text-slate-400 ring-1 ring-white/10"
              }`}
            >
              {previewTable ? "Превью" : "Факт"}
            </button>
            <Link
              href="/championship/matches"
              className="text-[10px] font-semibold text-cyan-300/90 hover:underline"
            >
              Все матчи →
            </Link>
          </div>
        </div>
        <div className="mt-2">
          <ChampionshipStandingsContext context={standingsContext} />
        </div>
        <div className="mt-3">
          <ChampionshipTable rows={previewStandings} compact showMovement={!previewTable} />
        </div>
        {previewTable ? (
          <p className="mt-2 text-[10px] text-amber-200/70">
            Превью учитывает несохранённые счета из формы ниже.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <h2 className="text-sm font-bold text-white">
          <span className="mr-1.5 text-amber-400/90">2.</span>
          Счёт по турам
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Создайте тур, добавьте матчи, введите счёт и сохраните тур.
        </p>

        {roundGroups.length === 0 ? (
          <div className="mt-3 space-y-3">
            <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-[12px] text-slate-400">
              Матчей чемпионата пока нет.
            </p>
            {canCreateNextRound ? (
              <CreateNextRoundButton
                nextRoundNumber={nextRoundNumber}
                onCreated={(roundNumber) => {
                  setExpandedRound(roundNumber);
                  router.refresh();
                }}
              />
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {roundGroups.map((group) => (
                <button
                  key={group.roundNumber}
                  type="button"
                  onClick={() =>
                    setExpandedRound((prev) =>
                      prev === group.roundNumber ? null : group.roundNumber
                    )
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                    expandedRound === group.roundNumber
                      ? "bg-amber-500/25 text-amber-50 ring-1 ring-amber-400/35"
                      : group.isComplete
                        ? "bg-emerald-500/10 text-emerald-100/90 ring-1 ring-emerald-400/20"
                        : "bg-white/5 text-slate-300 ring-1 ring-white/10"
                  }`}
                >
                  {group.title}
                  <span className="ml-1 text-[10px] opacity-70">
                    {group.playedCount}/{group.totalCount}
                  </span>
                </button>
              ))}
            </div>

            {canCreateNextRound ? (
              <CreateNextRoundButton
                nextRoundNumber={nextRoundNumber}
                onCreated={(roundNumber) => {
                  setExpandedRound(roundNumber);
                  router.refresh();
                }}
              />
            ) : null}

            {expandedRound != null ? (
              <div className="mt-3">
                {roundGroups
                  .filter((group) => group.roundNumber === expandedRound)
                  .map((group) => (
                    <RoundScoreSection
                      key={group.roundNumber}
                      group={group}
                      scoreDrafts={scoreDrafts}
                      setScoreDrafts={setScoreDrafts}
                      savingRound={savingRound}
                      onSaveRound={saveRoundScores}
                      onDeleteMatch={deleteMatchRecord}
                      onResetMatch={resetMatchRecord}
                      deletingMatchId={deletingMatchId}
                      resettingMatchId={resettingMatchId}
                      homeTeamId={homeTeamId}
                      teams={teams}
                      onRefresh={() => router.refresh()}
                    />
                  ))}
              </div>
            ) : null}
          </>
        )}

        {scoreError ? (
          <p className="mt-2 text-[12px] text-rose-300">{scoreError}</p>
        ) : null}
        {scoreOk ? (
          <p className="mt-2 text-[12px] text-emerald-300">{scoreOk}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <h2 className="text-sm font-bold text-white">
          <span className="mr-1.5 text-amber-400/90">3.</span>
          Наш матч: статистика игроков
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Голы, пасы и MVP наших игроков — после матча Дженгутая.
        </p>

        <label className="mt-3 block text-[11px] text-slate-400">
          Матч Дженгутая
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
          >
            {clubMatches.length === 0 ? (
              <option value="">Нет матчей Дженгутая</option>
            ) : (
              clubMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  {teamName(match, "home")} — {teamName(match, "away")} ·{" "}
                  {match.match_date}
                  {match.is_played ? " (сыгран)" : ""}
                </option>
              ))
            )}
          </select>
        </label>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[11px] text-slate-400">
            Голы хозяев
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
              value={homeGoals}
              onChange={(e) => setHomeGoals(e.target.value)}
            />
          </label>
          <label className="text-[11px] text-slate-400">
            Голы гостей
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
              value={awayGoals}
              onChange={(e) => setAwayGoals(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-3">
          <p className="text-[11px] font-semibold text-slate-300">
            Статистика игроков
          </p>
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
            defaultValue=""
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id) addLine(id);
              e.target.value = "";
            }}
          >
            <option value="">+ Добавить игрока</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>

          <div className="mt-2 space-y-2">
            {lines.map((line) => {
              const player = players.find((p) => p.id === line.playerId);
              return (
                <div
                  key={line.playerId}
                  className="rounded-xl border border-white/8 bg-black/20 px-2 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-bold text-white">
                      {player?.name ?? `#${line.playerId}`}
                    </p>
                    <button
                      type="button"
                      className="text-[10px] text-slate-500"
                      onClick={() =>
                        setLines((prev) =>
                          prev.filter((row) => row.playerId !== line.playerId)
                        )
                      }
                    >
                      Убрать
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    <label className="text-[9px] text-slate-500">
                      Голы
                      <input
                        type="number"
                        min={0}
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-1.5 py-1 text-xs text-white"
                        value={line.goals}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((row) =>
                              row.playerId === line.playerId
                                ? {
                                    ...row,
                                    goals: Math.max(
                                      0,
                                      Number(e.target.value) || 0
                                    ),
                                  }
                                : row
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-[9px] text-slate-500">
                      Пасы
                      <input
                        type="number"
                        min={0}
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-1.5 py-1 text-xs text-white"
                        value={line.assists}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((row) =>
                              row.playerId === line.playerId
                                ? {
                                    ...row,
                                    assists: Math.max(
                                      0,
                                      Number(e.target.value) || 0
                                    ),
                                  }
                                : row
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-[9px] text-slate-500">
                      Оценка
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-1.5 py-1 text-xs text-white"
                        value={line.matchRating}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((row) =>
                              row.playerId === line.playerId
                                ? { ...row, matchRating: e.target.value }
                                : row
                            )
                          )
                        }
                      />
                    </label>
                    <label className="flex items-end gap-1 pb-1 text-[9px] text-slate-500">
                      <input
                        type="checkbox"
                        checked={line.isMvp}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((row) =>
                              row.playerId === line.playerId
                                ? { ...row, isMvp: e.target.checked }
                                : { ...row, isMvp: false }
                            )
                          )
                        }
                      />
                      MVP
                    </label>
                    <label className="flex items-end gap-1 pb-1 text-[9px] text-rose-300/80">
                      <input
                        type="checkbox"
                        checked={line.redCards}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((row) =>
                              row.playerId === line.playerId
                                ? { ...row, redCards: e.target.checked }
                                : row
                            )
                          )
                        }
                      />
                      КК
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {finishError ? (
          <p className="mt-2 text-[12px] text-rose-300">{finishError}</p>
        ) : null}
        {finishOk ? (
          <p className="mt-2 text-[12px] text-emerald-300">{finishOk}</p>
        ) : null}
        <button
          type="button"
          onClick={finishMatch}
          disabled={finishing || !selectedMatch || clubMatches.length === 0}
          className="mt-3 rounded-xl bg-emerald-500/20 px-3 py-2 text-[12px] font-bold text-emerald-100 ring-1 ring-emerald-400/30 disabled:opacity-50"
        >
          {finishing ? "Сохраняем…" : "Завершить и обновить статистику игроков"}
        </button>
      </section>

      <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <summary className="cursor-pointer text-sm font-bold text-white">
          Изменить / удалить будущий матч
        </summary>
        <p className="mt-2 text-[11px] text-slate-500">
          Поправьте дату, время, место или удалите дубль, пока матч не сыгран и
          не LIVE.
        </p>

        {editableMatches.length === 0 ? (
          <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-[12px] text-slate-400">
            Будущих матчей для изменения пока нет.
          </p>
        ) : (
          <>
            <label className="mt-3 block text-[11px] text-slate-400">
              Матч
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
                value={manageMatchId}
                onChange={(e) => setManageMatchId(e.target.value)}
              >
                {editableMatches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {teamName(match, "home")} — {teamName(match, "away")} ·{" "}
                    {match.match_date} {match.match_time}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] text-slate-400">
                Дата
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
                  value={manageMatchDate}
                  onChange={(e) => setManageMatchDate(e.target.value)}
                />
              </label>
              <label className="text-[11px] text-slate-400">
                Время
                <input
                  type="time"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
                  value={manageMatchTime}
                  onChange={(e) => setManageMatchTime(e.target.value)}
                />
              </label>
              <label className="text-[11px] text-slate-400 sm:col-span-2">
                Место
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
                  value={manageLocation}
                  onChange={(e) => setManageLocation(e.target.value)}
                  placeholder="Стадион / поле"
                />
              </label>
            </div>

            {manageError ? (
              <p className="mt-2 text-[12px] text-rose-300">{manageError}</p>
            ) : null}
            {manageOk ? (
              <p className="mt-2 text-[12px] text-emerald-300">{manageOk}</p>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={updateManagedMatch}
                disabled={managing || !selectedManageMatch}
                className="rounded-xl bg-cyan-500/20 px-3 py-2 text-[12px] font-bold text-cyan-100 ring-1 ring-cyan-400/30 disabled:opacity-50"
              >
                {managing ? "..." : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={deleteManagedMatch}
                disabled={managing || !selectedManageMatch}
                className="rounded-xl bg-rose-500/15 px-3 py-2 text-[12px] font-bold text-rose-100 ring-1 ring-rose-400/30 disabled:opacity-50"
              >
                Удалить матч
              </button>
            </div>
          </>
        )}
      </details>
    </div>
  );
}
