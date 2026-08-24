import { formatKrw, unexplainedDifference } from "@/lib/art/calculations";
import {
  ART_ABSENCE_NOTE,
  ART_CALC_FORMULA_COMPOSITION,
  ART_CALC_FORMULA_DIFF,
  ART_CALC_INTRO,
  ART_CALC_NOTE,
  ART_CALC_TITLE,
  ART_CHART_SECTION_LEAD,
  ART_CHART_SECTION_TITLE,
  ART_CHECK_NONE,
  ART_COMPARE_LEAD,
  ART_COMPARE_TITLE,
  ART_DETAIL_CAPTION_LABEL,
  ART_DETAIL_CHAIN_LABEL,
  ART_DETAIL_CHECK_LABEL,
  ART_DETAIL_DOC_LABEL,
  ART_DETAIL_LIMIT_LABEL,
  ART_DETAIL_TOGGLE,
  ART_FACT_LEAD,
  ART_HISTORICAL_NOTE,
  ART_PRODUCT_FACTS,
  type ArtProductFact,
} from "@/lib/content/art";
import { VERDICT_CAPTIONS } from "@/lib/content/verdict-captions";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";

import { ArtCompareSection } from "./ArtCompareSection";
import { OfferingComparisonChart, OfferingCompositionChart } from "./OfferingCharts";
import s from "./art.module.css";

const VERDICT_CHIP_CLASS: Record<ArtProductFact["verdict"], string> = {
  match: s.verdictMatch,
  mismatch: s.verdictMiss,
  unverifiable: s.verdictUnknown,
};

function compositionCheckText(fact: ArtProductFact): string {
  if (fact.acquisition === null || fact.issuanceCost === null)
    return ART_CHECK_NONE;
  const diff = unexplainedDifference(fact.offeringAmount, fact.acquisition, [
    { category: "issuance", label: "발행비용", amount: fact.issuanceCost },
  ]);
  return `취득가 ${formatKrw(fact.acquisition)} + 발행비용 ${formatKrw(
    fact.issuanceCost,
  )} = 공모가 ${formatKrw(fact.offeringAmount)} · 차액 ${(diff ?? 0).toLocaleString("ko-KR")}원`;
}

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
      <details className={s.detail}>
        <summary className={s.detailToggle}>{ART_DETAIL_TOGGLE}</summary>
        <dl className={s.detailBody}>
          <div className={s.detailBlock}>
            <dt>{ART_DETAIL_DOC_LABEL}</dt>
            {fact.sources.length > 0 ? (
              fact.sources.map((source) => (
                <dd key={source.rcpNo} className={s.detailMono}>
                  {source.label} · 접수번호 {source.rcpNo} · {source.asOf}
                </dd>
              ))
            ) : (
              <dd>{fact.sourceNote}</dd>
            )}
          </div>
          <div className={s.detailBlock}>
            <dt>{ART_DETAIL_CHECK_LABEL}</dt>
            <dd className={s.detailMono}>{compositionCheckText(fact)}</dd>
          </div>
          <div className={s.detailBlock}>
            <dt>{ART_DETAIL_CHAIN_LABEL}</dt>
            <dd className={s.detailMono}>{fact.priceChain}</dd>
          </div>
          <div className={s.detailBlock}>
            <dt>{ART_DETAIL_LIMIT_LABEL}</dt>
            <dd>{fact.limitation}</dd>
          </div>
          <div className={s.detailBlock}>
            <dt>{ART_DETAIL_CAPTION_LABEL}</dt>
            <dd>
              {VERDICT_LABEL[fact.verdict]} — {VERDICT_CAPTIONS[fact.verdict]}
            </dd>
          </div>
        </dl>
      </details>
    </article>
  );
}

function ArtCalcBlock() {
  return (
    <details className={s.calcBlock}>
      <summary className={s.calcToggle}>{ART_CALC_TITLE}</summary>
      <div className={s.calcBody}>
        <p>{ART_CALC_INTRO}</p>
        <p className={s.calcFormula}>{ART_CALC_FORMULA_COMPOSITION}</p>
        <p className={s.calcFormula}>{ART_CALC_FORMULA_DIFF}</p>
        <p>{ART_CALC_NOTE}</p>
      </div>
    </details>
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

      <section className={s.artSub} aria-labelledby="art-charts">
        <h3 id="art-charts" className={s.subhead}>
          {ART_CHART_SECTION_TITLE}
        </h3>
        <p className={s.chartSectionLead}>{ART_CHART_SECTION_LEAD}</p>
        <div className={s.chartPair}>
          <OfferingCompositionChart />
          <OfferingComparisonChart />
        </div>
      </section>

      <section className={s.artSub} aria-labelledby="art-compare">
        <h3 id="art-compare" className={s.subhead}>
          {ART_COMPARE_TITLE}
        </h3>
        <p className={s.compareLead}>{ART_COMPARE_LEAD}</p>
        <ArtCompareSection />
      </section>

      <ArtCalcBlock />

      <p className={s.historicalNote}>{ART_HISTORICAL_NOTE}</p>
    </div>
  );
}
