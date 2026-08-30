import type { Metadata } from "next";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import { ArtLiveSection } from "@/components/art-live/art-live-section";
import { buildArtViewModel } from "@/components/art-live/art-view-model";
export const metadata: Metadata = { title: "미술품", description: "미술품 합성 데이터 시뮬레이션" };
export const runtime = "nodejs";
export default function ArtPage() { const model = buildArtViewModel(); return <CategoryLanding title="미술품" lead="이 화면은 UI와 분석 흐름을 검증하기 위한 합성 미술품 투자 시뮬레이션입니다." customTitle="미술품 합성 데이터 현황" custom={<ArtLiveSection model={model} />} />; }
