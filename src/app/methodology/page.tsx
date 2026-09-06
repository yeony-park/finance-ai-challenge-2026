import type { Metadata } from "next";
import { CategoryMethodologyContent } from "@/components/methodology/CategoryMethodologyContent";
import { MethodologyTabs, type MethodologyTab } from "@/components/methodology/MethodologyTabs";
import { METHODOLOGY_TAB_COPY } from "@/lib/content/methodology-tabs";

import {
  AmendmentSection,
  LayersSection,
  LimitsSection,
  PipelineSection,
  PrinciplesSection,
  SourcesSection,
  VerdictsSection,
} from "@/components/methodology/MethodologyCoreSections";

import { METHODOLOGY_ANCHOR } from "./anchors";
import s from "./methodology.module.css";

export const metadata: Metadata = {
  title: "검증 방법",
  description:
    "증권신고서의 내용을 어떤 데이터와 비교하고 검증 결과를 어떻게 표시하는지 설명합니다.",
};

const TABS: readonly MethodologyTab[] = [
  {
    ...METHODOLOGY_TAB_COPY[0],
    content: (
      <>
        <PipelineSection />
        <LayersSection />
        <SourcesSection />
        <VerdictsSection />
        <AmendmentSection />
        <PrinciplesSection />
        <LimitsSection />
      </>
    ),
  },
  { ...METHODOLOGY_TAB_COPY[1], content: <CategoryMethodologyContent categoryId="art" /> },
  { ...METHODOLOGY_TAB_COPY[2], content: <CategoryMethodologyContent categoryId="cattle" /> },
  { ...METHODOLOGY_TAB_COPY[3], content: <CategoryMethodologyContent categoryId="pig" /> },
  { ...METHODOLOGY_TAB_COPY[4], content: <CategoryMethodologyContent categoryId="real-estate" /> },
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
            검증 방법
          </h1>
          <p className={s.lead}>공시 내용은 어떻게 확인하나요?</p>
        </div>
      </section>

      <div className={s.body}>
        <div className={s.wrap}>
          <MethodologyTabs tabs={TABS} />
        </div>
      </div>
    </>
  );
}
