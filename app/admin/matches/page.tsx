"use client";

import {
  adminDangerButtonClass,
  adminEditButtonClass,
  adminInputClass,
  adminLabelClass,
  adminPanelClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSectionTitleClass,
} from "@/lib/adminStyles";
import {
  buildPlayerStatMap,
  getMatchScoreLabel,
  hasMatchPlayerStatActivity,
  type MatchPlayerStat,
  type MatchWithResult,
} from "@/lib/matchHistory";
import {
  isMatchInProgress,
  notifyMatchFinished,
  notifyMatchStarted,
} from "@/lib/matchStatus";
import { revertOverallRatingsForMatch } from "@/lib/matchRatingSync";
import { recalculateMatchRatingsViaApi } from "@/lib/matchRatingRecalcApi";
import { openRatingVotingEndsAt } from "@/lib/matchRatings";
import {
  formatMatchDate,
  formatMatchTime,
  sortMatchesByDate,
  type Match,
} from "@/lib/matches";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type TabId = "schedule" | "result";

type Player = {
  id: number;
  name: string;
  position: string;
  rating: number;
};

type PlayerStatDraft = {
  goals: number;
  assists: number;
  saves: number;
};

function AdminMatchesHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabId = tabParam === "result" ? "result" : "schedule";

  const [matches, setMatches] = useState<Match[]>([]);
  const [resultMatches, setResultMatches] = useState<MatchWithResult[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [finishingId, setFinishingId] = useState<number | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [ndfkGoals, setNdfkGoals] = useState(0);
  const [opponentGoals, setOpponentGoals] = useState(0);
  const [playerStats, setPlayerStats] = useState<Record<number, PlayerStatDraft>>(
    {}
  );
  const [saving, setSaving] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    loadScheduleMatches();
  }, []);

  useEffect(() => {
    if (activeTab === "result") {
      loadResultData();
    }
  }, [activeTab]);

  function setTab(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "result") {
      params.set("tab", "result");
    } else {
      params.delete("tab");
    }
    const qs = params.toString();
    router.replace(qs ? `/admin/matches?${qs}` : "/admin/matches");
  }

  async function loadScheduleMatches() {
    const { data } = await supabase
      .from("matches")
      .select("*")
      .order("id", { ascending: false });

    if (data) {
      setMatches(sortMatchesByDate(data));
    }
  }

  async function loadMatchStats(matchId: number, playerList: Player[]) {
    const { data: matchData } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchData) {
      setNdfkGoals(matchData.ndfk_goals ?? 0);
      setOpponentGoals(matchData.opponent_goals ?? 0);
    }

    const { data, error } = await supabase
      .from("match_player_stats")
      .select("*")
      .eq("match_id", matchId);

    if (error?.message.includes("match_player_stats")) {
      setSchemaError(
        "\u0412\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u0435 SQL \u0438\u0437 supabase/match_history.sql \u0438 supabase/match_player_stats_saves.sql \u0432 Supabase"
      );
      return;
    }

    if (error?.message.includes("saves")) {
      setSchemaError(
        "\u0412\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u0435 SQL \u0438\u0437 supabase/match_player_stats_saves.sql \u0432 Supabase"
      );
      return;
    }

    const statMap = buildPlayerStatMap((data ?? []) as MatchPlayerStat[]);

    const nextStats = playerList.reduce<Record<number, PlayerStatDraft>>(
      (acc, player) => {
        acc[player.id] = statMap[player.id] ?? { goals: 0, assists: 0, saves: 0 };
        return acc;
      },
      {}
    );

    setPlayerStats(nextStats);
  }

  async function loadResultData() {
    const [{ data: matchData, error: matchError }, { data: playerData }] =
      await Promise.all([
        supabase.from("matches").select("*"),
        supabase
          .from("players")
          .select("id, name, position, rating")
          .order("rating", { ascending: false }),
      ]);

    if (matchError?.message.includes("ndfk_goals")) {
      setSchemaError(
        "\u0412\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u0435 SQL \u0438\u0437 supabase/match_history.sql \u0432 Supabase"
      );
      return;
    }

    if (playerData) {
      setPlayers(playerData);
    }

    if (matchData) {
      const sorted = sortMatchesByDate(matchData as MatchWithResult[]);
      setResultMatches(sorted as MatchWithResult[]);
      setMatches(sorted);

      const matchId = selectedMatchId ?? sorted[0]?.id ?? null;
      if (matchId) {
        setSelectedMatchId(matchId);
        if (playerData) {
          await loadMatchStats(matchId, playerData);
        }
      }
    }
  }

  const resetForm = () => {
    setOpponent("");
    setDate("");
    setTime("");
    setLocation("");
    setEditingId(null);
  };

  async function handleSaveMatch() {
    if (!opponent || !date || !time || !location) {
      alert(
        "\u0417\u0430\u043f\u043e\u043b\u043d\u0438 \u0432\u0441\u0435 \u043f\u043e\u043b\u044f"
      );
      return;
    }

    if (editingId !== null) {
      const { error } = await supabase
        .from("matches")
        .update({ opponent, date, time, location })
        .eq("id", editingId);

      if (error) {
        alert(error.message);
        return;
      }

      alert(
        "\u041c\u0430\u0442\u0447 \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d!"
      );
    } else {
      const { error } = await supabase.from("matches").insert([
        { opponent, date, time, location },
      ]);

      if (error) {
        alert(error.message);
        return;
      }

      alert(
        "\u041c\u0430\u0442\u0447 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u0432 \u0440\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0435. \u0413\u043e\u043b\u043e\u0441\u043e\u0432\u0430\u043d\u0438\u0435 \u00ab\u0413\u043e\u0441\u0442\u0438\u00bb \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u043c\u0430\u0442\u0447\u0430."
      );
    }

    resetForm();
    await loadScheduleMatches();
  }

  async function handleFinishMatch(match: Match) {
    if (
      !confirm(
        `\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043c\u0430\u0442\u0447 vs ${match.opponent}? \u041e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u0430\u043d\u0438\u0435 \u0437\u0430 \u043e\u0446\u0435\u043d\u043a\u0438 \u043d\u0430 12 \u0447\u0430\u0441\u043e\u0432.`
      )
    ) {
      return;
    }

    setFinishingId(match.id);

    const { error } = await supabase
      .from("matches")
      .update({
        is_played: true,
        is_live: false,
        rating_voting_ends_at: openRatingVotingEndsAt(match),
      })
      .eq("id", match.id);

    setFinishingId(null);

    if (error) {
      alert(
        error.message.includes("rating_voting_ends_at")
          ? "\u0412\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u0435 SQL: supabase/rating_voting_ends_at.sql"
          : error.message
      );
      return;
    }

    notifyMatchFinished();
    await loadScheduleMatches();
    alert(
      "\u041c\u0430\u0442\u0447 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d! \u0413\u043e\u043b\u043e\u0441\u043e\u0432\u0430\u043d\u0438\u0435 \u0437\u0430 \u043e\u0446\u0435\u043d\u043a\u0438 \u043e\u0442\u043a\u0440\u044b\u0442\u043e \u043d\u0430 12 \u0447."
    );
  }

  async function handleDeleteMatch(id: number) {
    if (
      !confirm("\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043c\u0430\u0442\u0447?")
    ) {
      return;
    }

    const { error } = await supabase.from("matches").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (editingId === id) resetForm();
    await loadScheduleMatches();
  }

  async function handleMatchChange(matchId: number) {
    setSelectedMatchId(matchId);
    await loadMatchStats(matchId, players);
  }

  function updatePlayerStat(
    playerId: number,
    field: keyof PlayerStatDraft,
    value: number
  ) {
    setPlayerStats((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: Math.max(0, value),
      },
    }));
  }

  async function syncPlayerCareerTotals() {
    for (const player of players) {
      const { data } = await supabase
        .from("match_player_stats")
        .select("goals, assists")
        .eq("player_id", player.id);

      const totals = (data ?? []).reduce(
        (acc, row) => ({
          goals: acc.goals + row.goals,
          assists: acc.assists + row.assists,
        }),
        { goals: 0, assists: 0 }
      );

      await supabase.from("players").update(totals).eq("id", player.id);
    }
  }

  async function handleStartMatch() {
    if (!selectedMatchId) return;

    setSaving(true);

    const { error } = await supabase
      .from("matches")
      .update({ is_live: true })
      .eq("id", selectedMatchId);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    notifyMatchStarted();
    await loadResultData();
  }

  async function handleFinishMatchOnly() {
    if (!selectedMatchId) return;

    if (
      !confirm(
        "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043c\u0430\u0442\u0447? \u0421\u0440\u0430\u0437\u0443 \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u0430\u043d\u0438\u0435 \u0437\u0430 \u043e\u0446\u0435\u043d\u043a\u0438 \u043d\u0430 12 \u0447\u0430\u0441\u043e\u0432."
      )
    ) {
      return;
    }

    setSaving(true);

    const selectedMatch = resultMatches.find(
      (match) => match.id === selectedMatchId
    );

    // Save current score before finishing, so LIVE edits are kept
    const { error: scoreError } = await supabase
      .from("matches")
      .update({
        ndfk_goals: ndfkGoals,
        opponent_goals: opponentGoals,
        is_played: true,
        is_live: false,
        rating_voting_ends_at: openRatingVotingEndsAt(selectedMatch),
      })
      .eq("id", selectedMatchId);

    if (scoreError) {
      alert(scoreError.message);
      setSaving(false);
      return;
    }

    await supabase
      .from("match_player_stats")
      .delete()
      .eq("match_id", selectedMatchId);

    const rows = players
      .map((player) => ({
        match_id: selectedMatchId,
        player_id: player.id,
        goals: playerStats[player.id]?.goals ?? 0,
        assists: playerStats[player.id]?.assists ?? 0,
        saves: playerStats[player.id]?.saves ?? 0,
      }))
      .filter((row) =>
        hasMatchPlayerStatActivity({
          goals: row.goals,
          assists: row.assists,
          saves: row.saves,
        })
      );

    if (rows.length > 0) {
      const { error: statsError } = await supabase
        .from("match_player_stats")
        .insert(rows);

      if (statsError) {
        alert(statsError.message);
        setSaving(false);
        return;
      }
    }

    await syncPlayerCareerTotals();
    notifyMatchFinished();
    await loadResultData();

    try {
      await recalculateMatchRatingsViaApi(selectedMatchId);
    } catch (recalcError) {
      console.error(recalcError);
    }

    setSaving(false);
    alert(
      "\u041c\u0430\u0442\u0447 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d! \u0413\u043e\u043b\u043e\u0441\u043e\u0432\u0430\u043d\u0438\u0435 \u0437\u0430 \u043e\u0446\u0435\u043d\u043a\u0438 \u043e\u0442\u043a\u0440\u044b\u0442\u043e \u043d\u0430 12 \u0447."
    );
  }

  async function handleSaveResult() {
    if (!selectedMatchId) {
      alert("\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043c\u0430\u0442\u0447");
      return;
    }

    setSaving(true);

    const selectedMatch = resultMatches.find(
      (match) => match.id === selectedMatchId
    );
    const alreadyPlayed = Boolean(selectedMatch?.is_played);

    // During LIVE / before finish: save score+stats without ending the match.
    // After finish: update result without reopening voting window if already set.
    const matchUpdate = alreadyPlayed
      ? {
          ndfk_goals: ndfkGoals,
          opponent_goals: opponentGoals,
        }
      : {
          ndfk_goals: ndfkGoals,
          opponent_goals: opponentGoals,
          is_live: true,
        };

    const { error: matchError } = await supabase
      .from("matches")
      .update(matchUpdate)
      .eq("id", selectedMatchId);

    if (matchError) {
      alert(matchError.message);
      setSaving(false);
      return;
    }

    await supabase
      .from("match_player_stats")
      .delete()
      .eq("match_id", selectedMatchId);

    const rows = players
      .map((player) => ({
        match_id: selectedMatchId,
        player_id: player.id,
        goals: playerStats[player.id]?.goals ?? 0,
        assists: playerStats[player.id]?.assists ?? 0,
        saves: playerStats[player.id]?.saves ?? 0,
      }))
      .filter((row) =>
        hasMatchPlayerStatActivity({
          goals: row.goals,
          assists: row.assists,
          saves: row.saves,
        })
      );

    if (rows.length > 0) {
      const { error: statsError } = await supabase
        .from("match_player_stats")
        .insert(rows);

      if (statsError) {
        alert(statsError.message);
        setSaving(false);
        return;
      }
    }

    if (alreadyPlayed) {
      await syncPlayerCareerTotals();
      try {
        await recalculateMatchRatingsViaApi(selectedMatchId);
      } catch (recalcError) {
        console.error(recalcError);
      }
    }

    if (!alreadyPlayed) {
      notifyMatchStarted();
    }
    await loadResultData();

    alert(
      alreadyPlayed
        ? "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d."
        : "\u0421\u0447\u0451\u0442 \u0438 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b. LIVE \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0435\u0442\u0441\u044f \u2014 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u043c\u0430\u0442\u0447, \u043a\u043e\u0433\u0434\u0430 \u0431\u0443\u0434\u0435\u0442\u0435 \u0433\u043e\u0442\u043e\u0432\u044b \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u0430\u043d\u0438\u0435."
    );
    setSaving(false);
  }

  async function handleRemoveFromHistory(matchId: number) {
    if (
      !confirm(
        "\u0423\u0431\u0440\u0430\u0442\u044c \u043c\u0430\u0442\u0447 \u0438\u0437 \u0438\u0441\u0442\u043e\u0440\u0438\u0438? \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0438 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0438\u0433\u0440\u043e\u043a\u043e\u0432 \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043b\u0435\u043d\u044b, \u0441\u0430\u043c \u043c\u0430\u0442\u0447 \u043e\u0441\u0442\u0430\u043d\u0435\u0442\u0441\u044f \u0432 \u0440\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0438."
      )
    ) {
      return;
    }

    setSaving(true);

    await revertOverallRatingsForMatch(matchId);

    await supabase.from("match_player_stats").delete().eq("match_id", matchId);
    await supabase
      .from("match_player_participation")
      .delete()
      .eq("match_id", matchId);
    await supabase.from("match_availability").delete().eq("match_id", matchId);
    await supabase
      .from("match_player_rating_votes")
      .delete()
      .eq("match_id", matchId);
    await supabase
      .from("match_player_rating_summary")
      .delete()
      .eq("match_id", matchId);

    const { error } = await supabase
      .from("matches")
      .update({
        is_played: false,
        is_live: false,
        ndfk_goals: 0,
        opponent_goals: 0,
      })
      .eq("id", matchId);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await syncPlayerCareerTotals();
    await loadResultData();
    alert(
      "\u041c\u0430\u0442\u0447 \u0443\u0431\u0440\u0430\u043d \u0438\u0437 \u0438\u0441\u0442\u043e\u0440\u0438\u0438"
    );
    setSaving(false);
  }

  async function handleDeleteMatchCompletely(matchId: number) {
    if (
      !confirm(
        "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043c\u0430\u0442\u0447 \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e? \u042d\u0442\u043e \u0443\u0431\u0435\u0440\u0451\u0442 \u0435\u0433\u043e \u0438\u0437 \u0438\u0441\u0442\u043e\u0440\u0438\u0438 \u0438 \u0438\u0437 \u0440\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u044f."
      )
    ) {
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("matches").delete().eq("id", matchId);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await syncPlayerCareerTotals();

    if (selectedMatchId === matchId) {
      setSelectedMatchId(null);
      setNdfkGoals(0);
      setOpponentGoals(0);
    }

    await loadResultData();
    alert("\u041c\u0430\u0442\u0447 \u0443\u0434\u0430\u043b\u0451\u043d");
    setSaving(false);
  }

  const selectedMatch = resultMatches.find(
    (match) => match.id === selectedMatchId
  );

  const tabBtn = (tab: TabId, label: string) => (
    <button
      type="button"
      onClick={() => setTab(tab)}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
        activeTab === tab
          ? "bg-white/15 text-white"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {tabBtn(
          "schedule",
          "\u0420\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0435"
        )}
        {tabBtn("result", "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442")}
      </div>

      {activeTab === "schedule" && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[320px_1fr]">
          <div className={adminPanelClass}>
            <h2 className={adminSectionTitleClass}>
              {editingId !== null
                ? "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c"
                : "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043c\u0430\u0442\u0447"}
            </h2>
            <div className="space-y-2 p-3">
              <div>
                <label className={adminLabelClass}>
                  {"\u0421\u043e\u043f\u0435\u0440\u043d\u0438\u043a"}
                </label>
                <input
                  type="text"
                  placeholder={"\u041a\u043e\u043c\u0430\u043d\u0434\u0430"}
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  className={adminInputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={adminLabelClass}>
                    {"\u0414\u0430\u0442\u0430"}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={adminInputClass}
                  />
                </div>
                <div>
                  <label className={adminLabelClass}>
                    {"\u0412\u0440\u0435\u043c\u044f"}
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={adminInputClass}
                  />
                </div>
              </div>
              <div>
                <label className={adminLabelClass}>
                  {"\u041c\u0435\u0441\u0442\u043e"}
                </label>
                <input
                  type="text"
                  placeholder={"\u0421\u0442\u0430\u0434\u0438\u043e\u043d"}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={adminInputClass}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveMatch}
                  className={`${adminPrimaryButtonClass} flex-1`}
                >
                  {editingId !== null
                    ? "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c"
                    : "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c"}
                </button>
                {editingId !== null && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className={adminSecondaryButtonClass}
                  >
                    {"\u041e\u0442\u043c\u0435\u043d\u0430"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={adminPanelClass}>
            <h2 className={adminSectionTitleClass}>
              {"\u0421\u043f\u0438\u0441\u043e\u043a \u043c\u0430\u0442\u0447\u0435\u0439"}
            </h2>
            {matches.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">
                {"\u041c\u0430\u0442\u0447\u0435\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442"}
              </p>
            ) : (
              <div className="divide-y divide-white/5">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-white">
                          vs {match.opponent}
                        </span>
                        {match.is_played ? (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                            {"\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d"}
                          </span>
                        ) : isMatchInProgress(match) ? (
                          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-200 ring-1 ring-red-400/30">
                            LIVE
                          </span>
                        ) : (
                          <span className="rounded bg-slate-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-400">
                            {"\u041f\u043b\u0430\u043d"}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-slate-400">
                        {formatMatchDate(match.date)} ·{" "}
                        {formatMatchTime(match.time)} · {match.location}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMatchId(match.id);
                          setTab("result");
                        }}
                        className={`${adminSecondaryButtonClass} px-2 py-1 text-xs`}
                      >
                        {match.is_played
                          ? "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442"
                          : "\u0421\u0447\u0451\u0442"}
                      </button>
                      {!match.is_played && (
                        <button
                          type="button"
                          onClick={() => handleFinishMatch(match)}
                          disabled={finishingId === match.id}
                          className={`${adminPrimaryButtonClass} px-2 py-1 text-xs`}
                        >
                          {finishingId === match.id
                            ? "\u2026"
                            : "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(match.id);
                          setOpponent(match.opponent);
                          setDate(match.date);
                          setTime(match.time);
                          setLocation(match.location);
                        }}
                        className={adminEditButtonClass}
                      >
                        {"\u270F\uFE0F"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMatch(match.id)}
                        className={adminDangerButtonClass}
                      >
                        {"\uD83D\uDDD1\uFE0F"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "result" && (
        <>
          {schemaError && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {schemaError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[300px_1fr]">
            <div className={adminPanelClass}>
              <h2 className={adminSectionTitleClass}>
                {"\u0412\u044b\u0431\u043e\u0440 \u043c\u0430\u0442\u0447\u0430"}
              </h2>
              <div className="space-y-2 p-3">
                <div>
                  <label className={adminLabelClass}>
                    {"\u041c\u0430\u0442\u0447"}
                  </label>
                  <select
                    value={selectedMatchId ?? ""}
                    onChange={(e) => handleMatchChange(Number(e.target.value))}
                    className={adminInputClass}
                  >
                    {resultMatches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.is_played
                          ? `${getMatchScoreLabel(match)} · `
                          : ""}
                        vs {match.opponent} · {formatMatchDate(match.date)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMatch && (
                  <p className="text-[11px] text-slate-400">
                    {formatMatchDate(selectedMatch.date)} ·{" "}
                    {formatMatchTime(selectedMatch.time)} ·{" "}
                    {selectedMatch.location}
                    {isMatchInProgress(selectedMatch)
                      ? " · \uD83D\uDD34 \u0418\u0434\u0451\u0442"
                      : ""}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={adminLabelClass}>
                      {"\u0413\u043e\u043b\u044b \u041d\u0414\u0424\u041a"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={ndfkGoals}
                      onChange={(e) => setNdfkGoals(Number(e.target.value))}
                      className={adminInputClass}
                    />
                  </div>
                  <div>
                    <label className={adminLabelClass}>
                      {
                        "\u0413\u043e\u043b\u044b \u0441\u043e\u043f\u0435\u0440\u043d\u0438\u043a\u0430"
                      }
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={opponentGoals}
                      onChange={(e) => setOpponentGoals(Number(e.target.value))}
                      className={adminInputClass}
                    />
                  </div>
                </div>

                {selectedMatch && !selectedMatch.is_played && (
                  <div>
                    {!isMatchInProgress(selectedMatch) ? (
                      <button
                        type="button"
                        onClick={handleStartMatch}
                        disabled={saving}
                        className={`${adminSecondaryButtonClass} w-full border-red-400/30 text-red-100`}
                      >
                        {"\u25B6 \u041d\u0430\u0447\u0430\u0442\u044c"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFinishMatchOnly}
                        disabled={saving}
                        className={`${adminPrimaryButtonClass} w-full from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500`}
                      >
                        {"\uD83C\uDFC1 \u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c"}
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveResult}
                  disabled={saving || !selectedMatchId}
                  className={`${adminPrimaryButtonClass} w-full`}
                >
                  {saving
                    ? "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435..."
                    : selectedMatch && !selectedMatch.is_played
                      ? "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0441\u0447\u0451\u0442 (LIVE)"
                      : "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442"}
                </button>
                {selectedMatch && !selectedMatch.is_played && (
                  <p className="text-center text-[10px] text-slate-500">
                    {
                      "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435 \u043d\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0430\u0435\u0442 \u043c\u0430\u0442\u0447. \u0413\u043e\u043b\u043e\u0441\u043e\u0432\u0430\u043d\u0438\u0435 \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435 \u00ab\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c\u00bb."
                    }
                  </p>
                )}

                {selectedMatch?.is_played && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFromHistory(selectedMatch.id)}
                    disabled={saving}
                    className={`${adminSecondaryButtonClass} w-full border-amber-400/30 text-amber-200`}
                  >
                    {
                      "\u21A9 \u0423\u0431\u0440\u0430\u0442\u044c \u0438\u0437 \u0438\u0441\u0442\u043e\u0440\u0438\u0438"
                    }
                  </button>
                )}

                {selectedMatchId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMatchCompletely(selectedMatchId)}
                    disabled={saving}
                    className={`${adminDangerButtonClass} w-full`}
                  >
                    {
                      "\uD83D\uDDD1\uFE0F \u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043c\u0430\u0442\u0447"
                    }
                  </button>
                )}
              </div>
            </div>

            <div className={adminPanelClass}>
              <h2 className={adminSectionTitleClass}>
                {
                  "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0438\u0433\u0440\u043e\u043a\u043e\u0432"
                }
              </h2>
              <div className="grid grid-cols-[1fr_40px_40px_40px] gap-1 border-b border-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <span>{"\u0418\u0433\u0440\u043e\u043a"}</span>
                <span className="text-center">G</span>
                <span className="text-center">A</span>
                <span className="text-center">S</span>
              </div>
              <div className="divide-y divide-white/5">
                {players.map((player) => {
                  const group = getPositionGroup(null, player.position);
                  const style = getPositionStyle(group);
                  const stat = playerStats[player.id] ?? {
                    goals: 0,
                    assists: 0,
                    saves: 0,
                  };
                  const isGoalkeeper = group === "\u0412\u0420\u0422";

                  return (
                    <div
                      key={player.id}
                      className="grid grid-cols-[1fr_40px_40px_40px] items-center gap-1 px-3 py-1.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-5 min-w-[28px] items-center justify-center rounded px-1 text-[9px] font-bold text-white ${style.badge}`}
                        >
                          {group}
                        </span>
                        <span className="truncate text-sm text-white">
                          {player.name}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={stat.goals}
                        onChange={(e) =>
                          updatePlayerStat(
                            player.id,
                            "goals",
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded border border-white/10 bg-black/30 px-1 py-1 text-center text-xs text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        value={stat.assists}
                        onChange={(e) =>
                          updatePlayerStat(
                            player.id,
                            "assists",
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded border border-white/10 bg-black/30 px-1 py-1 text-center text-xs text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        value={stat.saves}
                        disabled={!isGoalkeeper}
                        onChange={(e) =>
                          updatePlayerStat(
                            player.id,
                            "saves",
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded border border-white/10 bg-black/30 px-1 py-1 text-center text-xs text-white disabled:opacity-30"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminMatchesPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-slate-400">
          {"\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430..."}
        </p>
      }
    >
      <AdminMatchesHub />
    </Suspense>
  );
}
