"use client";

import {
  adminDangerButtonClass,
  adminInputClass,
  adminLabelClass,
  adminPanelClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSectionTitleClass,
} from "@/lib/adminStyles";
import { buildRatingEpisodeUrl } from "@/lib/ratingEpisode";
import { useCallback, useEffect, useState } from "react";

type EpisodeRow = {
  id: string;
  token: string;
  title: string;
  status: "open" | "revealing" | "closed";
  created_at: string;
  closed_at: string | null;
};

type Progress = {
  completedVoters: number;
  totalVoters: number;
  votingComplete: boolean;
  acknowledgedPlayers: number;
  revealComplete: boolean;
} | null;

const STATUS_LABELS: Record<EpisodeRow["status"], string> = {
  open: "Голосование",
  revealing: "Смотрят результаты",
  closed: "Опубликован",
};

export default function AdminRatingPage() {
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [activeEpisode, setActiveEpisode] = useState<EpisodeRow | null>(null);
  const [progress, setProgress] = useState<Progress>(null);
  const [title, setTitle] = useState("Оценка характеристик");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEpisodes = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/admin/rating-episode", { cache: "no-store" });
      const payload = (await response.json()) as {
        error?: string;
        episodes?: EpisodeRow[];
        activeEpisode?: EpisodeRow | null;
        progress?: Progress;
      };

      if (!response.ok) {
        setError(payload.error === "not_admin" ? "Только для админа" : payload.error ?? "Ошибка");
        setLoading(false);
        return;
      }

      setEpisodes(payload.episodes ?? []);
      setActiveEpisode(payload.activeEpisode ?? null);
      setProgress(payload.progress ?? null);
    } catch {
      setError("Ошибка сети");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadEpisodes();
    const timer = setInterval(loadEpisodes, 15000);
    return () => clearInterval(timer);
  }, [loadEpisodes]);

  async function handleCreate() {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/rating-episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", title }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Не удалось создать");
        return;
      }

      await loadEpisodes();
    } catch {
      setError("Ошибка сети");
    } finally {
      setCreating(false);
    }
  }

  async function handlePublish(force = false) {
    if (!activeEpisode) return;

    const message = force
      ? "Опубликовать рейтинги принудительно? ★ обновится у всех в составе."
      : "Опубликовать рейтинги в состав? Игроки уже видели свои ★ — после этого рейтинг изменится везде.";

    if (!confirm(message)) return;

    setPublishing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/rating-episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          episodeId: activeEpisode.id,
          force,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Не удалось опубликовать");
        return;
      }

      await loadEpisodes();
    } catch {
      setError("Ошибка сети");
    } finally {
      setPublishing(false);
    }
  }

  async function copyLink(token: string) {
    const url = buildRatingEpisodeUrl(token);

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Скопируйте ссылку:", url);
    }
  }

  const shareUrl = activeEpisode ? buildRatingEpisodeUrl(activeEpisode.token) : null;
  const canPublish = activeEpisode?.status === "revealing" && progress?.revealComplete;
  const canForcePublish =
    activeEpisode?.status === "revealing" && !progress?.revealComplete;

  return (
    <>
      {error && (
        <p className="mb-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Загрузка...</p>
      ) : activeEpisode ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 sm:grid-cols-4">
            <div className="px-2 py-1">
              <p className="text-[10px] text-slate-500">Этап</p>
              <p className="truncate text-xs font-semibold text-white">
                {STATUS_LABELS[activeEpisode.status]}
              </p>
            </div>
            <div className="px-2 py-1">
              <p className="text-[10px] text-slate-500">Проголосовало</p>
              <p className="text-xs font-semibold text-white">
                {progress
                  ? `${progress.completedVoters}/${progress.totalVoters}`
                  : "—"}
              </p>
            </div>
            <div className="px-2 py-1">
              <p className="text-[10px] text-slate-500">Видели свой ★</p>
              <p className="text-xs font-semibold text-white">
                {progress
                  ? `${progress.acknowledgedPlayers}/${progress.totalVoters}`
                  : "—"}
              </p>
            </div>
            <div className="px-2 py-1">
              <p className="text-[10px] text-slate-500">Опрос ★</p>
              <p className="truncate text-xs font-semibold text-white">
                {activeEpisode.title}
              </p>
            </div>
          </div>

          <div className={adminPanelClass}>
            <h2 className={adminSectionTitleClass}>Ссылка для чата</h2>
            <div className="space-y-2 p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={shareUrl ?? ""}
                  className={`${adminInputClass} font-mono text-xs`}
                />
                <button
                  type="button"
                  onClick={() => copyLink(activeEpisode.token)}
                  className={adminSecondaryButtonClass}
                >
                  {copied ? "✓ Скопировано" : "Копировать"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                {activeEpisode.status === "open"
                  ? "Игроки оценивают друг друга. На карточке сразу появляется ★ по голосам."
                  : "Все проголосовали. Игроки открывают свою карточку и жмут «Видел свой рейтинг»."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canPublish && (
              <button
                type="button"
                disabled={publishing}
                onClick={() => handlePublish(false)}
                className={adminPrimaryButtonClass}
              >
                {publishing ? "Публикация..." : "⭐ Опубликовать в состав"}
              </button>
            )}

            {canForcePublish && (
              <button
                type="button"
                disabled={publishing}
                onClick={() => handlePublish(true)}
                className={adminDangerButtonClass}
              >
                Опубликовать без ожидания всех
              </button>
            )}

            {activeEpisode.status === "open" && progress?.votingComplete && (
              <span className="self-center text-xs text-cyan-300">
                Все проголосовали — игроки должны увидеть результаты на той же ссылке
              </span>
            )}

            {activeEpisode.status === "revealing" && progress?.revealComplete && (
              <span className="self-center text-xs text-emerald-300">
                ✓ Все видели свой ★ — можно публиковать
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className={`${adminPanelClass} max-w-lg`}>
          <h2 className={adminSectionTitleClass}>Опрос ★</h2>
          <div className="space-y-2 p-3">
            <p className="text-xs text-slate-400">
              Сейчас нет активного опроса. Создайте новый для локального теста или команды.
            </p>

            <div>
              <label className={adminLabelClass}>Название (необязательно)</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={adminInputClass}
                placeholder="Оценка характеристик"
              />
            </div>

            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className={`${adminPrimaryButtonClass} w-full sm:w-auto`}
            >
              {creating ? "Создание..." : "⭐ Создать опрос рейтинга"}
            </button>
          </div>
        </div>
      )}

      {episodes.length > 0 && (
        <div className={`${adminPanelClass} mt-2`}>
          <h2 className={adminSectionTitleClass}>История</h2>
          <div className="space-y-1 p-3">
            {episodes.map((episode) => (
              <div
                key={episode.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-2 text-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{episode.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {STATUS_LABELS[episode.status]} ·{" "}
                    {new Date(episode.created_at).toLocaleString("ru-RU")}
                    {episode.closed_at
                      ? ` · опубликован ${new Date(episode.closed_at).toLocaleString("ru-RU")}`
                      : ""}
                  </p>
                </div>
                {episode.status !== "closed" && (
                  <button
                    type="button"
                    onClick={() => copyLink(episode.token)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/5"
                  >
                    Ссылка
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
