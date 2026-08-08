"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ChampionshipTable from "@/components/championship/ChampionshipTable";
import {
  applyScoreDrafts,
  findActiveRoundGroup,
  groupMatchesByRound,
  type MatchRoundGroup,
} from "@/lib/championship/groupMatchesByRound";
import { buildChampionshipStandings } from "@/lib/championship/standings";
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
            group.isComplete
              ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25"
              : "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/25"
          }`}
        >
          {group.isComplete ? "Завершён" : "В процессе"}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
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
                    {match.match_time || "18:00"}
                    {match.location ? ` · ${match.location}` : ""}
                    {match.is_played ? " · в таблице" : ""}
                    {isClub ? " · наш матч" : ""}
                  </p>
                </div>
                {match.is_live ? (
                  <span className="shrink-0 rounded-lg bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-100 ring-1 ring-red-400/25">
                    LIVE
                  </span>
                ) : null}
              </div>

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
        disabled={saving || dirtyCount === 0}
        className="mt-3 w-full rounded-xl bg-emerald-500/20 px-3 py-2.5 text-[12px] font-bold text-emerald-100 ring-1 ring-emerald-400/30 disabled:opacity-40"
      >
        {saving
          ? "Сохраняем тур…"
          : dirtyCount > 0
            ? `Сохранить тур (${dirtyCount})`
            : "Все счета сохранены"}
      </button>
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
  const [homeTeamIdForm, setHomeTeamIdForm] = useState(
    String(homeTeamId ?? teams[0]?.id ?? "")
  );
  const [awayTeamIdForm, setAwayTeamIdForm] = useState(
    String(teams.find((t) => t.id !== homeTeamId)?.id ?? teams[1]?.id ?? "")
  );
  const [matchDate, setMatchDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [matchTime, setMatchTime] = useState("18:00");
  const [location, setLocation] = useState("");
  const [createHomeGoals, setCreateHomeGoals] = useState("");
  const [createAwayGoals, setCreateAwayGoals] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const roundGroups = useMemo(
    () => groupMatchesByRound(matches, rounds),
    [matches, rounds]
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

  async function createMatch(markPlayed = false) {
    const homeGoalsValue = Number(createHomeGoals);
    const awayGoalsValue = Number(createAwayGoals);
    if (
      markPlayed &&
      (!Number.isFinite(homeGoalsValue) ||
        !Number.isFinite(awayGoalsValue) ||
        homeGoalsValue < 0 ||
        awayGoalsValue < 0)
    ) {
      setCreateError("Укажите корректный счёт");
      return;
    }

    setCreating(true);
    setCreateError(null);
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
          ...(markPlayed
            ? {
                markPlayed: true,
                homeGoals: homeGoalsValue,
                awayGoals: awayGoalsValue,
              }
            : {}),
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setCreateError(json.error ?? "Ошибка создания");
        return;
      }
      if (markPlayed) {
        setCreateHomeGoals("");
        setCreateAwayGoals("");
      }
      router.refresh();
    } catch {
      setCreateError("Сеть недоступна");
    } finally {
      setCreating(false);
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
            <h2 className="text-sm font-bold text-white">Таблица сезона</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Очки пересчитываются после сохранения счёта любого матча тура.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPreviewTable((prev) => !prev)}
            className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${
              previewTable
                ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/30"
                : "bg-white/5 text-slate-400 ring-1 ring-white/10"
            }`}
          >
            {previewTable ? "Превью" : "Факт"}
          </button>
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
        <h2 className="text-sm font-bold text-white">Счёт по турам</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Введите результаты всех матчей тура и нажмите «Сохранить тур» — таблица
          обновится сразу для всех команд.
        </p>

        {roundGroups.length === 0 ? (
          <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-[12px] text-slate-400">
            Матчей чемпионата пока нет.
          </p>
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
        <h2 className="text-sm font-bold text-white">Наш матч: статистика игроков</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Только для матчей Дженгутая. Обновляет голы/пасы в карьере и сезонную
          статистику. Счёт лиги сохраняйте в блоке «Счёт по турам» выше.
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
          Добавить матч сезона
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-[11px] text-slate-400">
            Хозяева
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
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
          <label className="text-[11px] text-slate-400">
            Гости
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
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
          <label className="text-[11px] text-slate-400">
            Дата
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
            />
          </label>
          <label className="text-[11px] text-slate-400">
            Время
            <input
              type="time"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
            />
          </label>
          <label className="text-[11px] text-slate-400 sm:col-span-2">
            Место
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Стадион / поле"
            />
          </label>
          <div className="sm:col-span-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2 rounded-xl border border-white/8 bg-black/20 p-2">
            <label className="text-[11px] text-slate-400">
              Голы хозяев
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-center text-sm font-bold text-white"
                value={createHomeGoals}
                onChange={(e) => setCreateHomeGoals(e.target.value)}
                placeholder="0"
              />
            </label>
            <span className="pb-2 text-sm font-black text-slate-500">:</span>
            <label className="text-[11px] text-slate-400">
              Голы гостей
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-center text-sm font-bold text-white"
                value={createAwayGoals}
                onChange={(e) => setCreateAwayGoals(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>
        </div>
        {createError ? (
          <p className="mt-2 text-[12px] text-rose-300">{createError}</p>
        ) : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => createMatch(false)}
            disabled={creating || teams.length < 2}
            className="rounded-xl bg-amber-500/20 px-3 py-2 text-[12px] font-bold text-amber-100 ring-1 ring-amber-400/30 disabled:opacity-50"
          >
            {creating ? "Создаём…" : "Создать матч"}
          </button>
          <button
            type="button"
            onClick={() => createMatch(true)}
            disabled={creating || teams.length < 2}
            className="rounded-xl bg-emerald-500/20 px-3 py-2 text-[12px] font-bold text-emerald-100 ring-1 ring-emerald-400/30 disabled:opacity-50"
          >
            {creating ? "Сохраняем…" : "Создать и сохранить счёт"}
          </button>
        </div>
      </details>

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
