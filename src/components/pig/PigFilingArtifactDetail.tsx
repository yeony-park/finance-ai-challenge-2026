import type { PigFilingDerivedArtifact } from "@/lib/verify/dart/pig-filing";

import s from "@/components/report/report.module.css";

export function PigFilingArtifactDetail({
  artifact,
}: {
  readonly artifact: PigFilingDerivedArtifact;
}) {
  const limitations = [...new Set([
    ...artifact.document.limitations,
    ...artifact.document.pages.flatMap((page) => page.limitations),
    ...artifact.chunks.flatMap((chunk) => chunk.limitations),
  ])];

  return (
    <section className={`${s.section} ${s.reportContentSection}`} aria-labelledby="pig-filing-title">
      <div className={s.wrap}>
        <header className={`${s.layerHead} ${s.sectionHead}`}>
          <h2 id="pig-filing-title" className={s.layerTitle}>DART 공시에서 확인한 내용</h2>
          <p className={s.sectionLead}>
            이 상품에 연결된 공개 문서에서 승인된 다섯 문단만 보여줍니다. 표시하지 않은 조건은 추정하지 않습니다.
          </p>
        </header>

        <dl className={s.productFacts}>
          <div className={s.productFact}>
            <dt>상품 식별</dt>
            <dd>{artifact.registry.productId}</dd>
          </div>
          <div className={s.productFact}>
            <dt>공시 기준일</dt>
            <dd>{artifact.document.asOf}</dd>
          </div>
          <div className={s.productFact}>
            <dt>공시 출처</dt>
            <dd>
              <a
                href={artifact.document.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`OpenDART 원문 · ${artifact.document.asOf} 기준 (새 창)`}
              >
                OpenDART 원문
              </a>
            </dd>
          </div>
        </dl>

        <div className={s.productOverviewGrid} aria-label="승인된 공시 문단">
          {artifact.chunks.map((chunk) => (
            <article key={chunk.chunkId} className={s.productGroup}>
              <h3 className={s.productGroupTitle}>{chunk.title}</h3>
              <p className={s.sectionLead}>{chunk.text}</p>
              <p className={s.filingSection}>DART 공시 · {chunk.asOf} 기준 · 문서 내 {chunk.page}쪽</p>
            </article>
          ))}
        </div>

        <div className={s.productLimitations}>
          <h3>확인 범위의 한계</h3>
          <ul>{limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}
