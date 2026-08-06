import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { Geist, Geist_Mono } from "next/font/google";
import { getAuthSession } from "@/lib/auth";
import type { InitialAuthState } from "@/hooks/useAuthProfile";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ФК Н-Дженгутай",
  description: "Официальный сайт футбольного клуба",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#05070a",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, profile } = await getAuthSession();
  const initialAuth: InitialAuthState = {
    user: user
      ? { id: user.id, email: user.email ?? null }
      : null,
    profile: profile
      ? {
          role: profile.role,
          player_id: profile.player_id,
          player_name: profile.player_name ?? null,
          username: profile.username ?? null,
        }
      : null,
  };

  return (
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppShell initialAuth={initialAuth}>{children}</AppShell>
      </body>
    </html>
  );
}
