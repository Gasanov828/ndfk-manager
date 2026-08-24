"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StarRatingPicker from "@/components/StarRatingPicker";
import SwipeRatingPicker from "@/components/SwipeRatingPicker";
import MatchRatingResultsModal from "@/components/MatchRatingResultsModal";
import RatingChangeBadge from "@/components/RatingChangeBadge";
import {
  countPendingRatingVotes,
  formatVotePercent,
  formatVoteScoreWithMax,
  formatVotingCountdown,
  formatVotingTimeRemaining,
  getLatestMatchForVotingPanel,
  getMatchRatingCoverage,
  getActiveVoterProgress,
  getRatingDelta,
  getVotingTimeRemainingMs,
  getVotingUrgency,
  hasSubmittedRatingBallot,
  isVotingDeadlinePassed,
  MAX_EIGHT_PLUS_PER_BALLOT,
  MAX_NINE_PLUS_PER_BALLOT,
  MAX_VOTE_SCORE,
  normalizeVoteScore,
  type MatchRatingVote,
} from "@/lib/matchRatings";
import { SHOW_MATCH_MVP_UI } from "@/lib/matchMvpUi";
import { validateStarBallotLimits, canSelectStarScore } from "@/lib/starBallotLimits";
import {
  ratingBandCardClass,
  ratingBandTextClass,
} from "@/lib/ratingBands";
import type { UnlockedAchievement } from "@/lib/achievements/types";
import { formatMatchDate, formatMatchTime } from "@/lib/matches";
import {
  filterParticipatingPlayerIds,
  getMatchRatingVoterIds,
} from "@/lib/matchParticipation";
import {
  MATCH_FINISHED_EVENT,
  MATCH_STARTED_EVENT,
  type MatchWithLive,
} from "@/lib/matchStatus";
import { recalculateMatchRatingsViaApi } from "@/lib/matchRatingRecalcApi";
import { AWAY_MATCH_RATING } from "@/lib/ratingVoteBranding";
import { buildMatchVotePath } from "@/lib/matchMvpVote";
import { useMyPlayerId } from "@/hooks/useMyPlayerId";
import { useCanViewPlayerPhotos } from "@/hooks/useVisiblePhotoUrl";
import { visiblePhotoUrl } from "@/lib/playerPhotoPrivacy";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import { supabase } from "@/lib/supabase";

type Player = {
  id: number;
  name: string;
  position: string;
  photo_url?: string | null;
  rating?: number;
};

type PlayedMatch = {
  id: number;
  opponent: string;
  date: string;
  time: string;
  location: string;
  is_played: boolean;
  rating_voting_ends_at?: string | null;
  ndfk_goals?: number;
  opponent_goals?: number;
};

type MatchPlayerStatMini = {
  player_id: number;
  goals?: number | null;
  assists?: number | null;
  saves?: number | null;
  tackles?: number | null;
  interceptions?: number | null;
};

export type MatchVoteControl = {
  draftRatings: Record<number, number>;
  /** Оценки, уже сохранённые в БД текущим пользователем */
  savedRatings: Record<number, number>;
  canRate: boolean;
  myPlayerId: number | null;
  setRating: (playerId: number, score: number) => void;
  savePlayerRating: (
    playerId: number,
    score: number
  ) => Promise<{ ok: boolean; error?: string }>;
  saving: boolean;
  myRatedCount: number;
  ratingTargetCount: number;
  allRated: boolean;
};

