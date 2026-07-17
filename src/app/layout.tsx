import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://docs.teamwicked.me"),
  title: {
    default: "Wickedhost Docs",
    template: "%s | Wickedhost Docs",
  },
  description: "TeamWicked 서비스의 설정, 운영, 문제 해결을 위한 공식 문서 센터입니다.",
  icons: { icon: "/team-wicked-mark.svg" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "Wickedhost Docs",
    title: "Wickedhost Docs",
    description: "TeamWicked 서비스의 설정, 운영, 문제 해결을 위한 공식 문서 센터입니다.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
