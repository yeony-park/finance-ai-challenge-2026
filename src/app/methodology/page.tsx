import type { Metadata } from "next";
import Link from "next/link";

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
    "증권신고서의 주장을 어떤 공공 데이터와 대조하는지, 판정 3값(일치 / 원장 불일치 / 대조 불가)의 정의는 무엇인지, 무엇을 하지 않는지 정리했습니다.",
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
      <section className={s.header} aria-labelledby={METHODOLOGY_ANCHOR.methodology}>
        <div className={s.wrap}>
          <h1 id={METHODOLOGY_ANCHOR.methodology} className={s.title}>
            <span>검증 방법</span>
            <span className={s.titleLead}>
              무엇을 어떤 <em className={s.mark}>기록</em>과 대조하는가
            </span>
          </h1>
          <p className={s.lead}>
            이 서비스는 문서를 평가하지 않습니다. 문서에 적힌 주장을 검증 가능한 단위로 쪼갠 다음,
            같은 사실을 담고 있는 공공 기록과 나란히 놓고 서로 맞는지만 확인합니다.
          </p>
        </div>
      </section>

      <div className={`${s.wrap} ${s.body}`}>
        <MethodologyTabs tabs={TABS} />
        <Link href="/offers" className={s.backLink}>
          <span aria-hidden="true">←</span>
          공모 목록으로 돌아가기
        </Link>
      </div>
    </>
  );
}
