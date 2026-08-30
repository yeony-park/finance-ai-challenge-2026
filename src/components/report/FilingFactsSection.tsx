import {
  FILING_SECTION_LEAD,
  FILING_SOURCE_PREFIX,
  filingSourceLine,
} from "@/lib/content/filing";
import type { FilingFacts } from "@/lib/verify/report/filing-facts";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

import { FILING_HEADING_ID, reportSectionTitleId } from "./ids";
import { ReportSectionFooter } from "./ReportSectionFooter";
import s from "./report.module.css";

export function FilingFactsSection({ facts }: { readonly facts: FilingFacts }) {
  const titleId = reportSectionTitleId(FILING_HEADING_ID);

  return (
    <section
      className={`${s.section} ${s.reportContentSection}`}
      aria-labelledby={titleId}
    >
      <span id={FILING_HEADING_ID} className={s.sectionAnchor} aria-hidden="true" />
      <div className={s.wrap}>
        <header className={`${s.layerHead} ${s.sectionHead}`}>
          <h2 id={titleId} className={s.layerTitle}>
            신고서 정보
          </h2>
          <p className={s.sectionLead}>{FILING_SECTION_LEAD}</p>
        </header>

        <dl className={s.filingList}>
          {facts.facts.map((fact) => (
            <div key={fact.id} className={s.filingItem}>
              <dt className={s.filingLabel}>{fact.label}</dt>
              <dd className={s.filingValue}>{fact.value}</dd>
              <dd className={s.filingSection}>
                {FILING_SOURCE_PREFIX} · {fact.section}
              </dd>
            </div>
          ))}
        </dl>

        <ReportSectionFooter
          sources={[filingSourceLine(facts.rcpNo)]}
          anchor={METHODOLOGY_ANCHOR.layers}
          label="신고서 항목은 어떻게 구조화했나요?"
        />
      </div>
    </section>
  );
}
