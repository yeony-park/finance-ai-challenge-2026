import type { ReactNode } from "react";
import { ReportSectionFrame } from "@/components/report/ReportSectionFrame";
import type { CattleFilingDerivedArtifact } from "@/lib/verify/dart/filing-derived";
import type { ReportSection } from "@/components/report/report-sections";
import { VERDICT_HEADING_ID, reportSectionTitleId } from "@/components/report/ids";
import s from "@/components/report/report.module.css";

export const CATTLE_PENDING_REVIEWS = {
  history: {
    reason: "이 상품의 판매·정산 결과를 확인할 자료가 연결되지 않았습니다.",
    needed: "상품별 출하·매각·정산 내역과 비용 명세가 필요합니다.",
  },
  reality: {
    reason: "이 상품의 개체와 축산물이력 원장을 연결한 대조 결과가 없습니다.",
    needed: "공시의 개체 식별번호와 같은 개체의 공식 이력 조회 결과가 필요합니다.",
  },
  price: {
    reason: "이 상품의 취득가격과 비교 가능한 시장가격 대조 결과가 없습니다.",
    needed: "취득가격 산정 근거와 기준일·등급·단위가 맞는 시장 자료가 필요합니다.",
  },
} as const;

type CattlePendingSection = ReportSection & { readonly key: keyof typeof CATTLE_PENDING_REVIEWS };

export const isCattlePendingSection = (section: ReportSection): section is CattlePendingSection =>
  Object.hasOwn(CATTLE_PENDING_REVIEWS, section.key);

function FilingSource({ artifact }: { readonly artifact: CattleFilingDerivedArtifact }) {
  return (
    <p className={s.filingSection}>
      현재 연결된 출처 · <a href={artifact.registry.source.exactPublicUrl} target="_blank" rel="noopener noreferrer">DART 공시 원문</a>
      {` · 기준일 ${artifact.document.asOf} · 공시 일부 확인`}
    </p>
  );
}

export function CattleFilingSummary({ artifact, lifecycle }: { readonly artifact: CattleFilingDerivedArtifact; readonly lifecycle?: ReactNode }) {
  return (
    <section className={`${s.section} ${s.reportContentSection}`} id={VERDICT_HEADING_ID} aria-labelledby={reportSectionTitleId(VERDICT_HEADING_ID)}>
      <div className={s.wrap}>
        <header className={`${s.layerHead} ${s.sectionHead}`}>
          <h2 id={reportSectionTitleId(VERDICT_HEADING_ID)} className={s.layerTitle}>대조 결과</h2>
          <p className={s.sectionLead}>공시 일부 확인 · 외부 대조 불가</p>
        </header>
        {lifecycle}
        <div className={s.productOverviewGrid}>
          <div className={s.productGroup}>
            <h3 className={s.productGroupTitle}>확인된 내용</h3>
            <p className={s.sectionLead}>{artifact.chunks.map((chunk) => chunk.title).join(" · ")} 관련 공시 문단 {artifact.chunks.length}건을 확인했습니다.</p>
          </div>
          <div className={s.productGroup}>
            <h3 className={s.productGroupTitle}>확인하지 못한 범위</h3>
            <p className={s.sectionLead}>공시의 최신 조건, 개체 이력, 판매·정산 및 시장가격 대조는 확인되지 않았습니다.</p>
          </div>
        </div>
        <FilingSource artifact={artifact} />
      </div>
    </section>
  );
}

export function CattlePendingReview({ section, artifact }: {
  readonly section: CattlePendingSection;
  readonly artifact: CattleFilingDerivedArtifact;
}) {
  const review = CATTLE_PENDING_REVIEWS[section.key];
  return (
    <ReportSectionFrame
      headingId={section.id}
      title={section.label}
      lead={`대조 불가 · ${review.reason}`}
      footer={<FilingSource artifact={artifact} />}
    >
      <div className={s.productLimitations}>
        <h3>확인에 필요한 자료</h3>
        <p className={s.sectionLead}>{review.needed}</p>
      </div>
    </ReportSectionFrame>
  );
}
