"use client";

import PlayerAvatar from "@/components/PlayerAvatar";
import {
  adminInputClass,
  adminLabelClass,
  adminPanelClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSectionTitleClass,
} from "@/lib/adminStyles";
import {
  buildTechniqueDraft,
  clampTechniqueScore,
  getTechniqueAttributes,
  previewOverallFromTechnique,
} from "@/lib/playerTechnique";
import {
  attributeVote10ToFifaStat,
  formatEpisodeOverall,
  formatFifaStat,
} from "@/lib/ratingEpisode";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import type { AdminTechniquePageData } from "@/lib/server/adminTechnique";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function AdminTechniqueBoard({
  players,
  attributesMap,
  loadError,
}: AdminTechniquePageData) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(
    players[0]?.id ?? null
  );
  const [draftByPlayer, setDraftByPlayer] = useState<
    Record<number, Record<string, number>>
  >({});
  const [saving, setSaving] = useState(false);

  const selected = players.find((player) => player.id === selectedId) ?? null;

  const draft = useMemo(() => {
    if (!selected) return {};
    return (
      draftByPlayer[selected.id] ??
      buildTechniqueDraft(selected.position, attributesMap[selected.id] ?? null)
    );
  }, [attributesMap, draftByPlayer, selected]);

  const attributes = selected
    ? getTechniqueAttributes(selected.position)
    : [];
  const previewOvr = selected
    ? previewOverallFromTechnique(draft, selected.position)
    : null;
  const group = selected
    ? getPositionGroup(null, selected.position)
    : null;
  const style = group ? getPositionStyle(group) : null;

  function ensureDraft(playerId: number, position: string) {
    setDraftByPlayer((prev) => {
      if (prev[playerId]) return prev;
      return {
        ...prev,
        [playerId]: buildTechniqueDraft(
          position,
          attributesMap[playerId] ?? null
        ),
      };
    });
  }

  function selectPlayer(playerId: number) {
    const player = players.find((row) => row.id === playerId);
    if (!player) return;
    ensureDraft(player.id, player.position);
    setSelectedId(player.id);
  }

  function setScore(key: string, raw: number) {
    if (!selected) return;
    const next = clampTechniqueScore(raw);
    setDraftByPlayer((prev) => {
      const base =
        prev[selected.id] ??
        buildTechniqueDraft(selected.position, attributesMap[selected.id]);
      return {
        ...prev,
        [selected.id]: { ...base, [key]: next },
      };
    });
  }

  async function handleSave() {
    if (!selected || previewOvr == null) return;

    const attrs = buildTechniqueDraft(selected.position, draft);
    setSaving(true);

    try {
      const { error: attrsError } = await supabase
        .from("player_attributes")
        .upsert(
          {
            player_id: selected.id,
            attrs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "player_id" }
        );

      if (attrsError) {
        alert(attrsError.message);
        return;
      }

      const { error: ratingError } = await supabase
        .from("players")
        .update({ rating: previewOvr })
        .eq("id", selected.id);

      if (ratingError) {
        alert(ratingError.message);
        return;
      }

      alert(
        `Сохранено: ${selected.name} · OVR ${formatEpisodeOverall(previewOvr)}`
      );
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {loadError && (
        <div className="mb-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          Ошибка загрузки: {loadError}
        </div>
      )}

      <div className="mb-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-[12px] text-amber-50/90 sm:text-sm">
        Задайте технику игрока (1–10). Сайт сам посчитает{" "}
        <span className="font-bold text-amber-100">OVR</span> по позиции и
        обновит рейтинг везде: карточки, состав, главная.
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className={adminPanelClass}>
          <h2 className={adminSectionTitleClass}>Игроки</h2>
          <ul className="max-h-[70vh] space-y-1 overflow-y-auto p-2">
            {players.map((player) => {
              const active = player.id === selectedId;
              const posGroup = getPositionGroup(null, player.position);
              const posStyle = getPositionStyle(posGroup);

              return (
                <li key={player.id}>
                  <button
                    type="button"
                    onClick={() => selectPlayer(player.id)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition ${
                      active
                        ? "border-amber-400/40 bg-amber-500/15"
                        : "border-white/8 bg-white/[0.03] hover:border-white/15"
                    }`}
                  >
                    <PlayerAvatar
                      name={player.name}
                      photoUrl={player.photo_url}
                      size="xs"
                      badge={posGroup}
                      badgeClassName={posStyle.badge}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-white">
                        {player.name}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500">
                        {player.position}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-black tabular-nums text-lime-300">
                      {formatEpisodeOverall(player.rating)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={adminPanelClass}>
          {!selected ? (
            <p className="p-4 text-sm text-slate-400">Выберите игрока слева</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <PlayerAvatar
                    name={selected.name}
                    photoUrl={selected.photo_url}
                    size="md"
                    badge={group ?? undefined}
                    badgeClassName={style?.badge}
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-extrabold text-white">
                      {selected.name}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {selected.position} · техника → OVR
                    </p>
                  </div>
                </div>
                <div className="shrink-0 rounded-xl border border-lime-400/30 bg-lime-500/10 px-3 py-2 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-lime-300/80">
                    OVR
                  </p>
                  <p className="rating-lime text-3xl font-black leading-none">
                    {previewOvr != null
                      ? formatEpisodeOverall(previewOvr)
                      : "—"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    было {formatEpisodeOverall(selected.rating)}
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-3">
                {attributes.map((attribute) => {
                  const score = draft[attribute.key] ?? 5;
                  const fifa = attributeVote10ToFifaStat(score);

                  return (
                    <div
                      key={attribute.key}
                      className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className={adminLabelClass}>
                          {attribute.emoji} {attribute.label}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black tabular-nums text-white">
                            {score}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            /10 → {formatFifaStat(score)}
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={score}
                        onChange={(event) =>
                          setScore(attribute.key, Number(event.target.value))
                        }
                        className="w-full accent-amber-400"
                      />
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          className={adminSecondaryButtonClass}
                          onClick={() => setScore(attribute.key, score - 1)}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={score}
                          onChange={(event) =>
                            setScore(
                              attribute.key,
                              Number(event.target.value)
                            )
                          }
                          className={`${adminInputClass} max-w-[5rem] text-center`}
                        />
                        <button
                          type="button"
                          className={adminSecondaryButtonClass}
                          onClick={() => setScore(attribute.key, score + 1)}
                        >
                          +
                        </button>
                        <span className="ml-auto text-[11px] font-semibold text-slate-400">
                          FIFA {fifa}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className={`${adminPrimaryButtonClass} w-full disabled:opacity-50`}
                >
                  {saving
                    ? "Сохранение..."
                    : `Сохранить технику · OVR ${
                        previewOvr != null
                          ? formatEpisodeOverall(previewOvr)
                          : "—"
                      }`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
