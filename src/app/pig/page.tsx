import type { Metadata } from "next";

import { CategoryLanding } from "@/components/category/CategoryLanding";

export const metadata: Metadata = {
  title: "돼지",
  description: "돼지 공모의 확인 현황 — 카테고리 착지 준비 중",
};

export default function PigPage() {
  return (
    <CategoryLanding
      title="돼지"
      lead="카테고리 착지 준비 중입니다 — 담당 구현이 층별 지원 선언을 확정하면, 같은 공통 검증 기반 위에서 확인 현황이 여기에 표시됩니다."
      descriptor={null}
      offers={[]}
    />
  );
}