export default function MatchRatingVote({
  compact = false,
  fullPage = false,
  fixedMatchId,
  onUpdated,
  combinedBoard = false,
  onVoteControlChange,
}: {
  compact?: boolean;
  fullPage?: boolean;
  fixedMatchId?: number;
  onUpdated?: () => void;
  /** На странице голосования — только футер; список игроков в MatchMvpVoteBoard */
  combinedBoard?: boolean;
  onVoteControlChange?: (control: MatchVoteControl | null) => void;
}) {
  const { playerId: myPlayerId, canVote, loading: authLoading } =
    useMyPlayerId();
  const canViewPhotos = useCanViewPlayerPhotos();
  const [open, setOpen] = useState(false);
  const [match, setMatch] = useState<PlayedMatch | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [iParticipated, setIParticipated] = useState(true);
  const [votes, setVotes] = useState<MatchRatingVote[]>([]);
  const [draftRatings, setDraftRatings] = useState<Record<number, number>>({});
  const [summaries, setSummaries] = useState<
    {
      player_id: number;
      match_rating: number;
      is_mvp: boolean;
      vote_count: number;
      rating_before?: number | null;
      rating_after?: number | null;
    }[]
  >([]);
  const [matchStats, setMatchStats] = useState<Record<number, MatchPlayerStatMini>>({});
  const [saving, setSaving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [skippingVote, setSkippingVote] = useState(false);
  const [iSkippedVote, setISkippedVote] = useState(false);
  const [ratingVoterIds, setRatingVoterIds] = useState<number[]>([]);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsUnlocked, setResultsUnlocked] = useState<UnlockedAchievement[]>(
    []
  );
  const [resultsXp, setResultsXp] = useState(0);
  const [resultsEventIds, setResultsEventIds] = useState<number[]>([]);
  const [showOvrRatings, setShowOvrRatings] = useState(false);
  const [selectedVotePlayerId, setSelectedVotePlayerId] = useState<number | null>(
    null
  );
  const resultsShownForMatch = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const participantIds = players.map((player) => player.id);
  const pendingCount = countPendingRatingVotes(participantIds, myPlayerId, votes);
  const voteComplete = hasSubmittedRatingBallot(myPlayerId, votes);
  const ratingCoverage = getMatchRatingCoverage(participantIds, votes);
  const voterProgress = getActiveVoterProgress(ratingVoterIds, votes);
  const deadlinePassed = match ? isVotingDeadlinePassed(match) : false;
  const votingClosed = deadlinePassed;
  const ratingsApplied = summaries.length > 0;
  const canRate =
    canVote &&
    iParticipated &&
    !iSkippedVote &&
    !votingClosed &&
    !saving &&
    !voteComplete;

  const ratingTargets = players.filter((player) => player.id !== myPlayerId);
  const savedRatings = useMemo(() => {
    if (!myPlayerId) return {};
    return votes
      .filter((vote) => vote.voter_player_id === myPlayerId)
      .reduce<Record<number, number>>((acc, vote) => {
        acc[vote.rated_player_id] = vote.stars;
        return acc;
      }, {});
  }, [votes, myPlayerId]);
  const allTargetsRated =
    ratingTargets.length > 0 &&
    ratingTargets.every(
      (player) =>
        savedRatings[player.id] >= 1 &&
        savedRatings[player.id] <= MAX_VOTE_SCORE
    );
  const userVotingDone = allTargetsRated || iSkippedVote;
  const isActive =
    Boolean(match && canVote && iParticipated && !iSkippedVote) &&
    !allTargetsRated &&
    !votingClosed;
  const selectedVotePlayer = selectedVotePlayerId
    ? players.find((player) => player.id === selectedVotePlayerId) ?? null
    : null;
  /** Р’Рѕ РІСЂРµРјСЏ РіРѕР»РѕСЃРѕРІР°РЅРёСЏ вЂ” С‚РѕР»СЊРєРѕ РїР°СЂС‚РЅС‘СЂС‹; РїРѕСЃР»Рµ вЂ” РІСЃСЏ Р·Р°СЏРІРєР° (РІРєР»СЋС‡Р°СЏ СЃРµР±СЏ) */
  const displayPlayers =
    votingClosed || voteComplete ? players : ratingTargets;
  const myRatedCount = ratingTargets.filter(
    (player) =>
      savedRatings[player.id] >= 1 &&
      savedRatings[player.id] <= MAX_VOTE_SCORE
  ).length;
  const myDraftRatedCount = ratingTargets.filter(
    (player) =>
      draftRatings[player.id] >= 1 && draftRatings[player.id] <= MAX_VOTE_SCORE
  ).length;
  const canSubmitPartial =
    myDraftRatedCount > 0 && !votingClosed && !voteComplete;

  const setRating = useCallback((playerId: number, score: number) => {
    setDraftRatings((prev) => ({ ...prev, [playerId]: score }));
  }, []);

  async function loadChampionshipVotingPlayerIds(
    votingMatch: PlayedMatch
  ): Promise<Set<number> | null> {
    const { data: championship } = await supabase
      .from("championships")
      .select("id")
      .eq("status", "active")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!championship) return null;

    const { data: homeTeam } = await supabase
      .from("championship_teams")
      .select("id")
      .eq("name", "\u0414\u0436\u0435\u043d\u0433\u0443\u0442\u0430\u0439")
      .maybeSingle();

    if (!homeTeam) return null;

    const { data: championshipMatches } = await supabase
      .from("championship_matches")
      .select(
        "id, home_team_id, away_team_id, match_date, match_time, home_team:championship_teams!championship_matches_home_team_id_fkey(id, name), away_team:championship_teams!championship_matches_away_team_id_fkey(id, name)"
      )
      .eq("championship_id", championship.id)
      .eq("match_date", votingMatch.date)
      .eq("match_time", votingMatch.time || "18:00")
      .or(`home_team_id.eq.${homeTeam.id},away_team_id.eq.${homeTeam.id}`);

    const sourceMatch = (championshipMatches ?? []).find((row) => {
      const home = Array.isArray(row.home_team) ? row.home_team[0] : row.home_team;
      const away = Array.isArray(row.away_team) ? row.away_team[0] : row.away_team;
      const weAreHome = Number(row.home_team_id) === Number(homeTeam.id);
      const opponentName = weAreHome ? away?.name : home?.name;
      return opponentName === votingMatch.opponent;
    });

    if (!sourceMatch) return null;

    const { data: squadRows } = await supabase
      .from("championship_player_season_stats")
      .select("player_id")
      .eq("championship_id", championship.id)
      .eq("team_id", homeTeam.id);

    const ids = (squadRows ?? [])
      .map((row) => Number(row.player_id))
      .filter((id) => Number.isFinite(id) && id > 0);

    return ids.length > 0 ? new Set(ids) : null;
  }

  const loadGuestData = useCallback(async () => {
    const { data: matches } = await supabase.from("matches").select("*");
    const matchRows = (matches ?? []) as MatchWithLive[];
    const latestPlayed = fixedMatchId
      ? ((matchRows as PlayedMatch[]).find(
          (row) =>
            row.id === fixedMatchId &&
            row.is_played &&
            !isVotingDeadlinePassed(row)
        ) ?? null)
      : getLatestMatchForVotingPanel(matchRows as PlayedMatch[]);

    if (!latestPlayed) {
      setMatch(null);
      return;
    }

    setMatch(latestPlayed);

    const { data: playerData } = await supabase
      .from("players")
      .select("id, name, position, photo_url, rating")
      .order("name");

    let guestParticipantIds: number[] = [];
    let guestRatingVoterIds: number[] = [];

    if (playerData) {
      const championshipPlayerIds = await loadChampionshipVotingPlayerIds(latestPlayed);
      const isChampionshipVote = Boolean(championshipPlayerIds);
      const eligiblePlayerIds = championshipPlayerIds ?? new Set(
        playerData.map((player) => player.id)
      );
      const eligiblePlayers = playerData.filter((player) =>
        eligiblePlayerIds.has(player.id)
      );

      const { data: participationRows } = await supabase
        .from("match_player_participation")
        .select("player_id, participated, skipped_rating_vote")
        .eq("match_id", latestPlayed.id);

      guestParticipantIds = filterParticipatingPlayerIds(
        eligiblePlayers.map((player) => player.id),
        participationRows ?? []
      );
      const participantSet = new Set(guestParticipantIds);
      const voterSourceIds = isChampionshipVote
        ? playerData.map((player) => player.id)
        : guestParticipantIds;
      guestRatingVoterIds = getMatchRatingVoterIds(
        voterSourceIds,
        participationRows ?? []
      );

      setPlayers(eligiblePlayers.filter((player) => participantSet.has(player.id)));
      setRatingVoterIds(guestRatingVoterIds);
      setIParticipated(
        isChampionshipVote ? true : myPlayerId != null ? participantSet.has(myPlayerId) : true
      );
      setISkippedVote(
        myPlayerId != null
          ? Boolean(
              participationRows?.find((row) => row.player_id === myPlayerId)
                ?.skipped_rating_vote
            )
          : false
      );
    }
    const { data: voteData, error: voteError } = await supabase
      .from("match_player_rating_votes")
      .select("*")
      .eq("match_id", latestPlayed.id);

    if (voteError?.message.includes("match_player_rating")) {
      setSchemaMissing(true);
      return;
    }

    setSchemaMissing(false);
    const voteRows = (voteData ?? []) as MatchRatingVote[];
    setVotes(voteRows);

    const myVotes = voteRows.filter(
      (vote) => vote.voter_player_id === myPlayerId
    );
    const fromDb = myVotes.reduce<Record<number, number>>((acc, vote) => {
      acc[vote.rated_player_id] = vote.stars;
      return acc;
    }, {});

    setDraftRatings((prev) => {
      if (open && Object.keys(prev).length > 0) {
        return { ...fromDb, ...prev };
      }
      return fromDb;
    });

    const { data: summaryData } = await supabase
      .from("match_player_rating_summary")
      .select("player_id, match_rating, is_mvp, vote_count, rating_before, rating_after")
      .eq("match_id", latestPlayed.id)
      .order("match_rating", { ascending: false });

    let statsRows: MatchPlayerStatMini[] = [];
    const statsResult = await supabase
      .from("match_player_stats")
      .select("player_id, goals, assists, saves, tackles, interceptions")
      .eq("match_id", latestPlayed.id);

    if (
      statsResult.error?.message.includes("tackles") ||
      statsResult.error?.message.includes("interceptions")
    ) {
      const retry = await supabase
        .from("match_player_stats")
        .select("player_id, goals, assists, saves")
        .eq("match_id", latestPlayed.id);
      statsRows = (retry.data ?? []) as MatchPlayerStatMini[];
    } else {
      statsRows = (statsResult.data ?? []) as MatchPlayerStatMini[];
    }

    setMatchStats(
      statsRows.reduce<Record<number, MatchPlayerStatMini>>((acc, row) => {
        acc[Number(row.player_id)] = row;
        return acc;
      }, {})
    );

    const hasStatActivity = statsRows.some(
      (row) =>
        (row.goals ?? 0) > 0 ||
        (row.assists ?? 0) > 0 ||
        (row.saves ?? 0) > 0 ||
        (row.tackles ?? 0) > 0 ||
        (row.interceptions ?? 0) > 0
    );

    const summariesLoaded = summaryData ?? [];

    if (
      canVote &&
      summariesLoaded.length === 0 &&
      latestPlayed.is_played &&
      (voteRows.length > 0 || hasStatActivity)
    ) {
      try {
        await recalculateMatchRatingsViaApi(latestPlayed.id);
        const { data: freshSummaries } = await supabase
          .from("match_player_rating_summary")
          .select("player_id, match_rating, is_mvp, vote_count, rating_before, rating_after")
          .eq("match_id", latestPlayed.id)
          .order("match_rating", { ascending: false });

        setSummaries(freshSummaries ?? []);
        return;
      } catch {
        // РџРѕРІС‚РѕСЂРёРј РїСЂРё СЃР»РµРґСѓСЋС‰РµР№ Р·Р°РіСЂСѓР·РєРµ
      }
    }

    setSummaries(summariesLoaded);
  }, [myPlayerId, open, canVote, fixedMatchId]);

  const savePlayerRating = useCallback(
    async (
      playerId: number,
      score: number
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!match || !myPlayerId || !canVote || votingClosed || iSkippedVote) {
        return { ok: false, error: "Сейчас нельзя голосовать" };
      }
      if (playerId === myPlayerId) {
        return { ok: false, error: "Нельзя оценить себя" };
      }

      const currentSaved = votes
        .filter((vote) => vote.voter_player_id === myPlayerId)
        .reduce<Record<number, number>>((acc, vote) => {
          acc[vote.rated_player_id] = vote.stars;
          return acc;
        }, {});

      if (
        currentSaved[playerId] >= 1 &&
        currentSaved[playerId] <= MAX_VOTE_SCORE
      ) {
        return { ok: false, error: "Вы уже оценили этого игрока" };
      }

      const roundedScore = Math.round(normalizeVoteScore(score));
      if (roundedScore < 1 || roundedScore > MAX_VOTE_SCORE) {
        return { ok: false, error: `Оценка от 1 до ${MAX_VOTE_SCORE}` };
      }

      const limitCheck = canSelectStarScore(
        currentSaved,
        playerId,
        roundedScore
      );
      if (!limitCheck.ok) {
        return { ok: false, error: limitCheck.reason };
      }

      setSaving(true);
      const { error } = await supabase.from("match_player_rating_votes").insert({
        match_id: match.id,
        voter_player_id: myPlayerId,
        rated_player_id: playerId,
        stars: roundedScore,
      });

      if (error) {
        setSaving(false);
        return { ok: false, error: error.message };
      }

      try {
        await recalculateMatchRatingsViaApi(match.id);
        await loadGuestData();
        onUpdated?.();
        setSaving(false);
        return { ok: true };
      } catch (recalcError) {
        setSaving(false);
        return {
          ok: false,
          error:
            recalcError instanceof Error
              ? recalcError.message
              : "Ошибка пересчёта оценок",
        };
      }
    },
    [
      match,
      myPlayerId,
      canVote,
      votingClosed,
      iSkippedVote,
      votes,
      loadGuestData,
      onUpdated,
    ]
  );

  const setRatingRef = useRef(setRating);
  setRatingRef.current = setRating;
  const savePlayerRatingRef = useRef(savePlayerRating);
  savePlayerRatingRef.current = savePlayerRating;

  const emitSetRating = useCallback((playerId: number, score: number) => {
    setRatingRef.current(playerId, score);
  }, []);

  const emitSavePlayerRating = useCallback(
    (playerId: number, score: number) =>
      savePlayerRatingRef.current(playerId, score),
    []
  );

  const onVoteControlChangeRef = useRef(onVoteControlChange);
  onVoteControlChangeRef.current = onVoteControlChange;

  const voteControlSignature = useMemo(() => {
    const inactive =
      authLoading ||
      !canVote ||
      !match ||
      votingClosed ||
      (combinedBoard && (iSkippedVote || voteComplete)) ||
      (!combinedBoard && voteComplete);

    return JSON.stringify({
      inactive,
      draftRatings,
      savedRatings,
      canRate,
      myPlayerId: myPlayerId ?? null,
      saving,
      myRatedCount,
      ratingTargetCount: ratingTargets.length,
      allRated: allTargetsRated,
    });
  }, [
    authLoading,
    canVote,
    match,
    votingClosed,
    combinedBoard,
    iSkippedVote,
    allTargetsRated,
    voteComplete,
    draftRatings,
    savedRatings,
    canRate,
    myPlayerId,
    saving,
    myRatedCount,
    ratingTargets.length,
  ]);

  useEffect(() => {
    if (!combinedBoard) return;
    const notify = onVoteControlChangeRef.current;
    if (!notify) return;

    const payload = JSON.parse(voteControlSignature) as {
      inactive: boolean;
      draftRatings: Record<number, number>;
      savedRatings: Record<number, number>;
      canRate: boolean;
      myPlayerId: number | null;
      saving: boolean;
      myRatedCount: number;
      ratingTargetCount: number;
      allRated: boolean;
    };

    if (payload.inactive) {
      notify(null);
      return;
    }

    notify({
      draftRatings: payload.draftRatings,
      savedRatings: payload.savedRatings,
      canRate: payload.canRate,
      myPlayerId: payload.myPlayerId,
      setRating: emitSetRating,
      savePlayerRating: emitSavePlayerRating,
      saving: payload.saving,
      myRatedCount: payload.myRatedCount,
      ratingTargetCount: payload.ratingTargetCount,
      allRated: payload.allRated,
    });
  }, [combinedBoard, voteControlSignature, emitSetRating, emitSavePlayerRating]);

  useEffect(() => {
    if (authLoading) return;
    if (!fullPage && !myPlayerId) return;
    loadGuestData();

    const interval = setInterval(loadGuestData, 60000);
    const onMatchStateChange = () => loadGuestData();

    window.addEventListener(MATCH_FINISHED_EVENT, onMatchStateChange);
    window.addEventListener(MATCH_STARTED_EVENT, onMatchStateChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener(MATCH_FINISHED_EVENT, onMatchStateChange);
      window.removeEventListener(MATCH_STARTED_EVENT, onMatchStateChange);
    };
  }, [loadGuestData, authLoading, myPlayerId, fullPage]);

  useEffect(() => {
    if (!fullPage || !canRate || ratingTargets.length === 0) return;
    setSelectedVotePlayerId((current) => {
      if (current != null && ratingTargets.some((player) => player.id === current)) {
        return current;
      }
      return ratingTargets[0]?.id ?? null;
    });
  }, [fullPage, canRate, ratingTargets]);

  useEffect(() => {
    if (!match) {
      setRemainingMs(null);
      return;
    }

    const update = () => setRemainingMs(getVotingTimeRemainingMs(match));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [match]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (
      !votingClosed ||
      !ratingsApplied ||
      !match ||
      !myPlayerId ||
      !iParticipated ||
      iSkippedVote
    ) {
      return;
    }

    if (resultsShownForMatch.current === match.id) return;

    const storageKey = `match-rating-results-seen-${match.id}`;
    try {
      if (localStorage.getItem(storageKey)) {
        resultsShownForMatch.current = match.id;
        return;
      }
    } catch {
      // ignore
    }

    // РќРµ РїРёС€РµРј РІ storage РґРѕ В«РџРѕРЅСЏС‚РЅРѕВ» вЂ” РёРЅР°С‡Рµ РїРѕСЃР»Рµ РЅРѕРІРѕРіРѕ РІРёР·РёС‚Р° РѕРєРЅРѕ СЃРЅРѕРІР° РІСЃРїР»С‹РІС‘С‚.
    resultsShownForMatch.current = match.id;

    let cancelled = false;

    (async () => {
      let unlocked: UnlockedAchievement[] = [];
      let eventIds: number[] = [];
      try {
        const response = await fetch("/api/achievements/me", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          unseen?: Array<UnlockedAchievement & { eventId?: number; xp?: number }>;
        };
        unlocked = (data.unseen ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          icon: item.icon,
          category: item.category,
          rarity: item.rarity,
          xp: item.xp ?? 0,
          unlockedAt: item.unlockedAt ?? new Date().toISOString(),
        }));
        eventIds = (data.unseen ?? [])
          .map((item) => item.eventId)
          .filter((id): id is number => typeof id === "number");
      } catch {
        // РѕРєРЅРѕ РёС‚РѕРіРѕРІ РІСЃС‘ СЂР°РІРЅРѕ РїРѕРєР°Р¶РµРј
      }

      if (cancelled) return;
      setResultsUnlocked(unlocked);
      setResultsEventIds(eventIds);
      setResultsXp(unlocked.reduce((sum, item) => sum + (item.xp || 0), 0));
      setResultsOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    votingClosed,
    ratingsApplied,
    match,
    myPlayerId,
    iParticipated,
    iSkippedVote,
  ]);

  async function closeResultsModal() {
    setResultsOpen(false);
    if (match) {
      try {
        localStorage.setItem(`match-rating-results-seen-${match.id}`, "1");
      } catch {
        // ignore
      }
    }
    if (resultsEventIds.length > 0) {
      await fetch("/api/achievements/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventIds: resultsEventIds }),
      }).catch(() => {});
      setResultsEventIds([]);
    }
  }

  async function handleDeclineParticipation() {
    if (!match || !myPlayerId || !canVote || votingClosed) return;

    if (
      !confirm(
        "Вы не играли в этом матче? Вы не будете участвовать в голосовании и оценке ★."
      )
    ) {
      return;
    }

    setDeclining(true);

    const { error: participationError } = await supabase
      .from("match_player_participation")
      .upsert(
        {
          match_id: match.id,
          player_id: myPlayerId,
          participated: false,
        },
        { onConflict: "match_id,player_id" }
      );

    if (participationError) {
      alert(
        participationError.message.includes("match_player_participation")
          ? "Выполните SQL: match_participation.sql и match_participation_rls.sql"
          : participationError.message
      );
      setDeclining(false);
      return;
    }

    await supabase
      .from("match_player_rating_votes")
      .delete()
      .eq("match_id", match.id)
      .eq("voter_player_id", myPlayerId);

    await supabase
      .from("match_player_rating_votes")
      .delete()
      .eq("match_id", match.id)
      .eq("rated_player_id", myPlayerId);

    try {
      await recalculateMatchRatingsViaApi(match.id);
      await loadGuestData();
      setOpen(false);
      alert("Отмечено: вы не играли в этом матче.");
    } catch (recalcError) {
      alert(
        recalcError instanceof Error
          ? recalcError.message
          : "Ошибка обновления голосования"
      );
    }

    setDeclining(false);
  }

  async function handleSkipVoting() {
    if (!match || !myPlayerId || !canVote || votingClosed) return;

    if (
      !confirm(
        "Не будете голосовать? Ваши оценки удалятся, но вы останетесь участником матча."
      )
    ) {
      return;
    }

    setSkippingVote(true);

    const { error: participationError } = await supabase
      .from("match_player_participation")
      .upsert(
        {
          match_id: match.id,
          player_id: myPlayerId,
          participated: true,
          skipped_rating_vote: true,
        },
        { onConflict: "match_id,player_id" }
      );

    if (participationError) {
      alert(
        participationError.message.includes("skipped_rating_vote")
          ? "Выполните SQL: match_participation_skipped_vote.sql"
          : participationError.message.includes("match_player_participation")
            ? "Выполните SQL: match_participation.sql и match_participation_rls.sql"
            : participationError.message
      );
      setSkippingVote(false);
      return;
    }

    await supabase
      .from("match_player_rating_votes")
      .delete()
      .eq("match_id", match.id)
      .eq("voter_player_id", myPlayerId);

    try {
      await recalculateMatchRatingsViaApi(match.id);
      await loadGuestData();
      setOpen(false);
      alert("Отмечено: вы не участвуете в голосовании за этот матч.");
    } catch (recalcError) {
      alert(
        recalcError instanceof Error
          ? recalcError.message
          : "Ошибка обновления голосования"
      );
    }

    setSkippingVote(false);
  }

  async function handleSubmit() {
    if (!match || !myPlayerId || !canVote) return;

    const ratedTargets = ratingTargets.filter(
      (player) =>
        draftRatings[player.id] >= 1 && draftRatings[player.id] <= MAX_VOTE_SCORE
    );

    if (ratedTargets.length === 0) {
      alert("РџРѕСЃС‚Р°РІСЊС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРЅСѓ РѕС†РµРЅРєСѓ (РѕС‚ 1 РґРѕ 10)");
      return;
    }

    const limitCheck = validateStarBallotLimits(
      ratedTargets.map((player) => draftRatings[player.id])
    );
    if (!limitCheck.ok) {
      alert(limitCheck.reason);
      return;
    }

    setSaving(true);

    await supabase
      .from("match_player_rating_votes")
      .delete()
      .eq("match_id", match.id)
      .eq("voter_player_id", myPlayerId);

    const rows = ratedTargets.map((player) => ({
      match_id: match.id,
      voter_player_id: myPlayerId,
      rated_player_id: player.id,
      stars: draftRatings[player.id],
    }));

    const { error } = await supabase.from("match_player_rating_votes").insert(rows);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    try {
      const result = await recalculateMatchRatingsViaApi(match.id);
      await loadGuestData();
      onUpdated?.();

      setSaving(false);

      if (result.ratingsApplied) {
        if (result.votingClosed) {
          // РёС‚РѕРіРё РїРѕРєР°Р¶РµС‚ MatchRatingResultsModal
        } else {
          alert(
            `Сохранено ${ratedTargets.length} оценок. ★ обновлены (оценено ${ratingCoverage.ratedCount} из ${ratingCoverage.total}).`
          );
        }
      } else {
        alert(`Сохранено ${ratedTargets.length} оценок.`);
      }
    } catch (recalcError) {
      alert(
        recalcError instanceof Error
          ? recalcError.message
          : "Ошибка пересчёта оценок"
      );
      setSaving(false);
    }
  }

  if (authLoading || !canVote) return null;
  if (!match) return null;

  const topRatedSummary =
    [...summaries]
      .filter((row) => row.vote_count > 0)
      .sort(
        (a, b) =>
          Number(b.match_rating) - Number(a.match_rating) ||
          b.vote_count - a.vote_count
      )[0] ?? null;

  // После 24ч голосования кнопку оценок («Готово / Результат») с шапки убираем — не светится.
  // MVP появляется отдельным блоком на главной уже после закрытия голосования.
  if (votingClosed) return null;

  const guestRatingButtonLabel = (
    topLine: string,
    muted = false,
    countdownMs?: number | null
  ) => {
    const urgency =
      countdownMs != null && countdownMs > 0
        ? getVotingUrgency(countdownMs)
        : null;

    return (
      <span
        className={`min-w-0 text-left text-[10px] font-bold leading-tight sm:text-xs ${
          muted ? "text-slate-400" : "text-white"
        }`}
      >
        <span className="block">{topLine}</span>
        {urgency && !muted && (
          <span
            className={`block text-[9px] font-bold leading-snug ${
              urgency.level === "critical" || urgency.level === "urgent"
                ? "text-red-300"
                : urgency.level === "soon"
                  ? "text-orange-300"
                  : "text-amber-300"
            }`}
          >
            {urgency.headline}
          </span>
        )}
        {countdownMs != null && countdownMs > 0 && (
          <span className="block font-mono text-[9px] font-bold tabular-nums leading-snug text-amber-300">
            {"\u23F1"} {formatVotingCountdown(countdownMs)}
          </span>
        )}
      </span>
    );
  };

  if (!iParticipated) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 md:px-4"
        title="Вы отметили, что не играли в этом матче"
      >
        <span className="shrink-0 text-base sm:text-lg">{"\u2298"}</span>
        {guestRatingButtonLabel("Не играл", true)}
      </div>
    );
  }

  if (iSkippedVote) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 md:px-4"
        title="Вы отказались от голосования за этот матч"
      >
        <span className="shrink-0 text-base sm:text-lg">{"\u{1F6AB}"}</span>
        {guestRatingButtonLabel("Без голоса", true)}
      </div>
    );
  }

  if (players.length < 2) {
    return (
      <div
        className="flex max-w-[8rem] items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-2 py-2.5 opacity-55 sm:max-w-none sm:gap-2 sm:px-2.5 md:px-4"
        title="Нужно минимум 2 игрока"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm font-black text-slate-400">
          {AWAY_MATCH_RATING.icon}
        </span>
        {guestRatingButtonLabel(AWAY_MATCH_RATING.navShort, true)}
      </div>
    );
  }

  const mvpSummary = votingClosed
    ? summaries.find((row) => row.is_mvp) ?? topRatedSummary
    : null;
  const mySummary = myPlayerId
    ? summaries.find((row) => row.player_id === myPlayerId)
    : null;
  const leaderSummary = !votingClosed ? topRatedSummary : null;
  const remainingLabel =
    remainingMs != null ? formatVotingTimeRemaining(remainingMs) : null;

  const ratingPanelShellClass =
    "flex max-h-[min(88dvh,90vh)] w-full flex-col overflow-hidden rounded-t-3xl border border-amber-400/30 bg-[#0b1224] shadow-[0_-12px_48px_rgba(0,0,0,0.55)] md:max-h-[80vh] md:w-[min(400px,calc(100vw-2rem))] md:rounded-2xl";

  const closePanel = () => setOpen(false);

  const ratingPanelContent = (
    <>
      {/* Sheet handle + compact header for narrow phones */}
      {!fullPage ? (
      <div className="shrink-0 border-b border-white/10 px-2.5 pb-2 pt-1.5 sm:px-3">
        <div className="mx-auto mb-1.5 h-1 w-9 rounded-full bg-white/20 md:hidden" />
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="text-[14px] font-extrabold leading-tight text-white sm:text-[15px]">
                ★ Оценки
              </p>
              {remainingLabel && !votingClosed && (
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-amber-200">
                  {remainingMs != null && remainingMs > 0
                    ? formatVotingCountdown(remainingMs)
                    : remainingLabel}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[10px] text-slate-400 sm:text-[11px]">
              vs {match.opponent}
            </p>
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-base font-bold text-white transition hover:bg-white/20 active:scale-95 sm:h-10 sm:w-10 sm:text-lg"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[10px] sm:text-[11px]">
          <span className="shrink-0 font-semibold text-slate-300">
            {myRatedCount}/{ratingTargets.length}
          </span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
              style={{
                width: `${
                  ratingTargets.length
                    ? Math.round((myRatedCount / ratingTargets.length) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <span className="shrink-0 text-amber-200/80">1–10</span>
        </div>
      </div>
      ) : null}

      {fullPage && !combinedBoard ? (
        <div className="shrink-0 border-b border-white/10 px-2.5 py-2 sm:px-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-white">
                Поставьте оценки
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {myRatedCount}/{ratingTargets.length} · нажми игрока · свайп 1–10
              </p>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1">
              <input
                type="checkbox"
                checked={showOvrRatings}
                onChange={(event) => setShowOvrRatings(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 accent-amber-400"
              />
              <span className="text-[10px] font-semibold text-slate-200">
                Рейтинг ★
              </span>
            </label>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                style={{
                  width: `${
                    ratingTargets.length
                      ? Math.round((myRatedCount / ratingTargets.length) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-bold text-amber-200/90">
              {myRatedCount}/{ratingTargets.length}
            </span>
          </div>
        </div>
      ) : null}

      {schemaMissing ? (
        <div className="px-3 py-3 text-xs text-amber-200">
          <p className="font-semibold">
            Выполните SQL: match_ratings.sql и match_ratings_10scale.sql
          </p>
        </div>
      ) : (
        <>
          {!combinedBoard ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {SHOW_MATCH_MVP_UI &&
              !fullPage &&
              ratingsApplied &&
              summaries.length > 0 &&
              (mvpSummary || leaderSummary) && (
                <div className="mx-3 mt-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[12px] text-amber-50">
                  🏆 {votingClosed ? "MVP" : "Лидер"}:{" "}
                  <span className="font-bold">
                    {
                      players.find(
                        (player) =>
                          player.id ===
                          (mvpSummary ?? leaderSummary)?.player_id
                      )?.name
                    }
                  </span>{" "}
                  ·{" "}
                  {formatVoteScoreWithMax(
                    Number((mvpSummary ?? leaderSummary)?.match_rating)
                  )}
                  <span className="text-amber-200/70">
                    {" "}
                    (
                    {formatVotePercent(
                      Number((mvpSummary ?? leaderSummary)?.match_rating)
                    )}
                    )
                  </span>
                </div>
              )}

            {!canRate && !fullPage && (
              <p className="mx-3 mt-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-300">
                {votingClosed
                  ? summaries.length > 0
                    ? "Голосование закрыто."
                    : "Время голосования вышло."
                  : voteComplete
                    ? "Вы уже отправили оценки."
                    : "Сейчас нельзя менять оценки."}
              </p>
            )}

            {!fullPage ? (
              <>
                <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold text-slate-500 sm:px-3">
                  Оцените партнёров 1–10. Себя нельзя. Всех оценивать необязательно.
                </p>
                <p className="px-2.5 pb-1 text-[9px] text-slate-600 sm:px-3">
                  🔴1–3 · 🟠4–6 · 🟢7–8 · 🟡9–10 · лимит 9–10 ≤
                  {MAX_NINE_PLUS_PER_BALLOT}, 8+ ≤{MAX_EIGHT_PLUS_PER_BALLOT}
                </p>
              </>
            ) : null}
            <div
              className={`px-2.5 py-1.5 sm:px-3 ${fullPage ? "space-y-1.5" : "space-y-2"}`}
            >
              {displayPlayers.map((player) => {
                const group = getPositionGroup(null, player.position);
                const style = getPositionStyle(group);
                const summary = summaries.find(
                  (row) => row.player_id === player.id
                );
                const isSelf = player.id === myPlayerId;
                const draftValue = draftRatings[player.id] ?? 0;
                const hasVotes = Boolean(summary && summary.vote_count > 0);
                const showSummary = Boolean(
                  summary &&
                    ratingsApplied &&
                    (votingClosed || voteComplete) &&
                    (hasVotes ||
                      getRatingDelta(
                        summary.rating_before,
                        summary.rating_after
                      ) !== 0)
                );
                const showNoVotes =
                  Boolean(summary) &&
                  ratingsApplied &&
                  votingClosed &&
                  !hasVotes;
                const showMvp = Boolean(
                  SHOW_MATCH_MVP_UI &&
                    summary?.is_mvp &&
                    ratingsApplied &&
                    votingClosed &&
                    hasVotes
                );
                const cardTone =
                  canRate && draftValue > 0
                    ? ratingBandCardClass(draftValue)
                    : showMvp
                      ? "border-amber-400/30 bg-amber-500/[0.1]"
                      : "border-white/8 bg-white/[0.03]";

                const ovrRating =
                  player.rating != null && Number.isFinite(Number(player.rating))
                    ? Math.round(Number(player.rating))
                    : null;

                if (fullPage && canRate && !isSelf) {
                  const isSelected = selectedVotePlayerId === player.id;
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelectedVotePlayerId(player.id)}
                      className={`flex w-full items-center gap-1.5 rounded-xl border px-2 py-1.5 text-left transition ${
                        isSelected
                          ? "border-amber-400/45 bg-amber-500/12 ring-1 ring-amber-400/30"
                          : draftValue > 0
                            ? ratingBandCardClass(draftValue)
                            : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/15 bg-slate-800">
                        {visiblePhotoUrl(player.photo_url, canViewPhotos) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={visiblePhotoUrl(player.photo_url, canViewPhotos)!}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-full w-full items-center justify-center text-[10px] font-bold text-white ${style.badge}`}
                          >
                            {player.name
                              .split(/\s+/)
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-[12px] font-semibold text-white">
                            {player.name}
                          </p>
                          {showOvrRatings && ovrRating != null ? (
                            <span className="shrink-0 rounded-md bg-amber-500/15 px-1 py-0.5 text-[10px] font-bold tabular-nums text-amber-200">
                              ★{ovrRating}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-[9px] text-slate-500">
                          {group}
                          {player.position ? ` · ${player.position}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2 py-1 text-[14px] font-black tabular-nums ${
                          draftValue > 0
                            ? ratingBandTextClass(draftValue)
                            : "text-slate-500"
                        }`}
                      >
                        {draftValue > 0 ? draftValue : "—"}
                      </span>
                    </button>
                  );
                }

                return (
                  <div
                    key={player.id}
                    className={`${
                      fullPage ? "space-y-1 rounded-xl px-2 py-1.5" : "space-y-1.5 rounded-2xl px-2.5 py-2.5 sm:px-3"
                    } border transition ${cardTone}`}
                  >
                    <div className={`flex items-center ${fullPage ? "gap-1.5" : "gap-2 sm:gap-2.5"}`}>
                      <div
                        className={`relative shrink-0 overflow-hidden rounded-full border border-white/15 bg-slate-800 ${
                          fullPage ? "h-9 w-9" : "h-11 w-11 sm:h-12 sm:w-12"
                        }`}
                      >
                        {visiblePhotoUrl(player.photo_url, canViewPhotos) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={visiblePhotoUrl(player.photo_url, canViewPhotos)!}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-full w-full items-center justify-center text-[10px] font-bold text-white ${style.badge}`}
                          >
                            {player.name
                              .split(/\s+/)
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )}
                        {showMvp ? (
                          <span className="absolute -right-0.5 -top-0.5 text-[10px]">
                            🏆
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          {!fullPage ? (
                            <span
                              className={`flex h-5 w-7 shrink-0 items-center justify-center rounded-md text-[8px] font-bold text-white sm:text-[9px] ${style.badge}`}
                            >
                              {group}
                            </span>
                          ) : null}
                          <p
                            className={`truncate font-semibold text-white ${
                              fullPage ? "text-[12px]" : "text-[12px] sm:text-[13px]"
                            }`}
                          >
                            {player.name}
                            {isSelf ? " (вы)" : ""}
                          </p>
                          {fullPage && showOvrRatings && ovrRating != null ? (
                            <span className="shrink-0 rounded-md bg-amber-500/15 px-1 py-0.5 text-[10px] font-bold tabular-nums text-amber-200">
                              ★{ovrRating}
                            </span>
                          ) : null}
                        </div>
                        {!fullPage ? (
                          <p className="mt-0.5 truncate text-[10px] text-slate-400">
                            {player.position || "Без позиции"}
                          </p>
                        ) : (
                          <p className="truncate text-[9px] text-slate-500">
                            {group}
                            {player.position ? ` · ${player.position}` : ""}
                          </p>
                        )}
                        {!fullPage && showSummary && summary && hasVotes ? (
                          <div
                            className={`mt-0.5 flex items-center gap-1 text-[10px] ${ratingBandTextClass(Number(summary.match_rating))}`}
                          >
                            <span>
                              {formatVoteScoreWithMax(
                                Number(summary.match_rating)
                              )}
                              <span className="text-slate-500">
                                {" "}
                                ·{" "}
                                {formatVotePercent(
                                  Number(summary.match_rating)
                                )}
                                %
                              </span>
                            </span>
                            <RatingChangeBadge
                              delta={getRatingDelta(
                                summary.rating_before,
                                summary.rating_after
                              )}
                              size="sm"
                            />
                          </div>
                        ) : null}
                        {!fullPage && showNoVotes ? (
                          <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                            Нет оценок за этот матч
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {canRate && !isSelf && !fullPage ? (
                      <StarRatingPicker
                        value={draftValue}
                        ballotScores={draftRatings}
                        playerId={player.id}
                        size={fullPage ? "sm" : "md"}
                        onChange={(score) =>
                          setDraftRatings((prev) => ({
                            ...prev,
                            [player.id]: score,
                          }))
                        }
                        disabled={!canRate || saving}
                      />
                    ) : !showSummary &&
                      !showNoVotes &&
                      draftValue > 0 &&
                      !isSelf ? (
                      <p
                        className={`text-center text-[11px] font-bold ${ratingBandTextClass(draftValue)}`}
                      >
                        Ваша оценка: {formatVoteScoreWithMax(draftValue)}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          ) : null}

          {fullPage &&
          !combinedBoard &&
          canRate &&
          selectedVotePlayer &&
          selectedVotePlayer.id !== myPlayerId ? (
            <div className="shrink-0 border-t border-white/10 px-2.5 py-2 sm:px-3">
              <SwipeRatingPicker
                playerName={selectedVotePlayer.name}
                playerId={selectedVotePlayer.id}
                value={draftRatings[selectedVotePlayer.id] ?? 0}
                ballotScores={draftRatings}
                disabled={saving}
                onChange={(score) =>
                  setDraftRatings((prev) => ({
                    ...prev,
                    [selectedVotePlayer.id]: score,
                  }))
                }
              />
            </div>
          ) : null}

          <div
            className={`shrink-0 border-t border-white/10 bg-[#0b1224] ${
              fullPage ? "space-y-1 p-2" : "space-y-1.5 p-2.5 sm:space-y-2 sm:p-3"
            }`}
          >
            {!votingClosed && !voteComplete && (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    saving || declining || skippingVote || !canSubmitPartial
                  }
                  className={`w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 font-bold text-white transition hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 ${
                    fullPage
                      ? "px-3 py-2 text-[12px]"
                      : "px-3 py-2.5 text-[13px] sm:py-3 sm:text-[14px]"
                  }`}
                >
                  {saving ? "..." : "Отправить оценки"}
                </button>
                <div
                  className={`grid gap-1 ${fullPage ? "grid-cols-2" : "grid-cols-3"}`}
                >
                  <button
                    type="button"
                    onClick={handleSkipVoting}
                    disabled={saving || declining || skippingVote}
                    className="rounded-xl border border-white/10 px-1 py-1.5 text-[10px] font-semibold leading-tight text-slate-400 hover:bg-white/5 disabled:opacity-50 sm:px-2 sm:text-[11px]"
                  >
                    Не голосую
                  </button>
                  <button
                    type="button"
                    onClick={handleDeclineParticipation}
                    disabled={saving || declining || skippingVote}
                    className="rounded-xl border border-white/10 px-1 py-1.5 text-[10px] font-semibold leading-tight text-slate-400 hover:bg-white/5 disabled:opacity-50 sm:px-2 sm:text-[11px]"
                  >
                    Не играл
                  </button>
                  {!fullPage ? (
                    <button
                      type="button"
                      onClick={closePanel}
                      className="rounded-xl border border-white/15 bg-white/10 px-1 py-2 text-[10px] font-bold leading-tight text-white hover:bg-white/15 sm:px-2 sm:text-[11px]"
                    >
                      Закрыть
                    </button>
                  ) : null}
                </div>
              </>
            )}

            {(voteComplete || votingClosed) && !fullPage && (
              <button
                type="button"
                onClick={closePanel}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-[14px] font-bold text-white hover:bg-white/15"
              >
                Закрыть
              </button>
            )}
          </div>
        </>
      )}
    </>
  );

  // Большой золотой MVP показывается на главной над профилем.
  // Здесь только кнопка голосования / результата — без второго MVP-блока.
  const showMvpHero = false;

  const buttonClass = showMvpHero
    ? "mvp-result-gold-card border-[#D4AF37]/60 bg-[linear-gradient(135deg,rgba(5,5,6,0.98),rgba(23,23,25,0.96)_48%,rgba(58,44,15,0.78))] shadow-[0_0_22px_rgba(212,175,55,0.18),inset_0_0_18px_rgba(212,175,55,0.08)] hover:border-[#D4AF37]/75"
    : isActive
      ? "vote-glow border-amber-400/55 bg-gradient-to-r from-amber-500/25 via-orange-500/15 to-violet-500/15 shadow-[0_0_18px_rgba(245,158,11,0.25)]"
      : voteComplete
        ? "border-emerald-400/35 bg-emerald-500/12 hover:bg-emerald-500/18"
        : "border-amber-400/25 bg-gradient-to-r from-amber-500/15 to-violet-500/12 hover:border-amber-400/40 hover:from-amber-500/20";

  const buttonAriaLabel = voteComplete
    ? AWAY_MATCH_RATING.navDone
    : AWAY_MATCH_RATING.navCta;

  const buttonTitle = voteComplete
    ? compact
      ? "Готово"
      : AWAY_MATCH_RATING.navDone
    : AWAY_MATCH_RATING.navShort;

  const buttonHint = voteComplete
    ? compact
      ? "Результат"
      : "Смотреть результат"
    : isActive
      ? AWAY_MATCH_RATING.navCta
      : remainingLabel
        ? `Осталось ${remainingLabel}`
        : "Оцените игроков";

  const showCountdown =
    !votingClosed && remainingMs != null && remainingMs > 0;
  const finalMvpSummary = votingClosed ? mvpSummary : null;
  const finalMvpPlayer = finalMvpSummary
    ? players.find((player) => player.id === finalMvpSummary.player_id)
    : null;
  const finalMvpDelta = finalMvpSummary
    ? getRatingDelta(finalMvpSummary.rating_before, finalMvpSummary.rating_after)
    : null;
  const finalMvpDeltaLabel =
    finalMvpDelta != null && finalMvpDelta !== 0
      ? `${finalMvpDelta > 0 ? "+" : ""}${finalMvpDelta} OVR`
      : "0 OVR";
  const votersMiniLabel =
    voterProgress.total > 0
      ? `${voterProgress.votedCount}/${voterProgress.total}`
      : null;
  const finalMvpVoteLabel = finalMvpSummary
    ? voterProgress.total > 0
      ? `${finalMvpSummary.vote_count}/${voterProgress.total}`
      : String(finalMvpSummary.vote_count)
    : null;
  const finalMvpStats = finalMvpSummary
    ? matchStats[Number(finalMvpSummary.player_id)]
    : null;
  const finalMvpGoals = Number(finalMvpStats?.goals ?? 0);
  const finalMvpAssists = Number(finalMvpStats?.assists ?? 0);
  const topRatedSummaryForAchievement = topRatedSummary;
  const finalMvpAchievementLabel =
    finalMvpSummary &&
    topRatedSummaryForAchievement?.player_id === finalMvpSummary.player_id
      ? "\u2B50 \u041b\u0443\u0447\u0448\u0438\u0439 \u0440\u0435\u0439\u0442\u0438\u043d\u0433 \u043a\u043e\u043c\u0430\u043d\u0434\u044b"
      : finalMvpDelta != null && finalMvpDelta > 0
        ? "\uD83D\uDCC8 \u0420\u0435\u0439\u0442\u0438\u043d\u0433 \u0432\u044b\u0440\u043e\u0441"
        : null;

  const votingWindowMs = AWAY_MATCH_RATING.votingHours * 60 * 60 * 1000;
  const timeProgressPct =
    remainingMs != null && remainingMs >= 0
      ? Math.min(
          100,
          Math.max(0, ((votingWindowMs - remainingMs) / votingWindowMs) * 100)
        )
      : 0;
  const voterPct =
    voterProgress.total > 0
      ? Math.round((voterProgress.votedCount / voterProgress.total) * 100)
      : 0;
  const opponentShort =
    match.opponent.length > 16
      ? `${match.opponent.slice(0, 15)}\u2026`
      : match.opponent;
  const leaderPlayer = leaderSummary
    ? players.find((player) => player.id === leaderSummary.player_id)
    : null;
  const leaderFirstName = leaderPlayer?.name.split(/\s+/)[0] ?? null;
  const countdownUrgency =
    showCountdown && remainingMs != null ? getVotingUrgency(remainingMs) : null;
  const votersRemaining = Math.max(
    0,
    voterProgress.total - voterProgress.votedCount
  );
  const compactHeadline = isActive
    ? "Голосуем!"
    : userVotingDone
      ? "Ты проголосовал"
      : "Оценки матча";
  const compactStatsParts: string[] = [`vs ${opponentShort}`];
  if (voterProgress.total > 0) {
    compactStatsParts.push(
      `проголосовали: ${voterProgress.votedCount} из ${voterProgress.total}`
    );
    if (votersRemaining > 0) {
      compactStatsParts.push(`осталось: ${votersRemaining}`);
    } else {
      compactStatsParts.push("все проголосовали");
    }
  }
  const compactStatsLine = compactStatsParts.join(" · ");
  const compactLeaderLine =
    leaderFirstName && leaderSummary
      ? `Лидер: ${leaderFirstName} ${formatVoteScoreWithMax(Number(leaderSummary.match_rating))}`
      : null;
  const compactShellClass = isActive
    ? "match-vote-compact-strip--active"
    : "hover:bg-white/[0.03]";

  const voteHref = buildMatchVotePath(match.id);

  if (fullPage) {
    if (authLoading || !canVote || !match || votingClosed) {
      return null;
    }
    if (combinedBoard && (iSkippedVote || voteComplete)) {
      return null;
    }
    if (!combinedBoard && voteComplete) {
      return null;
    }

    return (
      <div className="min-w-0">
        <MatchRatingResultsModal
          open={resultsOpen}
          onClose={closeResultsModal}
          opponent={match.opponent}
          myScore={
            mySummary && mySummary.vote_count > 0
              ? Number(mySummary.match_rating)
              : null
          }
          voteCount={mySummary?.vote_count ?? 0}
          isMvp={Boolean(mySummary?.is_mvp)}
          unlocked={resultsUnlocked}
          totalXpGained={resultsXp}
        />
        {combinedBoard ? (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224]">
            {ratingPanelContent}
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-amber-400/30 bg-[#0b1224] shadow-[0_0_24px_rgba(251,191,36,0.08)]">
            <div className="flex flex-col">{ratingPanelContent}</div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`relative min-w-0 ${compact ? "w-full" : "md:min-w-[19rem]"}`}
    >
      <MatchRatingResultsModal
        open={resultsOpen}
        onClose={closeResultsModal}
        opponent={match.opponent}
        myScore={
          mySummary && mySummary.vote_count > 0
            ? Number(mySummary.match_rating)
            : null
        }
        voteCount={mySummary?.vote_count ?? 0}
        isMvp={Boolean(mySummary?.is_mvp)}
        unlocked={resultsUnlocked}
        totalXpGained={resultsXp}
      />
      <Link
        href={voteHref}
        className={`relative flex w-full touch-target items-stretch overflow-hidden text-left transition ${
          compact && !showMvpHero
            ? "match-vote-compact-strip match-vote-compact-strip--card gap-0 border-0 bg-transparent px-2.5 py-2 shadow-none md:gap-2 md:rounded-xl md:border md:px-4 md:py-2.5 md:shadow-none"
            : showMvpHero
              ? "gap-2 rounded-xl border px-2.5 py-2 sm:gap-3 sm:px-4 sm:py-3 md:px-4"
              : "gap-2.5 rounded-xl border px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5 md:px-4"
        } ${compact && !showMvpHero ? compactShellClass : buttonClass}`}
        aria-label={buttonAriaLabel}
        title={buttonAriaLabel}
      >
        {compact && !showMvpHero ? (
          <>
            <span className="relative z-[1] flex w-full min-w-0 flex-col justify-center gap-1">
              <span className="flex min-w-0 items-center justify-between gap-1.5">
                <span className="flex min-w-0 flex-1 items-center gap-1">
                  <span className="shrink-0 text-[13px] leading-none text-amber-300/90">
                    {"\u2605"}
                  </span>
                  <span
                    className={`truncate text-[13px] font-extrabold leading-tight ${
                      isActive || !voteComplete
                        ? "match-vote-compact-gold"
                        : voteComplete
                          ? "text-emerald-200"
                          : "text-white/90"
                    }`}
                  >
                    {compactHeadline}
                  </span>
                </span>
                {showCountdown && remainingMs != null ? (
                  <span
                    className={`shrink-0 rounded-md border px-1.5 py-0.5 text-center ${
                      countdownUrgency?.level === "critical" ||
                      countdownUrgency?.level === "urgent"
                        ? "border-red-400/40 bg-red-500/15"
                        : countdownUrgency?.level === "soon"
                          ? "border-orange-400/35 bg-orange-500/12"
                          : "border-amber-400/35 bg-amber-500/12"
                    }`}
                  >
                    <span
                      className={`block font-mono text-[12px] font-black tabular-nums leading-none ${
                        countdownUrgency?.level === "critical" ||
                        countdownUrgency?.level === "urgent"
                          ? "text-red-200"
                          : countdownUrgency?.level === "soon"
                            ? "text-orange-200"
                            : "text-amber-50"
                      }`}
                    >
                      {formatVotingCountdown(remainingMs)}
                    </span>
                  </span>
                ) : null}
              </span>

              <span className="truncate text-[10px] font-medium leading-snug text-slate-300/95">
                {compactStatsLine}
              </span>

              {compactLeaderLine ? (
                <span className="truncate text-[10px] font-medium leading-snug text-amber-200/80">
                  {compactLeaderLine}
                </span>
              ) : (
                <span className="truncate text-[10px] font-medium leading-snug text-slate-500/90">
                  {isActive ? "Нужно проголосовать" : "Смотреть оценки"}
                </span>
              )}
            </span>
            {isActive && pendingCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 z-[2] flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                {pendingCount}
              </span>
            ) : null}
          </>
        ) : showMvpHero && finalMvpSummary && finalMvpPlayer ? (
          <span className="relative z-[1] flex w-full min-w-0 flex-col gap-1.5 overflow-hidden">
            <span className="flex min-w-0 items-center gap-2">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/80 bg-[radial-gradient(circle_at_35%_20%,rgba(212,175,55,0.4),rgba(15,13,9,0.96)_50%,rgba(2,2,3,0.99))] text-2xl shadow-[0_0_16px_rgba(212,175,55,0.28),inset_0_0_12px_rgba(212,175,55,0.14)] sm:h-14 sm:w-14 sm:rounded-2xl sm:text-3xl">
                {"\uD83C\uDFC6"}
              </span>
              <span className="min-w-0 flex-1 overflow-hidden text-left leading-tight">
                <span className="block truncate text-[9px] font-black uppercase tracking-[0.14em] text-[#D4AF37] sm:text-[11px]">
                  {"\uD83C\uDFC6"} MVP {"\u041c\u0410\u0422\u0427\u0410"}
                </span>
                <span className="mt-0.5 block truncate text-[16px] font-black tracking-tight text-white sm:text-[20px]">
                  {finalMvpPlayer.name}
                </span>
                {finalMvpAchievementLabel ? (
                  <span className="mt-0.5 block truncate text-[9px] font-semibold text-[#D4AF37]/90">
                    {finalMvpAchievementLabel}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[1.35rem] font-black leading-none tabular-nums text-[#F7D774] sm:text-[1.6rem]">
                  {formatVoteScoreWithMax(Number(finalMvpSummary.match_rating))}
                </span>
                <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-[#D4AF37]/75">
                  / 10
                </span>
              </span>
            </span>

            <span className="grid min-w-0 grid-cols-4 gap-1">
              <span className="min-w-0 truncate rounded-lg border border-[#D4AF37]/25 bg-black/35 px-1 py-1 text-center">
                <span className="block truncate text-[7px] font-bold uppercase tracking-wide text-[#D4AF37]/70">
                  OVR
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-extrabold tabular-nums text-emerald-300">
                  {finalMvpDeltaLabel}
                </span>
              </span>
              <span className="min-w-0 truncate rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-1 py-1 text-center">
                <span className="block truncate text-[7px] font-bold uppercase tracking-wide text-[#D4AF37]/70">
                  {"\u0413\u043e\u043b\u044b"}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-extrabold tabular-nums text-[#F7D774]">
                  {finalMvpGoals}
                </span>
              </span>
              <span className="min-w-0 truncate rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-1 py-1 text-center">
                <span className="block truncate text-[7px] font-bold uppercase tracking-wide text-[#D4AF37]/70">
                  {"\u041f\u0430\u0441\u044b"}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-extrabold tabular-nums text-[#F7D774]">
                  {finalMvpAssists}
                </span>
              </span>
              <span className="min-w-0 truncate rounded-lg border border-white/10 bg-black/25 px-1 py-1 text-center">
                <span className="block truncate text-[7px] font-bold uppercase tracking-wide text-[#D4AF37]/70">
                  {"\u0413\u043e\u043b\u043e\u0441\u0430"}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-extrabold tabular-nums text-[#F7D774]">
                  {finalMvpVoteLabel ?? "—"}
                </span>
              </span>
            </span>
          </span>
        ) : (
          <>
            <span className={`relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black ${isActive ? "bg-amber-400/25 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.45)]" : voteComplete ? "bg-emerald-400/20 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
              {"\u2605"}
            </span>
            <span className="relative z-[1] min-w-0 flex-1 text-left leading-tight">
              <span className="block truncate text-[12px] font-extrabold text-white sm:text-[13px]">{buttonTitle}</span>
              <span className={`mt-0.5 flex min-w-0 flex-nowrap items-baseline gap-x-1.5 overflow-hidden text-[10px] font-semibold sm:text-[11px] ${voteComplete ? "text-emerald-200/90" : isActive ? "text-amber-200" : "text-slate-300"}`}>
                <span className="shrink-0 truncate">{buttonHint}</span>
                {votersMiniLabel && <span className="shrink-0 tabular-nums text-emerald-200/90">&middot; {votersMiniLabel}</span>}
                {showCountdown && <span className="hidden shrink-0 font-mono text-[10px] font-bold tabular-nums tracking-wide text-amber-100 min-[390px]:inline sm:text-[11px]">{"\u23F1"} {formatVotingCountdown(remainingMs)}</span>}
              </span>
            </span>
            {isActive && pendingCount > 0 && <span className="flex h-5 min-w-5 shrink-0 animate-pulse items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 text-[10px] font-bold">{pendingCount}</span>}
            {voteComplete && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
          </>
        )}
      </Link>
    </div>
  );
}


