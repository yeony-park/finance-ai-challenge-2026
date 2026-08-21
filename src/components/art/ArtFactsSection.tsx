import {
  ART_ABSENCE_NOTE,
  ART_FACT_LEAD,
  ART_HISTORICAL_NOTE,
  ART_PRODUCT_FACTS,
  type ArtProductFact,
} from "@/lib/content/art";
import { formatKrw } from "@/lib/art/calculations";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";

import s from "./art.module.css";

const VERDICT_CHIP_CLASS: Record<ArtProductFact["verdict"], string> = {
  match: s.verdictMatch,
  mismatch: s.verdictMiss,
  unverifiable: s.verdictUnknown,
};

function ArtFactCard({ fact }: { fact: ArtProductFact }) {
  return (
    <article className={s.factCard}>
      <span className={s.factCardHead}>
        <span className={s.factLabel}>{fact.label}</span>
        <span className={`${s.verdictChip} ${VERDICT_CHIP_CLASS[fact.verdict]}`}>
          {VERDICT_LABEL[fact.verdict]}
        </span>
      </span>
      <p className={s.factStatusNote}>{fact.statusNote}</p>
      <dl className={s.factMetaRow}>
        <div className={s.factMeta}>
          <dt>공모금액</dt>
          <dd>{formatKrw(fact.offeringAmount)}</dd>
        </div>
        <div className={s.factMeta}>
          <dt>기준일</dt>
          <dd>{fact.asOf}</dd>
        </div>
        <div className={s.factMeta}>
          <dt>상태</dt>
          <dd>{fact.lifecycle}</dd>
        </div>
      </dl>
      <p className={s.priceChain}>{fact.priceChain}</p>
      <p className={s.factFinding}>{fact.finding}</p>
      <p className={s.factLimitation}>{fact.limitation}</p>
      {fact.sources.length > 0 ? (
        <ul className={s.factSources}>
          {fact.sources.map((source) => (
            <li key={source.url}>
              <a
                className={s.sourceLink}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {source.label} ↗
              </a>
              <span className={s.sourceMeta}>기준 {source.asOf}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.sourceEmpty}>{fact.sourceNote}</p>
      )}
    </article>
  );
}

export function ArtFactsSection() {
  return (
    <div>
      <p className={s.factLead}>{ART_FACT_LEAD}</p>
      <p className={s.absenceNote}>{ART_ABSENCE_NOTE}</p>
      <div className={s.factGrid}>
        {ART_PRODUCT_FACTS.map((fact) => (
          <ArtFactCard key={fact.id} fact={fact} />
        ))}
      </div>
      <p className={s.historicalNote}>{ART_HISTORICAL_NOTE}</p>
    </div>
  );
}
