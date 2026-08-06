"use client";

import { useEffect, useRef, useState } from "react";
import ClubLogo from "@/components/ClubLogo";
import {
  PLAYER_PHOTO_UPDATED_EVENT,
  validatePlayerPhotoFile,
} from "@/lib/playerPhotos";
import { getPositionStyle } from "@/lib/positionStyles";
import { useVisiblePhotoUrl } from "@/hooks/useVisiblePhotoUrl";

type MeProfilePhotoProps = {
  name: string;
  photoUrl: string | null;
  positionGroup: string;
  rank: number;
  groupLabel: string;
};

export default function MeProfilePhoto({
  name,
  photoUrl: initialPhotoUrl,
  positionGroup,
  rank,
  groupLabel,
}: MeProfilePhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const visiblePhotoUrl = useVisiblePhotoUrl(photoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const positionStyle = getPositionStyle(positionGroup);

  useEffect(() => {
    setPhotoUrl(initialPhotoUrl);
  }, [initialPhotoUrl]);

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

      setPhotoUrl(payload.photoUrl ?? null);
      window.dispatchEvent(new Event(PLAYER_PHOTO_UPDATED_EVENT));
    } catch {
      setError("Ошибка сети");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="me-profile-tab__photo-wrap">
      <div className="me-profile-tab__photo">
        {visiblePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={visiblePhotoUrl} alt={name} className="me-profile-tab__photo-img" />
        ) : (
          <span
            className={`me-profile-tab__photo-fallback ${positionStyle.badge}`}
          >
            {name.trim().charAt(0) || "?"}
          </span>
        )}
        <span className="me-profile-tab__photo-num">#{rank}</span>
        <span className={`me-profile-tab__photo-role ${positionStyle.badge}`}>
          {groupLabel}
        </span>
      </div>

      <button
        type="button"
        className="me-profile-tab__photo-edit"
        disabled={uploading}
        aria-label="Изменить фото"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <span className="me-profile-tab__photo-spinner" aria-hidden />
        ) : (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
            <path
              d="M4 20h4l10.5-10.5a1.8 1.8 0 0 0 0-2.5l-2-2a1.8 1.8 0 0 0-2.5 0L4 15.5V20z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.5 6.5l4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <span className="me-profile-tab__club-badge" aria-hidden>
        <ClubLogo size="sm" className="!h-5 !w-5" />
      </span>

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

      {error ? (
        <p className="me-profile-tab__photo-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
