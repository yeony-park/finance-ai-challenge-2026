import type { CattleFilingDerivedArtifact } from "@/lib/verify/dart/filing-derived";

import s from "@/components/report/report.module.css";

export function CattleFilingArtifactDetail({
  artifact,
}: {
  readonly artifact: CattleFilingDerivedArtifact;
}) {
  return (
    <section className={`${s.section} ${s.reportContentSection}`} aria-labelledby="cattle-filing-title">
      <div className={s.wrap}>
        <header className={`${s.layerHead} ${s.sectionHead}`}>
          <h2 id="cattle-filing-title" className={s.layerTitle}>DART 공시에서 확인한 최소 사실</h2>
          <p className={s.sectionLead}>
            이 상품에 연결된 공시에서 승인된 문단만 표시합니다. 공시 간 정정 관계나 최신값은 확정하지 않습니다.
          </p>
        </header>

        <dl className={s.productFacts}>
          <div className={s.productFact}>
            <dt>상품 식별</dt>
            <dd>{artifact.registry.offerId}</dd>
          </div>
          <div className={s.productFact}>
            <dt>공시 제목</dt>
            <dd>{artifact.document.title}</dd>
          </div>
          <div className={s.productFact}>
            <dt>접수번호</dt>
            <dd>{artifact.registry.rcpNo}</dd>
          </div>
          <div className={s.productFact}>
            <dt>공시 기준일</dt>
            <dd>{artifact.document.asOf}</dd>
          </div>
          <div className={s.productFact}>
            <dt>공시 출처</dt>
            <dd>
              <a
                href={artifact.registry.source.exactPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`OpenDART 원문 · 접수번호 ${artifact.registry.rcpNo} (새 창)`}
              >
                OpenDART 원문
              </a>
            </dd>
          </div>
        </dl>

        <div className={s.productOverviewGrid} aria-label="승인된 공시 근거">
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
          <ul>
            <li>이 상품에 연결된 DART 공시의 승인 문단만 표시합니다.</li>
            <li>공시 간 정정·보충 관계와 현재 최신값은 확정하지 않았습니다.</li>
            <li>개체의 실제 존재 여부나 사육 이력은 이 공시 문단만으로 확인할 수 없습니다.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
