"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_LINEUP_FORMATION_ID,
  parseLineupFormationId,
  type LineupFormationId,
} from "@/lib/lineupFormations";

export function useLineupFormation(storageKey: string) {
  const [formationId, setFormationIdState] = useState<LineupFormationId>(
    DEFAULT_LINEUP_FORMATION_ID
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setFormationIdState(parseLineupFormationId(stored));
    } catch {
      setFormationIdState(DEFAULT_LINEUP_FORMATION_ID);
    } finally {
      setReady(true);
    }
  }, [storageKey]);

  const setFormationId = useCallback(
    (next: LineupFormationId) => {
      setFormationIdState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* ignore quota / private mode */
      }
    },
    [storageKey]
  );

  return { formationId, setFormationId, ready };
}
