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
  STATUS_LABELS,
} from "@/lib/adminStyles";
import PlayerInviteLink from "@/components/PlayerInviteLink";
import { getAverageLineupRating } from "@/lib/lineup";
import {
  removePlayerPhoto,
  uploadPlayerPhoto,
  validatePlayerPhotoFile,
} from "@/lib/playerPhotos";
import { getPositionGroup, getPositionStyle } from "@/lib/positionStyles";
import PlayerAvatar from "@/components/PlayerAvatar";
import type { AdminPlayersPageData } from "@/lib/server/adminPlayers";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type AdminPlayersBoardProps = AdminPlayersPageData;

async function clearLineupSlot(
  lineupPosition: string,
  exceptPlayerId?: number
) {
  let query = supabase
    .from("players")
    .update({ lineup_position: null })
    .eq("lineup_position", lineupPosition);

  if (exceptPlayerId !== undefined) {
    query = query.neq("id", exceptPlayerId);
  }

  const { error } = await query;
  if (error) throw error;
}

export default function AdminPlayersBoard({
  players,
  accountStatus,
  invites,
  loadError,
}: AdminPlayersBoardProps) {
  const router = useRouter();
  const [lineupPosition, setLineupPosition] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [rating, setRating] = useState(70);
  const [goals, setGoals] = useState(0);
  const [assists, setAssists] = useState(0);
  const [status, setStatus] = useState("ready");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  function refreshPageData() {
    router.refresh();
  }

  const resetForm = () => {
    setName("");
    setPosition("");
    setRating(70);
    setGoals(0);
    setAssists(0);
    setStatus("ready");
    setLineupPosition("");
    setEditingId(null);
    setPhotoUrl(null);
    setPhotoPreview(null);
    setPhotoFile(null);
  };

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validatePlayerPhotoFile(file);
    if (validationError) {
      alert(validationError);
      event.target.value = "";
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function persistPhotoForPlayer(playerId: number): Promise<string | null> {
    if (!photoFile) return photoUrl;

    setPhotoUploading(true);
    try {
      const uploadedUrl = await uploadPlayerPhoto(playerId, photoFile);
      await supabase
        .from("players")
        .update({ photo_url: uploadedUrl })
        .eq("id", playerId);
      setPhotoUrl(uploadedUrl);
      setPhotoFile(null);
      return uploadedUrl;
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleRemovePhoto() {
    if (!editingId) {
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoUrl(null);
      return;
    }

    if (!confirm("Удалить фото игрока?")) return;

    setPhotoUploading(true);
    try {
      await removePlayerPhoto(editingId);
      setPhotoUrl(null);
      setPhotoPreview(null);
      setPhotoFile(null);
      refreshPageData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не удалось удалить фото");
    } finally {
      setPhotoUploading(false);
    }
  }

  const handleSavePlayer = async () => {
    if (!name || !position) {
      alert("Заполни все поля");
      return;
    }

    const resolvedLineupPosition = lineupPosition || null;

    try {
      if (resolvedLineupPosition) {
        await clearLineupSlot(resolvedLineupPosition, editingId ?? undefined);
      }

      if (editingId !== null) {
        const { error } = await supabase
          .from("players")
          .update({
            name,
            position,
            rating,
            goals,
            assists,
            status,
            lineup_position: resolvedLineupPosition,
          })
          .eq("id", Number(editingId));

        if (error) {
          alert(error.message);
          return;
        }

        await persistPhotoForPlayer(editingId);
        alert("Игрок обновлён!");
      } else {
        const { data: inserted, error } = await supabase
          .from("players")
          .insert([
            {
              name,
              position,
              rating,
              goals,
              assists,
              status,
              lineup_position: resolvedLineupPosition,
            },
          ])
          .select("id")
          .single();

        if (error || !inserted) {
          alert(error?.message ?? "Не удалось добавить игрока");
          return;
        }

        if (photoFile) {
          await persistPhotoForPlayer(inserted.id);
        }

        alert("Игрок добавлен!");
      }

      resetForm();
      refreshPageData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка сохранения");
    }
  };

  async function handleDeletePlayer(id: number) {
    if (!confirm("Удалить игрока?")) return;

    const { error } = await supabase.from("players").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (editingId === id) resetForm();
    refreshPageData();
  }

  const avgRating = getAverageLineupRating(players).toFixed(1);

  return (
    <>
      {loadError && (
        <div className="mb-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          Ошибка загрузки: {loadError}
        </div>
      )}

      <div className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
        Игроков: {players.length} · ★ состава: {avgRating}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[340px_1fr]">
        <div className={adminPanelClass}>
          <h2 className={adminSectionTitleClass}>
            {editingId !== null ? "✏️ Редактировать" : "➕ Добавить игрока"}
          </h2>

          <div className="space-y-2 p-3">
            <div>
              <label className={adminLabelClass}>Имя игрока</label>
              <input
                type="text"
                placeholder="Имя игрока"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={adminInputClass}
              />
            </div>

            <div>
              <label className={adminLabelClass}>Фото (лицо и плечи)</label>
              <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    name={name || "Игрок"}
                    photoUrl={photoPreview ?? photoUrl}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handlePhotoSelect}
                      className="block w-full text-[11px] text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-cyan-600 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-white hover:file:bg-cyan-500"
                    />
                    <p className="text-[10px] leading-relaxed text-slate-500">
                      JPG/PNG до 5 МБ
                    </p>
                    {(photoPreview || photoUrl) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={photoUploading}
                        className="text-[11px] font-semibold text-red-300 hover:text-red-200"
                      >
                        Удалить фото
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className={adminLabelClass}>Позиция</label>
              <input
                type="text"
                placeholder="НАП, ЦП, ЗАЩ, ВРТ"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className={adminInputClass}
              />
            </div>

            <div>
              <label className={adminLabelClass}>Позиция в составе</label>
              <select
                value={lineupPosition}
                onChange={(e) => setLineupPosition(e.target.value)}
                className={adminInputClass}
              >
                <option value="">Не в составе</option>
                <option value="ВРТ">Вратарь</option>
                <option value="ЗАЩ1">Защитник 1</option>
                <option value="ЗАЩ2">Защитник 2</option>
                <option value="ЗАЩ3">Защитник 3</option>
                <option value="ЦП1">Полузащитник 1</option>
                <option value="ЦП2">Полузащитник 2</option>
                <option value="НАП1">Нападающий 1</option>
                <option value="НАП2">Нападающий 2</option>
              </select>
            </div>

            <div>
              <label className={adminLabelClass}>Рейтинг</label>
              <input
                type="number"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className={adminInputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={adminLabelClass}>Голы</label>
                <input
                  type="number"
                  value={goals}
                  onChange={(e) => setGoals(Number(e.target.value))}
                  className={adminInputClass}
                />
              </div>
              <div>
                <label className={adminLabelClass}>Передачи</label>
                <input
                  type="number"
                  value={assists}
                  onChange={(e) => setAssists(Number(e.target.value))}
                  className={adminInputClass}
                />
              </div>
            </div>

            <div>
              <label className={adminLabelClass}>Статус на матч</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={adminInputClass}
              >
                <option value="ready">🟢 Готов</option>
                <option value="maybe">🟡 Под вопросом</option>
                <option value="absent">🔴 Не готов</option>
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSavePlayer}
                disabled={photoUploading}
                className={`${adminPrimaryButtonClass} flex-1`}
              >
                {photoUploading
                  ? "Загрузка фото..."
                  : editingId !== null
                    ? "💾 Сохранить"
                    : "➕ Добавить"}
              </button>
              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className={adminSecondaryButtonClass}
                >
                  Отмена
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={adminPanelClass}>
          <h2 className={adminSectionTitleClass}>Список игроков</h2>

          <div className="space-y-1.5 p-3">
            {players.map((player) => {
              const group = getPositionGroup(
                player.lineup_position,
                player.position
              );
              const style = getPositionStyle(group);
              const statusInfo = accountStatus[player.id];
              const inviteInfo = invites[player.id];

              return (
                <div key={player.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-2 transition hover:border-white/10 hover:bg-black/30">
                    <div className="flex min-w-0 items-center gap-2">
                      <PlayerAvatar
                        name={player.name}
                        photoUrl={player.photo_url}
                        size="sm"
                        badge={group}
                        badgeClassName={style.badge}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="text-sm font-semibold text-white">
                            {player.name}
                          </div>
                          {statusInfo?.is_linked ? (
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200">
                              ✅ Аккаунт
                            </span>
                          ) : statusInfo?.has_active_invite ? (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200">
                              🔗 Ссылка
                            </span>
                          ) : (
                            <span className="rounded bg-slate-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">
                              нет аккаунта
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {player.position}
                          {player.lineup_position &&
                            ` · ${player.lineup_position}`}
                          {" · "}
                          {STATUS_LABELS[player.status] ?? player.status}
                          {" · ⚽ "}
                          {player.goals}
                          {" · 🎯 "}
                          {player.assists}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rating-gold text-sm font-bold">
                        {player.rating}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(player.id);
                          setName(player.name);
                          setPosition(player.position);
                          setRating(player.rating);
                          setGoals(player.goals);
                          setAssists(player.assists);
                          setStatus(player.status);
                          setLineupPosition(player.lineup_position || "");
                          setPhotoUrl(player.photo_url ?? null);
                          setPhotoPreview(null);
                          setPhotoFile(null);
                        }}
                        className={adminEditButtonClass}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(player.id)}
                        className={adminDangerButtonClass}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {!statusInfo?.is_linked && (
                    <PlayerInviteLink
                      playerId={player.id}
                      playerName={player.name}
                      compact
                      initialIsLinked={false}
                      initialToken={inviteInfo?.token ?? null}
                      initialExpiresAt={inviteInfo?.expires_at ?? null}
                      onInviteChange={refreshPageData}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
