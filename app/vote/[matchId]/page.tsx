import MatchMvpVoteBoard from "@/components/MatchMvpVoteBoard";

type VotePageProps = {
  params: Promise<{ matchId: string }>;
};

export default async function MatchMvpVotePage({ params }: VotePageProps) {
  const { matchId: raw } = await params;
  const matchId = Number(raw);

  if (!Number.isFinite(matchId) || matchId <= 0) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-6 text-sm text-red-100">
        Неверная ссылка голосования.
      </div>
    );
  }

  return <MatchMvpVoteBoard matchId={matchId} />;
}
