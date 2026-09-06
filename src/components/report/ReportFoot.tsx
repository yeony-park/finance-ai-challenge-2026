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
            데이터 출처
          </h2>
        </header>

        <details className={`${s.supportingDetails} ${s.questionDetails}`}>
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

      </Reveal>
    </section>
  );
}
