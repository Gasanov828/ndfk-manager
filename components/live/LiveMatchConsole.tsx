"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LiveAssistPrompt from "@/components/live/LiveAssistPrompt";
import LiveEventFeed from "@/components/live/LiveEventFeed";
import LiveGoalToast from "@/components/live/LiveGoalToast";
import LivePitch from "@/components/live/LivePitch";
import LivePlayerSheet from "@/components/live/LivePlayerSheet";
import LiveScoreBar from "@/components/live/LiveScoreBar";
import LiveSubSheet from "@/components/live/LiveSubSheet";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import {
  addLiveAssist,
  addLiveGoal,
  addLiveSave,
  addLiveSubstitution,
  buildLiveFeed,
  loadLiveEvents,
  loadMatchPlayerStats,
  markGoalWithoutAssist,
  type LiveMatchEvent,
} from "@/lib/liveMatch";
import {
  getBenchPlayers,
  type LineupPosition,
  type Player,
} from "@/lib/lineup";
import { getPositionGroup } from "@/lib/positionStyles";
import {
  getLiveMatch,
  MATCH_FINISHED_EVENT,
  MATCH_STARTED_EVENT,
  notifyMatchFinished,
  type MatchWithLive,
} from "@/lib/matchStatus";
import { supabase } from "@/lib/supabase";
type Mode =
  | { type: "idle" }
  | { type: "sheet"; player: Player }
  | { type: "assistPrompt"; scorer: Player; goalEventId: number }
  | {
      type: "pickAssist";
      scorer: Player;
      goalEventId: number;
    }
  | { type: "sub"; playerOut: Player };

type QuickAction = "goal" | "assist" | "save" | "substitution" | null;

