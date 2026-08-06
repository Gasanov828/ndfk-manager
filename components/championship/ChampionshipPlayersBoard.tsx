"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddPlayerAttributesModal from "@/components/AddPlayerAttributesModal";
import PlayerAvatar from "@/components/PlayerAvatar";
import {
  CHAMPIONSHIP_SQUAD_TARGET,
  enrollChampionshipPlayer,
  unenrollChampionshipPlayer,
} from "@/lib/championship/squad";
import type { AddPlayerAttributesPayload } from "@/lib/playerCreateRating";
import { getPositionStyle } from "@/lib/positionStyles";
import { supabase } from "@/lib/supabase";

export type ChampionshipSquadPlayer = {
  id: number;
  name: string;
  position: string;
  rating: number;
  photo_url: string | null;
};

type ChampionshipPlayersBoardProps = {
  championshipId: number;
  homeTeamId: number;
  enrolled: ChampionshipSquadPlayer[];
  clubPlayers: ChampionshipSquadPlayer[];
  canManage: boolean;
};

export default function ChampionshipPlayersBoard({
  championshipId,
  homeTeamId,
  enrolled,
  clubPlayers,
  canManage: canManageProp,
}: ChampionshipPlayersBoardProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(canManageProp);

  useEffect(() => {
    setCanManage(canManageProp);
  }, [canManageProp]);

  const enrolledIds = useMemo(
    () => new Set(enrolled.map((player) => player.id)),
    [enrolled]
  );

  const available = useMemo(
    () => clubPlayers.filter((player) => !enrolledIds.has(player.id)),
    [clubPlayers, enrolledIds]
  );

  const sortedEnrolled = useMemo(
    () =>
      [...enrolled].sort((a, b) => {
        const byPos = a.position.localeCompare(b.position, "ru");
        return byPos !== 0 ? byPos : a.name.localeCompare(b.name, "ru");
      }),
    [enrolled]
  );

  function refresh() {
    router.refresh();
  }

  async function handleCreate(payload: AddPlayerAttributesPayload) {
    if (!canManage) {
      throw new Error("Только админ может добавлять игроков");
    }

    const response = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        enrollChampionship: {
          championshipId,
          teamId: homeTeamId,
        },
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Не удалось добавить игрока");
    }
    refresh();
  }

  async function handleEnroll(playerId: number) {
    if (!canManage) return;
    if (enrolled.length >= CHAMPIONSHIP_SQUAD_TARGET) {
      setError(`В составе уже ${CHAMPIONSHIP_SQUAD_TARGET} — цель сезона`);
      return;
    }
    setBusyId(playerId);
    setError(null);
    try {
      await enrollChampionshipPlayer(supabase, {
        championshipId,
        teamId: homeTeamId,
        playerId,
      });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnenroll(playerId: number) {
    if (!canManage) return;
    if (!confirm("Убрать игрока из состава чемпионата?")) return;
    setBusyId(playerId);
    setError(null);
    try {
      await unenrollChampionshipPlayer(supabase, {
        championshipId,
        playerId,
      });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-white sm:text-lg">
            Игроки сезона
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Выбери состав чемпионата · цель {CHAMPIONSHIP_SQUAD_TARGET}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tabular-nums text-amber-200">
            {enrolled.length}
            <span className="text-sm font-bold text-slate-500">
              /{CHAMPIONSHIP_SQUAD_TARGET}
            </span>
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-200">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAddOpen(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-gradient-to-r from-cyan-500/25 to-sky-600/25 px-3 py-3 text-[14px] font-bold text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.15)] transition hover:from-cyan-500/35 hover:to-sky-600/35"
        >
          <span aria-hidden>+</span> Новый игрок (техника · удар · ★)
        </button>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          В чемпионате
        </p>
        {sortedEnrolled.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-[12px] text-slate-500">
            {canManage
              ? "Пока пусто — добавь игрока или выбери из клуба ниже"
              : "Состав сезона пока пуст"}
          </p>
        ) : (
          sortedEnrolled.map((player) => {
            const style = getPositionStyle(player.position);
            return (
              <div
                key={player.id}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2"
              >
                <PlayerAvatar
                  name={player.name}
                  photoUrl={player.photo_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold text-white">
                    {player.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    <span className={`font-bold ${style.text}`}>
                      {player.position}
                    </span>
                    {" · ★ "}
                    {player.rating}
                  </p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    disabled={busyId === player.id}
                    onClick={() => handleUnenroll(player.id)}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-400 hover:border-rose-400/30 hover:text-rose-200 disabled:opacity-40"
                  >
                    Убрать
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {canManage && available.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Из клуба
          </p>
          {available.map((player) => {
            const style = getPositionStyle(player.position);
            return (
              <div
                key={player.id}
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-black/20 px-2.5 py-2"
              >
                <PlayerAvatar
                  name={player.name}
                  photoUrl={player.photo_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-200">
                    {player.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    <span className={`font-bold ${style.text}`}>
                      {player.position}
                    </span>
                    {" · ★ "}
                    {player.rating}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    busyId === player.id ||
                    enrolled.length >= CHAMPIONSHIP_SQUAD_TARGET
                  }
                  onClick={() => handleEnroll(player.id)}
                  className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-200 disabled:opacity-40"
                >
                  В состав
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {canManage ? (
        <AddPlayerAttributesModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSubmit={handleCreate}
          title="Игрок чемпионата"
          submitLabel="В состав"
        />
      ) : null}
    </section>
  );
}
