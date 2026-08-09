import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

// 서체 3층위: 공시 원문·제목=세리프 / UI=산세리프 / 수치·메타=모노
const sansKr = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
  title: "조각투자 가치검증 — 2026 금융 AI Challenge",
  description:
    "조각투자 공모의 가격 적정성·사업자 이행 이력·공모문서 위험조건을 공개 데이터로 교차 검증하는 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${sansKr.variable} ${serifKr.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
