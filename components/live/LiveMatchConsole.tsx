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
import {
  getLiveMatch,
  MATCH_FINISHED_EVENT,
  MATCH_STARTED_EVENT,
  notifyMatchFinished,
  type MatchWithLive,
} from "@/lib/matchStatus";
import { openRatingVotingEndsAt } from "@/lib/matchRatings";
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
  const [mode, setMode] = useState<Mode>({ type: "idle" });
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
    for (const [id, row] of Object.entries(stats)) {
      goals[Number(id)] = row.goals;
      assists[Number(id)] = row.assists;
    }
    setMatchGoals(goals);
    setMatchAssists(assists);
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

  const closeSheets = () => setMode({ type: "idle" });

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
    const { error } = await supabase
      .from("matches")
      .update({
        is_played: true,
        is_live: false,
        ndfk_goals: ndfkGoals,
        opponent_goals: opponentGoals,
        rating_voting_ends_at: openRatingVotingEndsAt(match),
      })
      .eq("id", match.id);

    setFinishing(false);

    if (error) {
      alert(error.message);
      return;
    }

    notifyMatchFinished();
    setMatch(null);
  }

  function onSelectPlayer(player: Player) {
    if (!isAdmin) return;
    if (mode.type === "pickAssist") {
      void confirmAssistPick(player);
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
        title="Голы"
        emptyHint={
          isAdmin
            ? "Нажмите на игрока на поле, чтобы добавить гол."
            : "Голов пока нет"
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

      <LivePitch
        players={players}
        matchGoals={matchGoals}
        matchAssists={matchAssists}
        highlightMode={mode.type === "pickAssist" ? "assist" : "none"}
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
        onGoal={() => {
          if (mode.type === "sheet") void handleGoal(mode.player);
        }}
        onAssist={() => {
          if (mode.type === "sheet") void handleStandaloneAssist(mode.player);
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