export default function LiveMatchConsole() {
  const { profile, loading: authLoading } = useAuthProfile();
  const isAdmin = profile?.role === "admin";

  const [match, setMatch] = useState<MatchWithLive | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<LiveMatchEvent[]>([]);
  const [ndfkGoals, setNdfkGoals] = useState(0);
  const [opponentGoals, setOpponentGoals] = useState(0);
  const [matchGoals, setMatchGoals] = useState<Record<number, number>>({});
  const [matchAssists, setMatchAssists] = useState<Record<number, number>>({});
  const [matchSaves, setMatchSaves] = useState<Record<number, number>>({});
  const [mode, setMode] = useState<Mode>({ type: "idle" });
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [busy, setBusy] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [goalToast, setGoalToast] = useState<{ name: string } | null>(null);
  const [pendingAssistPrompt, setPendingAssistPrompt] = useState<{
    scorer: Player;
    goalEventId: number;
  } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const names = useMemo(() => {
    const map: Record<number, string> = {};
    for (const player of players) map[player.id] = player.name;
    return map;
  }, [players]);

  const feed = useMemo(() => buildLiveFeed(events), [events]);
  const bench = useMemo(() => getBenchPlayers(players), [players]);

  const reload = useCallback(async () => {
    await fetch("/api/championship/sync-live-matches", {
      method: "POST",
      cache: "no-store",
    }).catch(() => null);

    const { data: matchRows, error: matchError } = await supabase
      .from("matches")
      .select("*");

    if (matchError) {
      setLoadError(matchError.message);
      return;
    }

    const live = getLiveMatch((matchRows ?? []) as MatchWithLive[]);
    if (!live) {
      setMatch(null);
      return;
    }

    setMatch(live);
    setNdfkGoals(Number(live.ndfk_goals) || 0);
    setOpponentGoals(Number(live.opponent_goals) || 0);

    const { data: playerRows } = await supabase.from("players").select("*");
    setPlayers((playerRows ?? []) as Player[]);

    const nameMap: Record<number, string> = {};
    for (const row of playerRows ?? []) {
      nameMap[row.id] = row.name;
    }

    const { events: loaded, schemaMissing: missing } = await loadLiveEvents(
      live.id,
      nameMap,
      supabase
    );
    setEvents(loaded);
    setSchemaMissing(missing);

    const stats = await loadMatchPlayerStats(live.id, supabase);
    const goals: Record<number, number> = {};
    const assists: Record<number, number> = {};
    const saves: Record<number, number> = {};
    for (const [id, row] of Object.entries(stats)) {
      goals[Number(id)] = row.goals;
      assists[Number(id)] = row.assists;
      saves[Number(id)] = row.saves;
    }
    setMatchGoals(goals);
    setMatchAssists(assists);
    setMatchSaves(saves);
  }, []);

  useEffect(() => {
    reload();
    const interval = window.setInterval(reload, 8000);
    const onChange = () => reload();
    window.addEventListener(MATCH_STARTED_EVENT, onChange);
    window.addEventListener(MATCH_FINISHED_EVENT, onChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(MATCH_STARTED_EVENT, onChange);
      window.removeEventListener(MATCH_FINISHED_EVENT, onChange);
    };
  }, [reload]);

  const closeSheets = () => {
    setMode({ type: "idle" });
    setQuickAction(null);
  };

  async function handleGoal(player: Player) {
    if (!match || !isAdmin || schemaMissing) return;
    setBusy(true);
    try {
      const { event, ndfkGoals: next } = await addLiveGoal({
        matchId: match.id,
        playerId: player.id,
        currentNdfkGoals: ndfkGoals,
        names,
        db: supabase,
      });
      setNdfkGoals(next);
      setMatchGoals((prev) => ({
        ...prev,
        [player.id]: (prev[player.id] ?? 0) + 1,
      }));
      setEvents((prev) => [...prev, event]);
      setMode({ type: "idle" });
      setGoalToast({ name: player.name });
      setPendingAssistPrompt({ scorer: player, goalEventId: event.id });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка записи гола");
    } finally {
      setBusy(false);
    }
  }

  async function handleStandaloneAssist(player: Player) {
    if (!match || !isAdmin || schemaMissing) return;
    // Ассист без привязки к голу — ищем последний гол без ассиста
    const lastOpenGoal = [...events]
      .reverse()
      .find(
        (event) =>
          event.event_type === "goal" &&
          event.meta?.assistStatus === "pending" &&
          event.player_id !== player.id
      );

    if (!lastOpenGoal) {
      alert("Сначала добавьте гол — затем ассист привяжется к нему.");
      return;
    }

    setBusy(true);
    try {
      const assist = await addLiveAssist({
        matchId: match.id,
        assisterId: player.id,
        scorerId: lastOpenGoal.player_id!,
        goalEventId: lastOpenGoal.id,
        names,
        db: supabase,
      });
      setEvents((prev) =>
        prev
          .map((event) =>
            event.id === lastOpenGoal.id
              ? {
                  ...event,
                  meta: { ...event.meta, assistStatus: "linked" as const },
                }
              : event
          )
          .concat(assist)
      );
      setMatchAssists((prev) => ({
        ...prev,
        [player.id]: (prev[player.id] ?? 0) + 1,
      }));
      setMode({ type: "idle" });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка ассиста");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAssistPick(assister: Player) {
    if (mode.type !== "pickAssist" || !match) return;
    if (assister.id === mode.scorer.id) {
      alert("Ассист не может сделать автор гола");
      return;
    }

    setBusy(true);
    try {
      const assist = await addLiveAssist({
        matchId: match.id,
        assisterId: assister.id,
        scorerId: mode.scorer.id,
        goalEventId: mode.goalEventId,
        names,
        db: supabase,
      });
      setEvents((prev) =>
        prev
          .map((event) =>
            event.id === mode.goalEventId
              ? {
                  ...event,
                  meta: { ...event.meta, assistStatus: "linked" as const },
                }
              : event
          )
          .concat(assist)
      );
      setMatchAssists((prev) => ({
        ...prev,
        [assister.id]: (prev[assister.id] ?? 0) + 1,
      }));
      setMode({ type: "idle" });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка ассиста");
    } finally {
      setBusy(false);
    }
  }

  async function skipAssist(goalEventId: number) {
    try {
      await markGoalWithoutAssist(goalEventId, supabase);
      setEvents((prev) =>
        prev.map((event) =>
          event.id === goalEventId
            ? {
                ...event,
                meta: { ...event.meta, assistStatus: "none" as const },
              }
            : event
        )
      );
    } catch {
      // ignore
    }
    setMode({ type: "idle" });
  }

  async function handleSave(player: Player) {
    if (!match || !isAdmin || schemaMissing) return;
    if (getPositionGroup(player.lineup_position, player.position) !== "ВРТ") {
      alert("Сейвы можно добавить только вратарю");
      return;
    }

    setBusy(true);
    try {
      const event = await addLiveSave({
        matchId: match.id,
        playerId: player.id,
        names,
        db: supabase,
      });
      setMatchSaves((prev) => ({
        ...prev,
        [player.id]: (prev[player.id] ?? 0) + 1,
      }));
      setEvents((prev) => [...prev, event]);
      setMode({ type: "idle" });
      setQuickAction(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка записи сейва");
    } finally {
      setBusy(false);
    }
  }

  async function handleSub(playerIn: Player) {
    if (mode.type !== "sub" || !match || !isAdmin) return;
    const slot = mode.playerOut.lineup_position as LineupPosition | null;
    if (!slot) {
      alert("У игрока нет позиции в составе");
      return;
    }

    setBusy(true);
    try {
      const event = await addLiveSubstitution({
        matchId: match.id,
        playerOutId: mode.playerOut.id,
        playerInId: playerIn.id,
        slotOut: slot,
        names,
        db: supabase,
      });
      setPlayers((prev) =>
        prev.map((player) => {
          if (player.id === mode.playerOut.id) {
            return { ...player, lineup_position: null };
          }
          if (player.id === playerIn.id) {
            return { ...player, lineup_position: slot };
          }
          return player;
        })
      );
      setEvents((prev) => [...prev, event]);
      setMode({ type: "idle" });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка замены");
    } finally {
      setBusy(false);
    }
  }

  async function handleFinishMatch() {
    if (!match || !isAdmin) return;
    if (
      !confirm(
        "Завершить матч? Откроется голосование за оценки игроков на 12 часов."
      )
    ) {
      return;
    }

    setFinishing(true);
    try {
      const response = await fetch("/api/match/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          ndfkGoals,
          opponentGoals,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        alert(payload.error ?? "Не удалось завершить матч");
        return;
      }

      notifyMatchFinished();
      setMatch(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setFinishing(false);
    }
  }

  function onSelectPlayer(player: Player) {
    if (!isAdmin) return;
    if (mode.type === "pickAssist") {
      void confirmAssistPick(player);
      return;
    }

    if (quickAction === "goal") {
      setQuickAction(null);
      void handleGoal(player);
      return;
    }

    if (quickAction === "assist") {
      setQuickAction(null);
      void handleStandaloneAssist(player);
      return;
    }

    if (quickAction === "save") {
      setQuickAction(null);
      void handleSave(player);
      return;
    }

    if (quickAction === "substitution") {
      setQuickAction(null);
      setMode({ type: "sub", playerOut: player });
      return;
    }

    setMode({ type: "sheet", player });
  }

  if (authLoading) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>
    );
  }

  if (!match) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-lg font-extrabold text-white">Нет LIVE-матча</p>
        <p className="mt-1 text-[13px] text-slate-400">
          Нажмите «Начать матч» на главной — откроется этот экран.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-100"
        >
          На главную
        </Link>
        {loadError ? (
          <p className="mt-3 text-[11px] text-red-300">{loadError}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bottom-nav-safe space-y-3 pb-4">
      <LiveScoreBar
        ndfkGoals={ndfkGoals}
        opponentGoals={opponentGoals}
        opponent={match.opponent}
      />

      <LiveEventFeed
        items={feed}
        title="События"
        emptyHint={
          isAdmin
            ? "Нажмите на игрока на поле, чтобы добавить гол, ассист или сейв."
            : "Событий пока нет"
        }
      />

      {schemaMissing ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          Выполните SQL:{" "}
          <code className="text-amber-50">supabase/match_live_events.sql</code>
        </div>
      ) : null}

      {!isAdmin ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-slate-400">
          Режим просмотра. События добавляет капитан.
        </p>
      ) : null}

      {isAdmin ? (
        <section className="overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.13] via-[#10182d] to-[#080d18] shadow-[0_0_30px_rgba(139,92,246,0.12)]">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">Пульт администратора</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {quickAction === "goal"
                  ? "Выберите автора гола на поле"
                  : quickAction === "assist"
                    ? "Выберите ассистента к последнему голу"
                    : quickAction === "save"
                      ? "Нажмите на вратаря для сейва"
                    : quickAction === "substitution"
                      ? "Выберите игрока, который уходит"
                      : "Выберите действие или нажмите на игрока"}
              </p>
            </div>
            {quickAction ? (
              <button type="button" onClick={() => setQuickAction(null)} className="shrink-0 rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-semibold text-slate-200">
                Отмена
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 p-2.5 sm:grid-cols-4 sm:p-3">
            <button type="button" disabled={busy || schemaMissing} onClick={() => setQuickAction("goal")} className={`rounded-xl border px-2 py-3 text-[12px] font-extrabold transition active:scale-[0.98] disabled:opacity-50 ${quickAction === "goal" ? "border-emerald-200 bg-emerald-400 text-emerald-950 shadow-[0_0_22px_rgba(52,211,153,0.5)]" : "border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25"}`}>
              ⚽ Гол
            </button>
            <button type="button" disabled={busy || schemaMissing} onClick={() => setQuickAction("assist")} className={`rounded-xl border px-2 py-3 text-[12px] font-extrabold transition active:scale-[0.98] disabled:opacity-50 ${quickAction === "assist" ? "border-cyan-100 bg-cyan-300 text-cyan-950 shadow-[0_0_22px_rgba(34,211,238,0.45)]" : "border-cyan-400/35 bg-cyan-500/15 text-cyan-50 hover:bg-cyan-500/25"}`}>
              🎯 Ассист
            </button>
            <button type="button" disabled={busy || schemaMissing} onClick={() => setQuickAction("save")} className={`rounded-xl border px-2 py-3 text-[12px] font-extrabold transition active:scale-[0.98] disabled:opacity-50 ${quickAction === "save" ? "border-orange-100 bg-orange-300 text-orange-950 shadow-[0_0_22px_rgba(251,146,60,0.45)]" : "border-orange-400/35 bg-orange-500/15 text-orange-50 hover:bg-orange-500/25"}`}>
              🧤 Сейв
            </button>
            <button type="button" disabled={busy || schemaMissing} onClick={() => setQuickAction("substitution")} className={`rounded-xl border px-2 py-3 text-[12px] font-extrabold transition active:scale-[0.98] disabled:opacity-50 ${quickAction === "substitution" ? "border-violet-100 bg-violet-300 text-violet-950 shadow-[0_0_22px_rgba(167,139,250,0.45)]" : "border-violet-400/35 bg-violet-500/15 text-violet-50 hover:bg-violet-500/25"}`}>
              🔄 Замена
            </button>
          </div>
        </section>
      ) : null}
      <LivePitch
        players={players}
        matchGoals={matchGoals}
        matchAssists={matchAssists}
        matchSaves={matchSaves}
        highlightMode={
          mode.type === "pickAssist" || quickAction === "assist"
            ? "assist"
            : quickAction === "save"
              ? "save"
              : "none"
        }
        disabledPlayerId={
          mode.type === "pickAssist" ? mode.scorer.id : null
        }
        onSelectPlayer={onSelectPlayer}
      />

      {isAdmin ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              setOpponentGoals((value) => {
                const next = value + 1;
                void supabase
                  .from("matches")
                  .update({ opponent_goals: next })
                  .eq("id", match.id);
                return next;
              })
            }
            className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-[12px] font-bold text-slate-200"
          >
            +1 соперник
          </button>
          <button
            type="button"
            disabled={finishing}
            onClick={() => void handleFinishMatch()}
            className="rounded-xl border border-red-400/35 bg-red-500/15 py-2.5 text-[12px] font-bold text-red-100 disabled:opacity-50"
          >
            {finishing ? "..." : "Завершить матч"}
          </button>
        </div>
      ) : null}

      <LivePlayerSheet
        player={mode.type === "sheet" ? mode.player : null}
        busy={busy || schemaMissing}
        isGoalkeeper={
          mode.type === "sheet"
            ? getPositionGroup(mode.player.lineup_position, mode.player.position) ===
              "ВРТ"
            : false
        }
        onGoal={() => {
          if (mode.type === "sheet") void handleGoal(mode.player);
        }}
        onAssist={() => {
          if (mode.type === "sheet") void handleStandaloneAssist(mode.player);
        }}
        onSave={() => {
          if (mode.type === "sheet") void handleSave(mode.player);
        }}
        onSub={() => {
          if (mode.type === "sheet") {
            setMode({ type: "sub", playerOut: mode.player });
          }
        }}
        onClose={closeSheets}
      />

      <LiveAssistPrompt
        open={mode.type === "assistPrompt"}
        scorerName={mode.type === "assistPrompt" ? mode.scorer.name : ""}
        onYes={() => {
          if (mode.type !== "assistPrompt") return;
          setMode({
            type: "pickAssist",
            scorer: mode.scorer,
            goalEventId: mode.goalEventId,
          });
        }}
        onNo={() => {
          if (mode.type === "assistPrompt") void skipAssist(mode.goalEventId);
        }}
      />

      <LiveSubSheet
        playerOut={mode.type === "sub" ? mode.playerOut : null}
        bench={bench}
        busy={busy}
        onPick={(player) => void handleSub(player)}
        onClose={closeSheets}
      />

      <LiveGoalToast
        open={Boolean(goalToast)}
        playerName={goalToast?.name ?? ""}
        onDone={() => {
          setGoalToast(null);
          if (pendingAssistPrompt) {
            setMode({
              type: "assistPrompt",
              scorer: pendingAssistPrompt.scorer,
              goalEventId: pendingAssistPrompt.goalEventId,
            });
            setPendingAssistPrompt(null);
          }
        }}
      />
    </div>
  );
}
