import type { Metadata } from "next";

import { CategoryMethodologyContent } from "@/components/methodology/CategoryMethodologyContent";
import {
  AmendmentSection,
  LayersSection,
  LimitsSection,
  PipelineSection,
  PrinciplesSection,
  SourcesSection,
  VerdictsSection,
} from "@/components/methodology/MethodologyCoreSections";
import {
  MethodologyTabs,
  type MethodologyTab,
} from "@/components/methodology/MethodologyTabs";
import { METHODOLOGY_TAB_COPY } from "@/lib/content/methodology-tabs";

import { METHODOLOGY_ANCHOR } from "./anchors";
import s from "./methodology.module.css";

export const metadata: Metadata = {
  title: "검증 방법",
  description:
    "증권신고서의 확인 항목을 공공 원장, 시장 데이터, 과거 공모 이력과 대조하고 결과·근거·한계를 기록하는 방법을 설명합니다.",
};

const TABS: readonly MethodologyTab[] = [
  { ...METHODOLOGY_TAB_COPY[0], content: <PipelineSection /> },
  { ...METHODOLOGY_TAB_COPY[1], content: <LayersSection /> },
  { ...METHODOLOGY_TAB_COPY[2], content: <SourcesSection /> },
  { ...METHODOLOGY_TAB_COPY[3], content: <VerdictsSection /> },
  { ...METHODOLOGY_TAB_COPY[4], content: <AmendmentSection /> },
  { ...METHODOLOGY_TAB_COPY[5], content: <PrinciplesSection /> },
  { ...METHODOLOGY_TAB_COPY[6], content: <LimitsSection /> },
  {
    ...METHODOLOGY_TAB_COPY[7],
    content: <CategoryMethodologyContent categoryId="cattle" />,
  },
  {
    ...METHODOLOGY_TAB_COPY[8],
    content: <CategoryMethodologyContent categoryId="pig" />,
  },
  {
    ...METHODOLOGY_TAB_COPY[9],
    content: <CategoryMethodologyContent categoryId="real-estate" />,
  },
  {
    ...METHODOLOGY_TAB_COPY[10],
    content: <CategoryMethodologyContent categoryId="art" />,
  },
];

export default function MethodologyPage() {
  return (
    <>
      <section
        className={s.header}
        aria-labelledby={METHODOLOGY_ANCHOR.methodology}
      >
        <div className={s.wrap}>
          <h1 id={METHODOLOGY_ANCHOR.methodology} className={s.title}>
            <span>검증 방법</span>
            <span className={s.titleLead}>공시 내용은 어떻게 확인하나요</span>
          </h1>
          <p className={s.lead}>
            JeomJeom은 증권신고서의 확인 항목을 공공 원장, 시장 데이터, 과거
            공모·거래 이력과 대조합니다. 결과와 함께 사용한 자료와 조회 시점도
            기록합니다.
          </p>
          <p className={s.lead}>
            검증 대상은 공개 자료로 직접 확인할 수 있는 사실입니다. 신고서의 내용과
            관련 데이터를 대조해 값의 일치 여부, 가격 부담, 과거 계획의 이행 내역을
            확인합니다.
          </p>
        </div>
      </section>

      <div className={`${s.wrap} ${s.body}`}>
        <MethodologyTabs tabs={TABS} />
      </div>
    </>
  );
}
