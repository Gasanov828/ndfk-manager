import Footer from "@/components/Footer";
import MainContent from "@/components/MainContent";
import MatchStatusBanner from "@/components/MatchStatusBanner";
import MobileBottomNav from "@/components/MobileBottomNav";
import Navbar from "@/components/Navbar";
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
          <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
            <Navbar />
            <MatchStatusBanner />
            <MainContent>{children}</MainContent>
          </div>
          <MobileBottomNav />
        </MobileOverlayProvider>
      </AuthProfileProvider>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
