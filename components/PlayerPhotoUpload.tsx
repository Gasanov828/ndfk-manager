"use client";

import { useEffect, useRef, useState } from "react";
import { getPositionStyle } from "@/lib/positionStyles";
import { PLAYER_PHOTO_UPDATED_EVENT, validatePlayerPhotoFile } from "@/lib/playerPhotos";

type PlayerPhotoUploadProps = {
  playerId: number;
  name: string;
  photoUrl: string | null;
  positionGroup?: string;
  size?: "sm" | "md";
  layout?: "default" | "inline";
  onPhotoUpdated?: (photoUrl: string | null) => void;
};

export default function PlayerPhotoUpload({
  playerId,
  name,
  photoUrl,
  positionGroup = "ЦП",
  size = "md",
  layout = "default",
  onPhotoUpdated,
}: PlayerPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(photoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUrl(photoUrl);
  }, [photoUrl]);

  const positionStyle = getPositionStyle(positionGroup);
  const sizeClass = size === "sm" ? "player-photo-upload--sm" : "player-photo-upload--md";
  const inline = layout === "inline";

  async function handleFile(file: File) {
    const validationError = validatePlayerPhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch("/api/me/photo", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        photoUrl?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить");
        return;
      }

      const nextUrl = payload.photoUrl ?? null;
      setCurrentUrl(nextUrl);
      onPhotoUpdated?.(nextUrl);
      window.dispatchEvent(new Event(PLAYER_PHOTO_UPDATED_EVENT));
    } catch {
      setError("Ошибка сети");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!currentUrl) return;
    if (!confirm("Удалить фото?")) return;

    setUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/me/photo", { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Не удалось удалить");
        return;
      }

      setCurrentUrl(null);
      onPhotoUpdated?.(null);
      window.dispatchEvent(new Event(PLAYER_PHOTO_UPDATED_EVENT));
    } catch {
      setError("Ошибка сети");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={`player-photo-upload ${sizeClass} ${
        inline ? "player-photo-upload--inline" : ""
      }`}
    >
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="player-photo-upload__button"
        aria-label="Загрузить фото"
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="" className="player-photo-upload__img" />
        ) : (
          <span
            className={`player-photo-upload__fallback ${positionStyle.badge}`}
          >
            {name.trim().charAt(0) || "?"}
          </span>
        )}
        <span className="player-photo-upload__badge" aria-hidden>
          {uploading ? "…" : "📷"}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {!inline ? (
        <div className="player-photo-upload__meta">
          <p className="player-photo-upload__hint">
            {currentUrl ? "Нажмите, чтобы заменить" : "Добавить фото"}
          </p>
          <p className="player-photo-upload__sub">JPG/PNG до 5 МБ</p>
          {currentUrl ? (
            <button
              type="button"
              disabled={uploading}
              onClick={() => void handleRemove()}
              className="player-photo-upload__remove"
            >
              Удалить
            </button>
          ) : null}
          {error ? <p className="player-photo-upload__error">{error}</p> : null}
        </div>
      ) : error ? (
        <p className="player-photo-upload__error player-photo-upload__error--inline">
          {error}
        </p>
      ) : null}
    </div>
  );
}
