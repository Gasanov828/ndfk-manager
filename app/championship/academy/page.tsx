import Link from "next/link";
import { ACADEMY_TOPICS } from "@/lib/championship/academy";

export const dynamic = "force-dynamic";

export default function ChampionshipAcademyPage() {
  return (
    <section className="tournament-enter space-y-2">
      <div className="tournament-panel rounded-2xl px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-500/15 text-xl shadow-[0_0_18px_rgba(168,85,247,0.15)]">
            🧠
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-violet-200/80">
              {"\u041C\u0438\u043D\u0438-\u0443\u0440\u043E\u043A\u0438"}
            </p>
            <h1 className="mt-0.5 text-lg font-black text-white sm:text-2xl">
              {"\u0423\u0440\u043E\u043A\u0438"}
            </h1>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-400 sm:text-sm">
              Короткие уроки для игроков: как двигаться, защищаться, открываться и играть умнее без длинных статей.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {ACADEMY_TOPICS.map((topic, index) => (
          <Link
            key={topic.slug}
            href={`/championship/academy/${topic.slug}`}
            className="tournament-panel group rounded-2xl px-3 py-3 transition duration-200 hover:-translate-y-0.5 hover:border-violet-300/25 hover:bg-white/[0.05]"
            style={{ animationDelay: `${index * 28}ms` }}
          >
            <div className="flex items-start gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-lg transition group-hover:scale-105 group-hover:bg-violet-500/15">
                {topic.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[13px] font-extrabold leading-tight text-white sm:text-sm">
                  {topic.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-400">
                  {topic.short}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-violet-200/60 transition group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
