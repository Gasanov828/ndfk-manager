"use client";

export default function HomeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-10 text-center">
      <h1 className="text-lg font-bold text-white">Не удалось загрузить главную</h1>
      <p className="mt-2 text-sm text-slate-400">
        Попробуйте обновить страницу. Остальные разделы сайта работают как обычно.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          Обновить
        </button>
        <a
          href="/players"
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200"
        >
          Перейти к игрокам
        </a>
      </div>
    </main>
  );
}
