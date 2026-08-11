"use client";

/**
 * 판정 히어로와 층위 ①을 묶는 얇은 껍데기 — 눈높이(easy/pro) 하나만 여기서 관리한다.
 * 요약 한 문장과 근거 카드 해설이 같은 수준을 따라야 하므로 두 섹션의 공통 조상이 필요하다.
 * 그 외 층위(②·③·감시)는 눈높이와 무관하므로 서버 컴포넌트로 남는다.
 */
import { useState } from "react";

import type { DemoView, ExplainLevel } from "@/lib/verify/report/view-model";

import { RealitySection } from "./RealitySection";
import { VerdictHero } from "./VerdictHero";

export function ReportDocument({ view }: { readonly view: DemoView }) {
  const [level, setLevel] = useState<ExplainLevel>("easy");

  return (
    <>
      <VerdictHero view={view} level={level} onLevelChange={setLevel} />
      <RealitySection view={view} level={level} />
    </>
  );
}
