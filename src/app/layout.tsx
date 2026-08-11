import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

import { MotionProvider } from "@/components/motion/MotionProvider";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SERVICE_DEFINITION, SERVICE_NAME, SERVICE_ROLE } from "@/components/site/service";

import "./globals.css";
import s from "@/components/site/shell.module.css";

/*
 * 서체 3층위 — 역할이 겹치지 않게 쓴다.
 *  산세리프(Noto Sans KR): UI 전반과 제목. 히어로는 900까지 올려 스케일 대비를 만든다
 *  모노(IBM Plex Mono): 수치·이력번호·메타·태그 — 자리가 흔들리면 대조 화면의 신뢰가 깎인다
 *  세리프(Noto Serif KR): 공시 원문 인용 등 "문서에서 가져온 말"에만 절제해 쓴다
 */
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
        {/* 스크립트가 없으면 스크롤 리빌이 영영 오지 않는다 — 그때는 처음부터 보여 준다 */}
        <noscript>
          <style>{`.ds-reveal-pending{opacity:1}`}</style>
        </noscript>
        {/* 모션 런타임 경계 — DOM을 만들지 않는다. 셸의 마크업·시각은 그대로다 */}
        <MotionProvider>
          <a href="#content" className={s.skipLink}>
            본문으로 건너뛰기
          </a>
          <SiteHeader />
          {/* 모든 라우트가 같은 본문 랜드마크를 공유한다 — 건너뛰기 링크의 목적지 */}
          <main id="content" className={s.main}>
            {children}
          </main>
          <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  );
}
