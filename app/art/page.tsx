import type { Metadata } from "next";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import { ArtLiveSection } from "@/components/art-live/art-live-section";
import { buildArtViewModel } from "@/components/art-live/art-view-model";
export const metadata: Metadata = { title: "미술품", description: "미술품 공모의 공시 원문 대조 현황" };
export const runtime = "nodejs";
export default function ArtPage() { const model = buildArtViewModel(); return <CategoryLanding title="미술품" lead="발행사가 전자공시(DART)에 낸 미술품 투자계약증권의 공모가 구성을 원문과 대조해 정리했습니다. 층별 지원 선언과 독립 원장 연결은 이어지는 단계에서 확정됩니다." customTitle="미술품 공모 확인 현황 (공시 원문 대조)" custom={<ArtLiveSection model={model} />} />; }
