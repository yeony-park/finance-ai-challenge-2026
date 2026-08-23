import {
  FILING_NOTICE,
  FILING_SECTION_LEAD,
  FILING_SECTION_TITLE,
  FILING_SOURCE_PREFIX,
  filingSourceLine,
} from "@/lib/content/filing";
import type { FilingFacts } from "@/lib/verify/report/filing-facts";

import { IconInfo } from "./icons";
import { FILING_HEADING_ID } from "./ids";
import s from "./report.module.css";

export function FilingFactsSection({ facts }: { readonly facts: FilingFacts }) {
  return (
    <section className={s.section} aria-labelledby={FILING_HEADING_ID}>
      <div className={s.wrap}>
        <header className={s.layerHead}>
          <span className={s.layerNo}>신고서 기재</span>
          <h2 id={FILING_HEADING_ID} className={s.layerTitle}>
            {FILING_SECTION_TITLE}
          </h2>
          <p className={s.filingLead}>{FILING_SECTION_LEAD}</p>
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

        <p className={s.filingSource}>{filingSourceLine(facts.rcpNo)}</p>

        <div className={s.honesty}>
          <IconInfo className={s.ic} />
          <span>{FILING_NOTICE}</span>
        </div>
      </div>
    </section>
  );
}
