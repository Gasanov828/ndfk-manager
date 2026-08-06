import Footer from "@/components/Footer";
import AppChrome from "@/components/AppChrome";
import MobileBottomNav from "@/components/MobileBottomNav";
import AchievementUnlockToast from "@/components/AchievementUnlockToast";
import MobileTopHeader from "@/components/server/MobileTopHeader";
import {
  AuthProfileProvider,
  type InitialAuthState,
} from "@/hooks/useAuthProfile";
import { MobileOverlayProvider } from "@/hooks/useMobileOverlay";
import { getMatchBannerData } from "@/lib/server/matchBanner";

type AppShellProps = {
  children: React.ReactNode;
  initialAuth: InitialAuthState;
};

export default async function AppShell({ children, initialAuth }: AppShellProps) {
  const matchBanner = await getMatchBannerData();

  return (
    <div className="cosmic-bg flex min-h-screen flex-col">
      <AuthProfileProvider initialAuth={initialAuth}>
        <MobileOverlayProvider>
          <AppChrome
            matchBanner={matchBanner}
            mobileHomeHeader={<MobileTopHeader matchBanner={matchBanner} />}
          >
            {children}
          </AppChrome>
          <MobileBottomNav />
          <AchievementUnlockToast />
        </MobileOverlayProvider>
      </AuthProfileProvider>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
