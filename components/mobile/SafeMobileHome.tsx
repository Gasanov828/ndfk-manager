import MobileHomeDashboard from "@/components/mobile/MobileHomeDashboard";
import type { PlayerHomeDashboardPayload } from "@/lib/server/playerHomeDashboard";
import type { Match } from "@/lib/matches";
import type { Player } from "@/lib/lineup";

type SafeMobileHomeProps = PlayerHomeDashboardPayload & {
  latestPlayed: Match | null;
  players: Player[];
};

export default function SafeMobileHome(props: SafeMobileHomeProps) {
  try {
    return (
      <MobileHomeDashboard
        playerWelcome={props.playerWelcome}
        formRatings={props.formRatings}
        playedMatchesCount={props.playedMatchesCount}
        achievements={props.achievements}
        latestMatchRating={props.latestMatchRating}
        matchMvp={props.matchMvp}
        personalMvp={props.personalMvp}
        votingMatch={props.votingMatch}
        latestPlayed={props.latestPlayed}
        latestMatchStats={props.latestMatchStats}
        upcomingMatches={props.upcomingMatches}
        players={props.players}
      />
    );
  } catch (error) {
    console.error("SafeMobileHome render failed", error);
    return null;
  }
}
