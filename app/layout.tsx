import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CompareTray } from "@/components/art/compare-client";
import "./globals.css";
export const metadata:Metadata={title:{default:"아트체크 | 미술품 조각투자 AI 분석",template:"%s | 아트체크"},description:"미술품 조각투자 상품의 공모가, 작가 경매 기록, 회수 가능성, 플랫폼 청산 이력을 청약 전에 분석합니다."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body><a className="skip-link" href="#main-content">본문 바로가기</a><SiteHeader/>{children}<CompareTray/><footer className="art-footer"><div className="art-shell footer-grid"><div><strong>아트체크</strong><p>미술품 조각투자 청약 전 AI 분석 서비스</p></div><div><span>데이터 기준일 2026-08-15</span><Link href="/methodology">분석 기준</Link><Link href="/methodology#sources">출처 정책</Link></div><p>공개 자료를 바탕으로 작성된 AI 분석이며 개인별 투자 권유는 아닙니다.</p></div></footer></body></html>}
