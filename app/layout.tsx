import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { CompareTray } from "@/components/art/compare-client";
import { OnboardingDialog } from "@/components/home/OnboardingDialog";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import s from "@/components/site/shell.module.css";
import "./globals.css";


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
 title: { default: "JeomJeom — 조각투자 공시 대조 검증", template: "%s · JeomJeom" },
 description: "증권신고서와 국가 공공데이터를 대조합니다.", applicationName: "JeomJeom",
 openGraph: { type: "website", locale: "ko_KR", siteName: "JeomJeom", title: "JeomJeom — 조각투자 공시 대조 검증", description: "증권신고서와 국가 공공데이터를 대조합니다." },
 robots: { index: true, follow: true },
};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ko" className={`${sansKr.variable} ${serifKr.variable} ${plexMono.variable} antialiased`}><body><noscript><style>{`.ds-reveal-pending{opacity:1}`}</style></noscript><MotionProvider><a href="#content" className={s.skipLink}>본문으로 건너뛰기</a><SiteHeader /><div id="content" className={s.main}>{children}</div><CompareTray /><SiteFooter /><OnboardingDialog /></MotionProvider></body></html>; }
