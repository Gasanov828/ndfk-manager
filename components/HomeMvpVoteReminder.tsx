import Link from "next/link";
import { buildMatchVotePath } from "@/lib/matchMvpVote";

type HomeMvpVoteReminderProps = {
  matchId: number;
  matchLabel: string;
};

export default function HomeMvpVoteReminder({
  matchId,
  matchLabel,
}: HomeMvpVoteReminderProps) {
  return (
    <section className="mb-2 overflow-hidden rounded-2xl border border-amber-300/35 bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-slate-900/40 px-3 py-2.5 shadow-[0_0_20px_rgba(251,191,36,0.12)] sm:mb-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-200">
        🏆 Голосование открыто
      </p>
      <p className="mt-0.5 text-[13px] font-black text-white">{matchLabel}</p>
      <p className="mt-0.5 text-[12px] text-slate-300">
        Ты ещё не проголосовал за MVP матча.
      </p>
      <Link
        href={buildMatchVotePath(matchId)}
        className="mt-2 inline-flex rounded-xl border border-amber-300/40 bg-amber-400/20 px-3 py-2 text-[12px] font-extrabold uppercase tracking-wide text-amber-50 transition duration-200"
      >
        Проголосовать →
      </Link>
    </section>
  );
}
