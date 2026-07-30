import Footer from "@/components/Footer";
import AppChrome from "@/components/AppChrome";
import MobileBottomNav from "@/components/MobileBottomNav";
import AchievementUnlockToast from "@/components/AchievementUnlockToast";
import { AuthProfileProvider } from "@/hooks/useAuthProfile";
import { MobileOverlayProvider } from "@/hooks/useMobileOverlay";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="cosmic-bg flex min-h-screen flex-col">
      <AuthProfileProvider>
        <MobileOverlayProvider>
          <AppChrome>{children}</AppChrome>
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
