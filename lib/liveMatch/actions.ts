import type { SupabaseClient } from "@supabase/supabase-js";
import type { LineupPosition } from "@/lib/lineup";
import {
  incrementTeamScore,
  recordAssistStat,
  recordGoalStat,
} from "@/lib/liveMatch/stats";
import type {
  LiveEventMeta,
  LiveEventType,
  LiveMatchEvent,
} from "@/lib/liveMatch/types";

type PlayerNameMap = Record<number, string>;

function attachNames(
  rows: LiveMatchEvent[],
  names: PlayerNameMap
): LiveMatchEvent[] {
  return rows.map((row) => ({
    ...row,
    player_name: row.player_id != null ? names[row.player_id] ?? null : null,
    related_player_name:
      row.related_player_id != null
        ? names[row.related_player_id] ?? null
        : null,
    meta: (row.meta ?? {}) as LiveEventMeta,
  }));
}

export async function loadLiveEvents(
  matchId: number,
  names: PlayerNameMap,
  db: SupabaseClient
): Promise<{ events: LiveMatchEvent[]; schemaMissing: boolean }> {
  const { data, error } = await db
    .from("match_live_events")
    .select(
      "id, match_id, event_type, player_id, related_player_id, related_event_id, meta, created_at"
    )
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error?.message.includes("match_live_events")) {
    return { events: [], schemaMissing: true };
  }

  if (error) {
    return { events: [], schemaMissing: false };
  }

  return {
    events: attachNames((data ?? []) as LiveMatchEvent[], names),
    schemaMissing: false,
  };
}

async function insertEvent(
  input: {
    match_id: number;
    event_type: LiveEventType;
    player_id: number | null;
    related_player_id?: number | null;
    related_event_id?: number | null;
    meta?: LiveEventMeta;
  },
  names: PlayerNameMap,
  db: SupabaseClient
): Promise<LiveMatchEvent> {
  const { data, error } = await db
    .from("match_live_events")
    .insert({
      match_id: input.match_id,
      event_type: input.event_type,
      player_id: input.player_id,
      related_player_id: input.related_player_id ?? null,
      related_event_id: input.related_event_id ?? null,
      meta: input.meta ?? {},
    })
    .select(
      "id, match_id, event_type, player_id, related_player_id, related_event_id, meta, created_at"
    )
    .single();

  if (error) throw new Error(error.message);

  return attachNames([data as LiveMatchEvent], names)[0];
}

export async function addLiveGoal(params: {
  matchId: number;
  playerId: number;
  currentNdfkGoals: number;
  names: PlayerNameMap;
  db: SupabaseClient;
}): Promise<{ event: LiveMatchEvent; ndfkGoals: number }> {
  const ndfkGoals = await incrementTeamScore(
    params.matchId,
    params.currentNdfkGoals,
    params.db
  );
  await recordGoalStat(params.matchId, params.playerId, params.db);

  const event = await insertEvent(
    {
      match_id: params.matchId,
      event_type: "goal",
      player_id: params.playerId,
      meta: { assistStatus: "pending" },
    },
    params.names,
    params.db
  );

  return { event, ndfkGoals };
}

export async function addLiveAssist(params: {
  matchId: number;
  assisterId: number;
  scorerId: number;
  goalEventId: number;
  names: PlayerNameMap;
  db: SupabaseClient;
}): Promise<LiveMatchEvent> {
  await recordAssistStat(params.matchId, params.assisterId, params.db);

  await params.db
    .from("match_live_events")
    .update({ meta: { assistStatus: "linked" } })
    .eq("id", params.goalEventId);

  return insertEvent(
    {
      match_id: params.matchId,
      event_type: "assist",
      player_id: params.assisterId,
      related_player_id: params.scorerId,
      related_event_id: params.goalEventId,
      meta: {},
    },
    params.names,
    params.db
  );
}

export async function markGoalWithoutAssist(
  goalEventId: number,
  db: SupabaseClient
): Promise<void> {
  await db
    .from("match_live_events")
    .update({ meta: { assistStatus: "none" } })
    .eq("id", goalEventId);
}

export async function addLiveSubstitution(params: {
  matchId: number;
  playerOutId: number;
  playerInId: number;
  slotOut: LineupPosition;
  names: PlayerNameMap;
  db: SupabaseClient;
}): Promise<LiveMatchEvent> {
  const { error: outError } = await params.db
    .from("players")
    .update({ lineup_position: null })
    .eq("id", params.playerOutId);

  if (outError) throw new Error(outError.message);

  const { error: inError } = await params.db
    .from("players")
    .update({ lineup_position: params.slotOut })
    .eq("id", params.playerInId);

  if (inError) {
    // откат слота ушедшему
    await params.db
      .from("players")
      .update({ lineup_position: params.slotOut })
      .eq("id", params.playerOutId);
    throw new Error(inError.message);
  }

  return insertEvent(
    {
      match_id: params.matchId,
      event_type: "substitution",
      player_id: params.playerOutId,
      related_player_id: params.playerInId,
      meta: { slotOut: params.slotOut },
    },
    params.names,
    params.db
  );
}

/** Лента: голы + ассисты + «Без ассиста» + замены */
export type FeedItem =
  | {
      kind: "goal";
      key: string;
      playerName: string;
      withoutAssist: boolean;
    }
  | {
      kind: "assist";
      key: string;
      playerName: string;
    }
  | {
      kind: "sub";
      key: string;
      outName: string;
      inName: string;
    };

export function buildLiveFeed(events: LiveMatchEvent[]): FeedItem[] {
  const items: FeedItem[] = [];
  const assistByGoal = new Map<number, LiveMatchEvent>();

  for (const event of events) {
    if (event.event_type === "assist" && event.related_event_id != null) {
      assistByGoal.set(event.related_event_id, event);
    }
  }

  for (const event of events) {
    if (event.event_type === "goal") {
      items.push({
        kind: "goal",
        key: `goal-${event.id}`,
        playerName: event.player_name ?? "Игрок",
        withoutAssist: event.meta?.assistStatus === "none",
      });
      const assist = assistByGoal.get(event.id);
      if (assist) {
        items.push({
          kind: "assist",
          key: `assist-${assist.id}`,
          playerName: assist.player_name ?? "Игрок",
        });
      }
    } else if (event.event_type === "substitution") {
      items.push({
        kind: "sub",
        key: `sub-${event.id}`,
        outName: event.player_name ?? "Игрок",
        inName: event.related_player_name ?? "Игрок",
      });
    }
  }

  return items;
}
