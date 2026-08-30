import Link from "next/link";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";
import { Reveal } from "@/components/motion/Reveal";
import { DATA_SOURCES } from "@/components/site/service";

import { ReportSectionFooter } from "./ReportSectionFooter";
import s from "./report.module.css";

const FOOT_HEADING_ID = "report-foot-heading";

export function ReportFoot() {
  return (
    <section
      className={`${s.section} ${s.reportContentSection}`}
      aria-labelledby={FOOT_HEADING_ID}
    >
      <Reveal className={s.wrap}>
        <header className={`${s.layerHead} ${s.sectionHead}`}>
          <h2 id={FOOT_HEADING_ID} className={s.layerTitle}>
            고지
          </h2>
          <p className={s.sectionLead}>
            이 리포트는 공시와 공공 데이터의 일치 여부만 표시하며 투자 권유나 가치 평가가 아닙니다.
            화면에 표시되는 발행사명·이력번호·소재지는 익명화 처리된 상태입니다.
          </p>
        </header>

        <details className={s.supportingDetails}>
          <summary className={s.supportingSummary}>데이터 출처와 갱신 기준 보기</summary>
          <div className={s.supportingTextBody}>
            {DATA_SOURCES.map((source) => (
              <p key={source.name}>
                출처 · {source.name} ({source.holder})
              </p>
            ))}
            <p>
              공공 데이터는 계속 갱신됩니다. 같은 항목이 다른 시점에는 다르게 확인될 수 있어,
              리포트에는 조회 시각이 함께 적혀 있습니다.
            </p>
          </div>
        </details>

        <ReportSectionFooter
          sources={["공시·공공 데이터 대조 결과"]}
          anchor={METHODOLOGY_ANCHOR.sources}
          label="어떤 데이터와 대조하나요?"
        />

        <div className={s.footLinks}>
          <Link href="/offers" className={s.buttonGhost}>
            <span aria-hidden="true">←</span>
            공모 목록으로 돌아가기
          </Link>
          <Link href="/#checklist" className={s.buttonGhost}>
            확인 질문 8가지 보기
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
