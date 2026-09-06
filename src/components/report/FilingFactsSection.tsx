import {
  FILING_SOURCE_PREFIX,
  filingSourceLine,
} from "@/lib/content/filing";
import type { FilingFacts } from "@/lib/verify/report/filing-facts";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

import { FILING_HEADING_ID } from "./ids";
import { ReportSectionFooter } from "./ReportSectionFooter";
import { ReportSectionFrame } from "./ReportSectionFrame";
import s from "./report.module.css";

export function FilingFactsSection({ facts }: { readonly facts: FilingFacts }) {
  return (
    <ReportSectionFrame
      headingId={FILING_HEADING_ID}
      title="신고서 정보"
      animated={false}
      footer={(
        <ReportSectionFooter
          sources={[filingSourceLine(facts.rcpNo)]}
          anchor={METHODOLOGY_ANCHOR.layers}
          label="신고서 항목은 어떻게 구조화했나요?"
        />
      )}
    >
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
    </ReportSectionFrame>
  );
}
