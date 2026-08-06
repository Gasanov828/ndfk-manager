"use client";

import { useEffect, useMemo, useState } from "react";
import AppBottomSheet from "@/components/ui/AppBottomSheet";
import ScorePicker from "@/components/ScorePicker";
import {
  areCreateAttrsComplete,
  computeCreateOverall,
  CREATE_OVR_MAX,
  CREATE_OVR_MIN,
  CREATE_POSITION_OPTIONS,
  defaultCreateAttrs,
  formatCreateOverall,
  type AddPlayerAttributesPayload,
} from "@/lib/playerCreateRating";
import { getAttributesForPosition } from "@/lib/ratingEpisode";
import type { PositionGroup } from "@/lib/positionStyles";
import { getPositionStyle } from "@/lib/positionStyles";

export type { AddPlayerAttributesPayload };

type AddPlayerAttributesModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: AddPlayerAttributesPayload) => Promise<void> | void;
  title?: string;
  submitLabel?: string;
};

export default function AddPlayerAttributesModal({
  open,
  onClose,
  onSubmit,
  title = "Новый игрок",
  submitLabel = "Добавить",
}: AddPlayerAttributesModalProps) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState<PositionGroup>("НАП");
  const [attrs, setAttrs] = useState<Record<string, number>>(() =>
    defaultCreateAttrs("НАП")
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPosition("НАП");
    setAttrs(defaultCreateAttrs("НАП"));
    setSaving(false);
    setError(null);
  }, [open]);

  const attributeDefs = useMemo(
    () => getAttributesForPosition(position),
    [position]
  );
  const overall = useMemo(
    () => computeCreateOverall(attrs, position),
    [attrs, position]
  );
  const positionStyle = getPositionStyle(position);
  const attrsComplete = areCreateAttrsComplete(attrs, position);
  const canSave = name.trim().length > 0 && attrsComplete && !saving;

  function handlePositionChange(next: PositionGroup) {
    setPosition(next);
    setAttrs(defaultCreateAttrs(next));
  }

  function setAttr(key: string, value: number) {
    setAttrs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        position,
        rating: overall,
        attrs: { ...attrs },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      showCloseButton
      showHandle
      centerOnDesktop
      title={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/80">
            Характеристики
          </p>
          <h2 className="mt-0.5 text-lg font-extrabold text-white">{title}</h2>
        </div>
      }
      panelClassName="border-cyan-300/20 bg-gradient-to-br from-[#0d1728] via-[#0a1220] to-[#070d18]"
      footer={
        <div className="space-y-2">
          {error ? (
            <p className="text-center text-[11px] font-semibold text-rose-300">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSubmit}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
          >
            {saving
              ? "Сохранение…"
              : `${submitLabel} · ★ ${formatCreateOverall(overall)}`}
          </button>
        </div>
      }
    >
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300/25 bg-amber-500/10 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/70">
              Итоговый рейтинг
            </p>
            <p className="text-[12px] text-amber-100/80">
              Считается из удара, техники и остальных оценок
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-wide text-amber-200/60">
              OVR
            </p>
            <p className="text-3xl font-black tabular-nums leading-none text-amber-100">
              {formatCreateOverall(overall)}
            </p>
            <p className="mt-0.5 text-[9px] text-amber-200/50">
              {CREATE_OVR_MIN}–{CREATE_OVR_MAX}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-3">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className={`text-[13px] font-extrabold ${positionStyle.text}`}>
              Техника и удары · 1–10
            </p>
            <p className="text-[10px] font-semibold text-slate-500">
              Главное
            </p>
          </div>
          <div className="space-y-2">
            {attributeDefs.map((attribute) => (
              <div
                key={attribute.key}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2.5 py-2"
              >
                <span className="w-5 shrink-0 text-center text-base" aria-hidden>
                  {attribute.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-white">
                  {attribute.label}
                </span>
                <ScorePicker
                  compact
                  max={10}
                  value={attrs[attribute.key] ?? 5}
                  onChange={(value) =>
                    setAttr(attribute.key, value <= 0 ? 1 : value)
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Позиция
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {CREATE_POSITION_OPTIONS.map((option) => {
              const selected = position === option.group;
              const style = getPositionStyle(option.group);
              return (
                <button
                  key={option.group}
                  type="button"
                  onClick={() => handlePositionChange(option.group)}
                  className={`rounded-xl border px-1 py-2 text-center transition ${
                    selected
                      ? "border-white/25 bg-white/[0.1]"
                      : "border-white/8 bg-white/[0.03] opacity-70 hover:opacity-100"
                  }`}
                >
                  <span
                    className={`block text-[12px] font-black ${style.text}`}
                  >
                    {option.group}
                  </span>
                  <span className="mt-0.5 block truncate text-[8px] font-semibold text-slate-400">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Имя
          </label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Имя игрока"
            className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2.5 text-[14px] font-semibold text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
          />
        </div>
      </div>
    </AppBottomSheet>
  );
}
