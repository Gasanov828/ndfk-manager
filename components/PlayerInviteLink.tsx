"use client";

import { useCallback, useEffect, useState } from "react";

type PlayerInviteLinkProps = {
  playerId: number;
  playerName: string;
  compact?: boolean;
  initialIsLinked?: boolean;
  initialToken?: string | null;
  initialExpiresAt?: string | null;
  onInviteChange?: () => void;
};

function formatInviteError(message: string): string {
  if (message.includes("not_admin")) {
    return "Только админ может создавать ссылки.";
  }
  if (message.includes("player_already_registered")) {
    return "У этого игрока уже есть аккаунт — ссылка не нужна.";
  }
  if (message.includes("player_not_found")) {
    return "Игрок не найден.";
  }
  return message;
}

function buildJoinUrl(token: string): string {
  return `${window.location.origin}/join/${token}`;
}

export default function PlayerInviteLink({
  playerId,
  playerName,
  compact = false,
  initialIsLinked,
  initialToken,
  initialExpiresAt,
  onInviteChange,
}: PlayerInviteLinkProps) {
  const hasInitialData = initialIsLinked !== undefined;

  const [link, setLink] = useState<string | null>(
    initialToken ? buildJoinUrl(initialToken) : null
  );
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt ?? null);
  const [isLinked, setIsLinked] = useState(initialIsLinked ?? false);
  const [loading, setLoading] = useState(!hasInitialData);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkJustRenewed, setLinkJustRenewed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyInviteResponse = useCallback(
    (data: { isLinked?: boolean; token?: string | null; expiresAt?: string | null }) => {
      if (data.isLinked) {
        setIsLinked(true);
        setLink(null);
        setExpiresAt(null);
        return;
      }

      setIsLinked(false);
      if (data.token) {
        setLink(buildJoinUrl(data.token));
        setExpiresAt(data.expiresAt ?? null);
      } else {
        setLink(null);
        setExpiresAt(null);
      }
    },
    []
  );

  const reloadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/invites?playerId=${playerId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(formatInviteError(data.error ?? "Ошибка загрузки"));
        return;
      }

      applyInviteResponse(data);
    } catch {
      setError("Не удалось загрузить статус ссылки");
    } finally {
      setLoading(false);
    }
  }, [applyInviteResponse, playerId]);

  useEffect(() => {
    if (!hasInitialData) {
      reloadStatus();
    }
  }, [hasInitialData, reloadStatus]);

  async function handleGenerate() {
    const hadLink = !!link;

    setGenerating(true);
    setCopied(false);
    setLinkJustRenewed(false);
    setError(null);

    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", playerId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(formatInviteError(data.error ?? "Ошибка создания"));
        await reloadStatus();
        return;
      }

      applyInviteResponse({ isLinked: false, token: data.token, expiresAt: data.expiresAt });
      setLinkJustRenewed(hadLink);
      onInviteChange?.();

      if (data.token) {
        const freshLink = buildJoinUrl(data.token);
        try {
          await navigator.clipboard.writeText(freshLink);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } catch {
          // clipboard may be blocked until user gesture — link is still visible
        }
      }
    } catch {
      setError("Не удалось создать ссылку");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke() {
    if (!link) return;
    if (
      !confirm(
        `Отозвать ссылку для ${playerName}? Старая ссылка перестанет работать сразу.`
      )
    ) {
      return;
    }

    setRevoking(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", playerId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(formatInviteError(data.error ?? "Ошибка отзыва"));
        return;
      }

      setLink(null);
      setExpiresAt(null);
      setCopied(false);
      setLinkJustRenewed(false);
      onInviteChange?.();
    } catch {
      setError("Не удалось отозвать ссылку");
    } finally {
      setRevoking(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!link || !navigator.share) {
      await handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: `НДФК — регистрация: ${playerName}`,
        text: `Ссылка для регистрации игрока ${playerName}`,
        url: link,
      });
    } catch {
      await handleCopy();
    }
  }

  if (loading) {
    return (
      <div className={compact ? "text-[11px] text-slate-500" : "mt-2 text-xs text-slate-500"}>
        Проверяем аккаунт...
      </div>
    );
  }

  if (isLinked) {
    return (
      <div
        className={
          compact
            ? "inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200"
            : "mt-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3"
        }
      >
        <span>✅</span>
        <span>Аккаунт привязан</span>
      </div>
    );
  }

  const shellClass = compact
    ? "rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-2.5"
    : "mt-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3";

  return (
    <div className={shellClass}>
      {!compact && (
        <p className="text-[11px] font-semibold text-emerald-200">
          Ссылка для {playerName}
        </p>
      )}

      {!link ? (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className={`${compact ? "mt-0" : "mt-2"} text-xs font-semibold text-emerald-300 hover:text-emerald-200 disabled:opacity-50`}
        >
          {generating ? "Создание..." : "🔗 Создать invite-ссылку"}
        </button>
      ) : (
        <div className={`${compact ? "mt-1" : "mt-2"} space-y-2`}>
          {linkJustRenewed && (
            <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-100">
              Старая ссылка больше не работает. Отправьте игроку{" "}
              <strong>новый URL ниже</strong> (уже в буфере, если нажали «Копировать»).
            </p>
          )}
          <p className="break-all text-[10px] text-slate-300">{link}</p>
          {expiresAt && (
            <p className="text-[10px] text-slate-500">
              Действует до{" "}
              {new Date(expiresAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              {copied ? "Скопировано ✓" : "Копировать"}
            </button>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10"
            >
              Проверить
            </a>
            <button
              type="button"
              onClick={handleShare}
              className="rounded-lg border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10"
            >
              Отправить
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg px-2 py-1.5 text-[11px] text-slate-400 hover:text-slate-200 disabled:opacity-50"
            >
              {generating ? "..." : "Новая ссылка"}
            </button>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={revoking}
              className="rounded-lg border border-red-400/25 px-2 py-1.5 text-[11px] text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              {revoking ? "..." : "Сбросить"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-red-300">{error}</p>}

      {!compact && (
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          После «Новая ссылка» или «Сбросить» старый URL в WhatsApp/Telegram не работает —
          копируйте свежий из админки.
        </p>
      )}
    </div>
  );
}
