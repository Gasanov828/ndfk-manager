import ClubHeroBrand from "@/components/server/ClubHeroBrand";
import MatchStatusBanner from "@/components/MatchStatusBanner";
import type { MatchBannerData } from "@/lib/server/matchBanner";

export default function MobileTopHeader({
  matchBanner,
}: {
  matchBanner: MatchBannerData;
}) {
  const hasMatch = Boolean(matchBanner.liveMatch || matchBanner.upcomingMatch);

  return (
    <div className="mobile-top-header mb-1.5 flex flex-col gap-1 md:mb-2">
      <ClubHeroBrand href="/" tag="ФК · главная" fullBleed />

      {hasMatch ? (
        <MatchStatusBanner
          embedded
          className="md:hidden"
          initialLiveMatch={matchBanner.liveMatch}
          initialUpcomingMatch={matchBanner.upcomingMatch}
        />
      ) : null}
    </div>
  );
}
