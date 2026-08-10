import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JeomJeom",
    template: "%s | JeomJeom",
  },
  description: "부동산·가축·미술품 STO의 공시와 외부 근거를 연결하는 AI 플랫폼",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <div className="shell">
            <strong>JeomJeom</strong>
            <p>공시에서 실물까지, 확인 가능한 근거만 연결합니다.</p>
            <span>© 2026 Finance AI Challenge team</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
