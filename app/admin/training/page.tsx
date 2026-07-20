"use client";

import {
  adminDangerButtonClass,
  adminInputClass,
  adminLabelClass,
  adminPanelClass,
  adminPrimaryButtonClass,
  adminSectionTitleClass,
} from "@/lib/adminStyles";
import {
  buildTrainingVotingEndsAt,
  TRAINING_MAX_OVERALL_DELTA,
  TRAINING_VOTING_HOURS,
} from "@/lib/trainingRatings";
import { revertOverallRatingsForTraining } from "@/lib/trainingRatingSync";
import {
  formatTrainingHeader,
  sortTrainingsByDate,
  type TrainingSession,
} from "@/lib/trainingSessions";
import { notifyTrainingFinished } from "@/lib/trainingStatus";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function AdminTrainingPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    const { data, error } = await supabase
      .from("training_sessions")
      .select("*");

    if (error?.message.includes("training_sessions")) {
      setSchemaError("Выполните SQL из supabase/training.sql в Supabase");
      return;
    }

    setSessions(sortTrainingsByDate((data ?? []) as TrainingSession[]));
  }

  function resetForm() {
    setTitle("");
    setDate("");
    setTime("19:00");
    setLocation("");
    setNotes("");
  }

  async function handleCreate() {
    if (!title.trim() || !date) {
      alert("Укажите название и дату");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("training_sessions").insert([
      {
        title: title.trim(),
        date,
        time: time || "19:00",
        location: location.trim() || null,
        notes: notes.trim() || null,
      },
    ]);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    resetForm();
    await loadSessions();
    alert("Тренировка добавлена");
  }

  async function handleCompleteTraining(session: TrainingSession) {
    if (
      !confirm(
        `Завершить «${session.title}»? Откроется голосование на ${TRAINING_VOTING_HOURS} ч (влияние на ★ до ±${TRAINING_MAX_OVERALL_DELTA}).`
      )
    ) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("training_sessions")
      .update({
        is_completed: true,
        rating_voting_ends_at: buildTrainingVotingEndsAt(),
      })
      .eq("id", session.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    notifyTrainingFinished();
    await loadSessions();
    alert("Тренировка завершена! Игроки могут голосовать.");
  }

  async function handleDeleteTraining(session: TrainingSession) {
    if (
      !confirm(
        `Удалить «${session.title}»? Оценки и изменения ★ от этой тренировки будут отменены.`
      )
    ) {
      return;
    }

    setSaving(true);

    await revertOverallRatingsForTraining(session.id);

    await supabase
      .from("training_rating_votes")
      .delete()
      .eq("training_id", session.id);
    await supabase
      .from("training_rating_summary")
      .delete()
      .eq("training_id", session.id);

    const { error } = await supabase
      .from("training_sessions")
      .delete()
      .eq("id", session.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    await loadSessions();
    alert("Тренировка удалена");
  }

  if (schemaError) {
    return (
      <div className={`${adminPanelClass} p-3 text-sm text-amber-200`}>
        {schemaError}
      </div>
    );
  }

  const completedCount = sessions.filter((s) => s.is_completed).length;

  return (
    <>
      <div className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
        Всего: {sessions.length} · Завершено: {completedCount} · Бонус ★: ±
        {TRAINING_MAX_OVERALL_DELTA}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className={adminPanelClass}>
          <h2 className={adminSectionTitleClass}>Новая тренировка</h2>

          <div className="space-y-2 p-3">
            <div>
              <label className={adminLabelClass}>Название</label>
              <input
                className={adminInputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Тренировка · вторник"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={adminLabelClass}>Дата</label>
                <input
                  type="date"
                  className={adminInputClass}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className={adminLabelClass}>Время</label>
                <input
                  type="time"
                  className={adminInputClass}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={adminLabelClass}>Место</label>
              <input
                className={adminInputClass}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Стадион, зал…"
              />
            </div>
            <div>
              <label className={adminLabelClass}>Заметки</label>
              <textarea
                className={`${adminInputClass} min-h-[60px]`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Тактика, состав…"
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className={`${adminPrimaryButtonClass} w-full`}
            >
              {saving ? "Сохранение…" : "➕ Добавить тренировку"}
            </button>
          </div>
        </div>

        <div className={adminPanelClass}>
          <h2 className={adminSectionTitleClass}>Список</h2>

          <div className="p-3">
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500">Пока нет тренировок</p>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2"
                  >
                    <p className="text-sm font-semibold text-white">
                      {session.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatTrainingHeader(session)}
                      {session.location ? ` · 📍 ${session.location}` : ""}
                    </p>
                    <p className="mt-1 text-[11px]">
                      {session.is_completed ? (
                        <span className="text-emerald-300">
                          ✓ Завершена · голосование
                        </span>
                      ) : (
                        <span className="text-slate-500">Запланирована</span>
                      )}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {!session.is_completed && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleCompleteTraining(session)}
                          className={adminPrimaryButtonClass}
                        >
                          ✅ Завершить
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleDeleteTraining(session)}
                        className={adminDangerButtonClass}
                      >
                        🗑 Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-2 text-[10px] text-slate-500">
              После «Завершить» игроки видят кнопку 🏃 в шапке. Итоги — когда все
              проголосуют или через {TRAINING_VOTING_HOURS} ч. Для безопасного
              голосования выполните также training_voting_rls.sql.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
