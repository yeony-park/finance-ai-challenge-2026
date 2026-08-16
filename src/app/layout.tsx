import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

import { MotionProvider } from "@/components/motion/MotionProvider";
import { OnboardingDialog } from "@/components/home/OnboardingDialog";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SERVICE_DEFINITION, SERVICE_NAME, SERVICE_ROLE } from "@/components/site/service";

import "./globals.css";
import s from "@/components/site/shell.module.css";

const sansKr = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const serifKr = Noto_Serif_KR({
  variable: "--font-serif-kr",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: `${SERVICE_NAME} — ${SERVICE_ROLE}`,
    template: `%s · ${SERVICE_NAME}`,
  },
  description: SERVICE_DEFINITION,
  applicationName: SERVICE_NAME,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SERVICE_NAME,
    title: `${SERVICE_NAME} — ${SERVICE_ROLE}`,
    description: SERVICE_DEFINITION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${sansKr.variable} ${serifKr.variable} ${plexMono.variable} antialiased`}
    >
      <body>
        <noscript>
          <style>{`.ds-reveal-pending{opacity:1}`}</style>
        </noscript>
        <MotionProvider>
          <a href="#content" className={s.skipLink}>
            본문으로 건너뛰기
          </a>
          <SiteHeader />
          <main id="content" className={s.main}>
            {children}
          </main>
          <SiteFooter />
          <OnboardingDialog />
        </MotionProvider>
      </body>
    </html>
  );
}
