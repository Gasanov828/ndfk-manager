import MeProfile from "@/components/MeProfile";
import MeProfileActions from "@/components/MeProfileActions";
import PlayerProfileView from "@/components/player/PlayerProfileView";
import MobilePlayerHeader from "@/components/server/MobilePlayerHeader";
import { getAuthSession } from "@/lib/auth";
import { getPlayerProfileData } from "@/lib/server/playerProfile";
import { getPlayerWelcomeForProfile } from "@/lib/server/playerWelcome";

export const revalidate = 30;

export default async function MePage() {
  const { user, profile } = await getAuthSession();

  if (!user) {
    return <MeProfile mode="guest" />;
  }

  if (profile?.role === "admin") {
    const displayName =
      profile.username ?? user.email?.split("@")[0] ?? "Админ";
    return <MeProfile mode="admin" displayName={displayName} />;
  }

  const { welcome } = await getPlayerWelcomeForProfile(profile);
  const displayName =
    welcome?.name ??
    profile?.player_name ??
    user.email?.split("@")[0] ??
    "Игрок";

  if (!welcome) {
    return (
      <>
        <MobilePlayerHeader displayName={displayName} />
        <MeProfile mode="player" displayName={displayName} welcome={null} />
      </>
    );
  }

  const profileData = await getPlayerProfileData(welcome.id);

  return (
    <>
      <MobilePlayerHeader displayName={displayName} />
      <div className="space-y-2">
        {profileData ? (
          <PlayerProfileView data={profileData} compact />
        ) : (
          <MeProfile mode="player" displayName={displayName} welcome={welcome} />
        )}
        <MeProfileActions />
      </div>
    </>
  );
}
