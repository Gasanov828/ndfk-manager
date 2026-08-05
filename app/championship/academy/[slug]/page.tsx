import Link from "next/link";
import { notFound } from "next/navigation";
import { ACADEMY_TOPICS, getAcademyTopic } from "@/lib/championship/academy";

export const dynamic = "force-dynamic";

type AcademyTopicPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return ACADEMY_TOPICS.map((topic) => ({ slug: topic.slug }));
}

export default async function AcademyTopicPage({ params }: AcademyTopicPageProps) {
  const { slug } = await params;
  const topic = getAcademyTopic(slug);

  if (!topic) notFound();

  return (
    <article className="tournament-enter space-y-2">
      <Link
        href="/championship/academy"
        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
      >
        ← Все темы
      </Link>

      <section className="tournament-panel rounded-2xl px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-500/15 text-2xl shadow-[0_0_18px_rgba(251,191,36,0.15)]">
            {topic.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-200/80">
              {"\u0423\u0440\u043E\u043A\u0438"}
            </p>
            <h1 className="mt-0.5 text-lg font-black leading-tight text-white sm:text-2xl">
              {topic.title}
            </h1>
            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-slate-300 sm:text-sm">
              {topic.explanation}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="tournament-panel rounded-2xl px-3 py-3 sm:px-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-200/80">
            Простая схема
          </p>
          <h2 className="mt-1 text-sm font-black text-white">{topic.scheme.title}</h2>
          <div className="mt-3 space-y-1.5">
            {topic.scheme.rows.map((row, index) => (
              <div
                key={`${row}-${index}`}
                className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-2.5 py-2 text-[12px] font-bold text-slate-100"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-400/15 text-[10px] text-violet-100">
                  {index + 1}
                </span>
                <span>{row}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tournament-panel rounded-2xl px-3 py-3 sm:px-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-200/80">
            Главные советы
          </p>
          <ul className="mt-3 space-y-1.5">
            {topic.tips.map((tip) => (
              <li
                key={tip}
                className="flex gap-2 rounded-xl border border-emerald-300/10 bg-emerald-500/[0.06] px-2.5 py-2 text-[12px] leading-snug text-slate-100"
              >
                <span className="shrink-0 text-emerald-300">✓</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="tournament-panel rounded-2xl px-3 py-3 sm:px-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-rose-200/80">
          Важные ошибки
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
          {topic.mistakes.map((mistake) => (
            <div
              key={mistake.bad}
              className="rounded-2xl border border-white/8 bg-black/20 p-2.5"
            >
              <p className="text-[12px] leading-snug text-rose-200">
                <span className="font-black">❌ </span>{mistake.bad}
              </p>
              <p className="mt-2 text-[12px] leading-snug text-emerald-200">
                <span className="font-black">✅ </span>{mistake.good}
              </p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
