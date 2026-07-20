import MeProfile from "@/components/MeProfile";
import { getAuthSession } from "@/lib/auth";
import { getPlayerWelcomeForProfile } from "@/lib/server/playerWelcome";

export const revalidate = 30;

export default async function MePage() {
  const { user, profile } = await getAuthSession();

  if (!user) {
    return <MeProfile mode="guest" />;
  }

  if (profile?.role === "admin") {
    const displayName =
      profile.username ?? user.email?.split("@")[0] ?? "\u0410\u0434\u043c\u0438\u043d";
    return <MeProfile mode="admin" displayName={displayName} />;
  }

  const { welcome } = await getPlayerWelcomeForProfile(profile);
  const displayName =
    welcome?.name ??
    profile?.player_name ??
    user.email?.split("@")[0] ??
    "\u0418\u0433\u0440\u043e\u043a";

  return (
    <MeProfile mode="player" displayName={displayName} welcome={welcome} />
  );
}
