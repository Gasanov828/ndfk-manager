import MatchMvpRichCard from "@/components/MatchMvpRichCard";
import type { MatchMvpInfo } from "@/lib/matchRatings";

type PersonalMvpCardProps = {
  mvp: MatchMvpInfo;
};

export default function PersonalMvpCard({ mvp }: PersonalMvpCardProps) {
  return (
    <section className="mvp-personal-card relative z-[1] mb-2 overflow-hidden rounded-2xl px-2.5 py-2 sm:mb-5 sm:px-4 sm:py-2.5">
      <MatchMvpRichCard mvp={mvp} personal />
    </section>
  );
}
