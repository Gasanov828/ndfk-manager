"use client";

import { useMemo, useState } from "react";
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
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedMatchId, setSelectedMatchId] = useState(
    String(matches.find((m) => !m.is_played)?.id ?? matches[0]?.id ?? "")
  );
  const [homeGoals, setHomeGoals] = useState("0");
  const [awayGoals, setAwayGoals] = useState("0");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishOk, setFinishOk] = useState<string | null>(null);

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

  async function createMatch() {
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
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setCreateError(json.error ?? "Ошибка создания");
        return;
      }
      router.refresh();
    } catch {
      setCreateError("Сеть недоступна");
    } finally {
      setCreating(false);
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
        </div>
        {createError ? (
          <p className="mt-2 text-[12px] text-rose-300">{createError}</p>
        ) : null}
        <button
          type="button"
          onClick={createMatch}
          disabled={creating || teams.length < 2}
          className="mt-3 rounded-xl bg-amber-500/20 px-3 py-2 text-[12px] font-bold text-amber-100 ring-1 ring-amber-400/30 disabled:opacity-50"
        >
          {creating ? "Создаём…" : "Создать матч чемпионата"}
        </button>
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
