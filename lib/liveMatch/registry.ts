import type { LiveEventType } from "@/lib/liveMatch/types";

export type LiveEventDefinition = {
  type: LiveEventType;
  label: string;
  icon: string;
  /** Пока false — тип не показываем в UI, но схема уже готова */
  enabled: boolean;
};

/** Реестр событий — расширение без смены ядра */
export const LIVE_EVENT_REGISTRY: LiveEventDefinition[] = [
  { type: "goal", label: "Гол", icon: "⚽", enabled: true },
  { type: "assist", label: "Ассист", icon: "🎯", enabled: true },
  { type: "substitution", label: "Замена", icon: "🔄", enabled: true },
  { type: "yellow_card", label: "Жёлтая", icon: "🟨", enabled: false },
  { type: "red_card", label: "Красная", icon: "🟥", enabled: false },
  { type: "penalty", label: "Пенальти", icon: "🎯", enabled: false },
  { type: "own_goal", label: "Автогол", icon: "⚽", enabled: false },
];

export function getEnabledLiveActions(): LiveEventDefinition[] {
  return LIVE_EVENT_REGISTRY.filter(
    (item) => item.enabled && item.type !== "assist"
  );
}
