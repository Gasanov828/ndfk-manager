"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChampionshipTeam } from "@/lib/championship/types";

export default function AdminChampionshipTeamsBoard({
  teams,
}: {
  teams: ChampionshipTeam[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#fbbf24");
  const [secondaryColor, setSecondaryColor] = useState("#78350f");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLogo, setEditLogo] = useState("");
  const [editPrimary, setEditPrimary] = useState("");
  const [editSecondary, setEditSecondary] = useState("");

  async function createTeam() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/championship/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          logoUrl,
          primaryColor,
          secondaryColor,
          addToActiveChampionship: true,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Ошибка");
        return;
      }
      setName("");
      setLogoUrl("");
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: number) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/championship/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: editName,
          logoUrl: editLogo,
          primaryColor: editPrimary,
          secondaryColor: editSecondary,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Ошибка");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  async function removeTeam(id: number, teamName: string) {
    if (!confirm(`Удалить команду «${teamName}»?`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/championship/teams?id=${id}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Ошибка удаления");
        return;
      }
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <h2 className="text-sm font-bold text-white">Добавить команду</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Команда сразу попадёт в активный чемпионат и таблицу
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-[11px] text-slate-400 sm:col-span-2">
            Название
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Новая команда"
            />
          </label>
          <label className="text-[11px] text-slate-400 sm:col-span-2">
            Логотип (URL)
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label className="text-[11px] text-slate-400">
            Основной цвет
            <input
              type="color"
              className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
          </label>
          <label className="text-[11px] text-slate-400">
            Доп. цвет
            <input
              type="color"
              className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
            />
          </label>
        </div>
        {error ? (
          <p className="mt-2 text-[12px] text-rose-300">{error}</p>
        ) : null}
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={createTeam}
          className="mt-3 rounded-xl bg-amber-500/20 px-3 py-2 text-[12px] font-bold text-amber-100 ring-1 ring-amber-400/30 disabled:opacity-50"
        >
          {busy ? "Сохраняем…" : "Добавить команду"}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">
          Команды ({teams.length})
        </h2>
        {teams.map((team) => {
          const editing = editingId === team.id;
          return (
            <div
              key={team.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
            >
              {editing ? (
                <div className="space-y-2">
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
                    value={editLogo}
                    onChange={(e) => setEditLogo(e.target.value)}
                    placeholder="URL логотипа"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="color"
                      className="h-10 w-full rounded-xl border border-white/10"
                      value={editPrimary}
                      onChange={(e) => setEditPrimary(e.target.value)}
                    />
                    <input
                      type="color"
                      className="h-10 w-full rounded-xl border border-white/10"
                      value={editSecondary}
                      onChange={(e) => setEditSecondary(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveEdit(team.id)}
                      className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-[11px] font-bold text-emerald-100"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-xl bg-white/5 px-3 py-1.5 text-[11px] text-slate-300"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: team.primary_color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-extrabold text-white">
                      {team.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {team.logo_url || "Без логотипа"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-[10px] font-semibold text-amber-200"
                    onClick={() => {
                      setEditingId(team.id);
                      setEditName(team.name);
                      setEditLogo(team.logo_url ?? "");
                      setEditPrimary(team.primary_color);
                      setEditSecondary(team.secondary_color);
                    }}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-[10px] font-semibold text-rose-300"
                    onClick={() => removeTeam(team.id, team.name)}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
