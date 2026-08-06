"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChampionshipMatch, ChampionshipTeam } from "@/lib/championship/types";

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

function teamName(
  match: ChampionshipMatch,
  side: "home" | "away"
): string {
  const team = side === "home" ? match.home_team : match.away_team;
  const raw = Array.isArray(team) ? team[0] : team;
  return raw?.name ?? (side === "home" ? "Хозяева" : "Гости");
}

export default function AdminChampionshipBoard({
  teams,
  matches,
  players,
  homeTeamId,
  schemaHint,
}: {
  teams: ChampionshipTeam[];
  matches: ChampionshipMatch[];
  players: PlayerOption[];
  homeTeamId: number | null;
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
  const [scoreDrafts, setScoreDrafts] = useState<Record<number, { home: string; away: string }>>(() =>
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
  const [scoreSavingId, setScoreSavingId] = useState<number | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreOk, setScoreOk] = useState<string | null>(null);

  const [selectedMatchId, setSelectedMatchId] = useState(
    String(matches.find((m) => !m.is_played)?.id ?? matches[0]?.id ?? "")
  );
  const [homeGoals, setHomeGoals] = useState("0");
  const [awayGoals, setAwayGoals] = useState("0");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishOk, setFinishOk] = useState<string | null>(null);

  const scoreMatches = useMemo(
    () =>
      [...matches].sort(
        (a, b) =>
          new Date(`${a.match_date}T${a.match_time || "00:00"}`).getTime() -
          new Date(`${b.match_date}T${b.match_time || "00:00"}`).getTime()
      ),
    [matches]
  );
  const selectedManageMatch = useMemo(
    () => editableMatches.find((m) => String(m.id) === manageMatchId) ?? null,
    [editableMatches, manageMatchId]
  );

  useEffect(() => {
    setScoreDrafts((prev) => {
      const next = { ...prev };
      for (const match of matches) {
        next[match.id] = {
          home: match.home_goals != null ? String(match.home_goals) : next[match.id]?.home ?? "",
          away: match.away_goals != null ? String(match.away_goals) : next[match.id]?.away ?? "",
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
  const selectedMatch = useMemo(
    () => matches.find((m) => String(m.id) === selectedMatchId) ?? null,
    [matches, selectedMatchId]
  );

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
      setCreateError("\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u0441\u0447\u0451\u0442");
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
        setCreateError(json.error ?? "\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f");
        return;
      }
      if (markPlayed) {
        setCreateHomeGoals("");
        setCreateAwayGoals("");
      }
      router.refresh();
    } catch {
      setCreateError("\u0421\u0435\u0442\u044c \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430");
    } finally {
      setCreating(false);
    }
  }
  async function saveMatchScore(matchId: number) {
    const draft = scoreDrafts[matchId];
    if (!draft) return;
    const home = Number(draft.home);
    const away = Number(draft.away);
    if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) {
      setScoreError("Укажите корректный счёт");
      return;
    }

    setScoreSavingId(matchId);
    setScoreError(null);
    setScoreOk(null);
    try {
      const response = await fetch(`/api/championship/matches/${matchId}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeGoals: home, awayGoals: away, played: true }),
      });
      const json = await response.json();
      if (!response.ok) {
        setScoreError(json.error ?? "Не удалось сохранить счёт");
        return;
      }
      setScoreOk("Счёт сохранён, таблица обновлена");
      router.refresh();
    } catch {
      setScoreError("Сеть недоступна");
    } finally {
      setScoreSavingId(null);
    }
  }
  async function updateManagedMatch() {
    if (!selectedManageMatch) return;
    setManaging(true);
    setManageError(null);
    setManageOk(null);
    try {
      const response = await fetch(`/api/championship/matches/${selectedManageMatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchDate: manageMatchDate,
          matchTime: manageMatchTime,
          location: manageLocation,
        }),
      });
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
      const response = await fetch(`/api/championship/matches/${selectedManageMatch.id}`, {
        method: "DELETE",
      });
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
            matchRating: line.matchRating
              ? Number(line.matchRating)
              : null,
            redCards: line.redCards ? 1 : 0,
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setFinishError(json.error ?? "Ошибка сохранения");
        return;
      }
      setFinishOk(
        "Матч сохранён: обновлены статистика чемпионата и карьера"
      );
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
        <h2 className="text-sm font-bold text-white">Счёты матчей тура</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Введите результат любого матча чемпионата — таблица пересчитается автоматически.
        </p>

        {scoreMatches.length === 0 ? (
          <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-[12px] text-slate-400">
            Матчей чемпионата пока нет.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {scoreMatches.map((match) => {
              const draft = scoreDrafts[match.id] ?? { home: "", away: "" };
              const saving = scoreSavingId === match.id;
              return (
                <div
                  key={match.id}
                  className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold text-white">
                        {teamName(match, "home")} — {teamName(match, "away")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {match.match_date} · {match.match_time || "18:00"}
                        {match.is_played ? " · сыгран" : ""}
                      </p>
                    </div>
                    {match.is_live ? (
                      <span className="shrink-0 rounded-lg bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-100 ring-1 ring-red-400/25">
                        LIVE
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 grid grid-cols-[1fr_auto_1fr_auto] items-end gap-1.5">
                    <label className="text-[9px] text-slate-500">
                      Хозяева
                      <input
                        type="number"
                        min={0}
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm font-bold text-white"
                        value={draft.home}
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
                      Гости
                      <input
                        type="number"
                        min={0}
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm font-bold text-white"
                        value={draft.away}
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
                    <button
                      type="button"
                      onClick={() => saveMatchScore(match.id)}
                      disabled={saving || match.is_live}
                      className="rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-[11px] font-bold text-emerald-100 ring-1 ring-emerald-400/30 disabled:opacity-50"
                    >
                      {saving ? "..." : "Сохранить"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {scoreError ? (
          <p className="mt-2 text-[12px] text-rose-300">{scoreError}</p>
        ) : null}
        {scoreOk ? (
          <p className="mt-2 text-[12px] text-emerald-300">{scoreOk}</p>
        ) : null}
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <h2 className="text-sm font-bold text-white">Добавить матч сезона</h2>
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
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <h2 className="text-sm font-bold text-white">Изменить / удалить будущий матч</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Здесь можно поправить дату, время, место или удалить случайный дубль, пока матч ещё не сыгран и не LIVE.
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
                    {teamName(match, "home")} — {teamName(match, "away")} · {match.match_date} {match.match_time}
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
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <h2 className="text-sm font-bold text-white">Завершить матч</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Обновит сезонную статистику чемпионата и одновременно начислит
          голы/пассы в общую карьеру.
        </p>

        <label className="mt-3 block text-[11px] text-slate-400">
          Матч
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
          >
            {matches.length === 0 ? (
              <option value="">Нет матчей</option>
            ) : (
              matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {teamName(match, "home")} — {teamName(match, "away")}
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
            Статистика игроков Дженгутая
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
                                    goals: Math.max(0, Number(e.target.value) || 0),
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
          disabled={finishing || !selectedMatch}
          className="mt-3 rounded-xl bg-emerald-500/20 px-3 py-2 text-[12px] font-bold text-emerald-100 ring-1 ring-emerald-400/30 disabled:opacity-50"
        >
          {finishing ? "Сохраняем…" : "Завершить и обновить статистику"}
        </button>
      </section>
    </div>
  );
}
