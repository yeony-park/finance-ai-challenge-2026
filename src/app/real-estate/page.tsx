import type { Metadata } from "next";

import { ScenarioCatalog } from "@/components/real-estate-scenario/ScenarioCatalog";
import { loadApprovedScenarios } from "@/lib/knowledge/loader";

export const metadata: Metadata = {
  title: "부동산",
  description: "부동산 상품의 조건과 공개 근거를 분리해 확인하는 검토 화면",
  robots: { index: false, follow: false },
};

export default async function RealEstatePage() {
  return <ScenarioCatalog offers={await loadApprovedScenarios()} />;
}
