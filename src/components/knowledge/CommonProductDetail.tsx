import type { Metadata } from "next";

import type { CommonKnowledgeScope } from "@/lib/knowledge/loader";
import type { CommonProductRecord } from "@/lib/knowledge/schema";

import {
  COMMON_EVIDENCE_EXAMPLES,
  EvidenceQuery,
  type EvidenceQueryScope,
  safeCitationUrl,
} from "../real-estate-scenario/ScenarioEvidenceQuery";
import s from "../real-estate-scenario/scenario.module.css";

export const COMMON_CATEGORY_LABEL: Readonly<Record<CommonProductRecord["categoryId"], string>> = {
  cattle: "한우",
  pig: "돼지",
  art: "미술품",
  "real-estate": "부동산",
};

const PHASE_LABEL: Readonly<Record<NonNullable<CommonProductRecord["phase"]>, string>> = {
  upcoming: "공모 예정",
  "subscription-open": "청약 중",
  closed: "청약 종료",
  "listed-trading": "상장 거래",
  settled: "종료",
};

const PAGE_QUALITY_LABEL = {
  ready: "검색 가능",
  text_insufficient: "텍스트 부족",
  unsupported_scan: "OCR이 필요한 스캔",
} as const;

const formatDate = (value: string): string => value.replaceAll("-", ". ");

export const commonProductMetadata = (product: CommonProductRecord): Metadata => {
  const category = COMMON_CATEGORY_LABEL[product.categoryId];
  const description = `${category} 상품 문서 검토 · 기준일 ${product.asOf} · ${product.dataNature === "observed" ? "실제 공개정보" : "검토용 시나리오"}`;
  return {
    title: product.title,
    description,
    robots: { index: false, follow: false },
    openGraph: { type: "article", locale: "ko_KR", title: product.title, description },
  };
};

export const commonEvidenceScope = (product: CommonProductRecord): EvidenceQueryScope => {
  if (product.dataNature === "observed") {
    return {
      categoryId: product.categoryId,
      productId: product.productId,
      dataNature: "observed",
      namespace: "common",
    };
  }
  if (!product.scenarioId) throw new Error("시나리오 상품에 scenarioId가 없습니다.");
  return {
    categoryId: product.categoryId,
    productId: product.productId,
    scenarioId: product.scenarioId,
    dataNature: "scenario",
    namespace: "common",
  };
};

export function CommonProductDetail({ scope }: { readonly scope: CommonKnowledgeScope }) {
  const product = scope.product;
  if (!product) return null;
  const category = COMMON_CATEGORY_LABEL[product.categoryId];
  const phase = product.phase ? PHASE_LABEL[product.phase] : product.status ?? "단계 미확인";
  const dataNature = product.dataNature === "observed" ? "실제 공개정보" : "검토용 시나리오";

  return (
    <div>
      <header className={s.detailHero}>
        <div className={s.detailWrap}>
          <p className={s.eyebrow}>{category} · 상품 문서 검토</p>
          <h1 className={s.detailTitle}>{product.title}</h1>
          <span className={s.phase}>{phase}</span>
          <p className={s.detailLead}>상품에 연결된 공개 문서와 그 문서 안에서 확인할 수 있는 근거를 보여줍니다.</p>
        </div>
      </header>

      <section className={`${s.detailSection} ${s.detailMuted}`} aria-labelledby="common-product-overview-title">
        <div className={s.detailWrap}>
          <p className={s.eyebrow}>상품 개요</p>
          <h2 id="common-product-overview-title" className={s.sectionTitle}>등록 범위</h2>
          <dl className={`${s.reviewSummary} ${s.detailFacts}`}>
            <div><dt>카테고리</dt><dd>{category}</dd></div>
            <div><dt>현재 단계</dt><dd>{phase}</dd></div>
            <div><dt>기준일</dt><dd>{formatDate(product.asOf)}</dd></div>
            <div><dt>데이터 구분</dt><dd>{dataNature}</dd></div>
          </dl>
        </div>
      </section>

      <section className={s.detailSection} aria-labelledby="common-product-documents-title">
        <div className={s.detailWrap}>
          <p className={s.eyebrow}>연결 문서</p>
          <h2 id="common-product-documents-title" className={s.sectionTitle}>
            공개·검색 가능 문서 {scope.documents.length}건
          </h2>
          <p className={s.sectionLead}>부분 처리 문서는 검색 가능한 페이지만 사용하며, OCR 필요·텍스트 부족 페이지는 근거 검색에서 제외합니다.</p>
          {scope.documents.length > 0 ? (
            <div className={s.reviewStack}>
              {scope.documents.map((document) => {
                const readyPages = document.pages.filter((page) => page.quality === "ready").length;
                const excludedPages = document.pages.filter((page) => page.quality !== "ready");
                const limitations = [...new Set([
                  ...document.limitations,
                  ...excludedPages.flatMap((page) => page.limitations),
                ])];
                const url = safeCitationUrl(document.sourceUrl);
                const linkLabel = `${document.title} · ${document.publisher} · ${document.asOf} 기준`;
                return (
                  <article key={document.documentId} className={s.reviewBlock}>
                    <h3>{document.title}</h3>
                    <dl className={s.detailFacts}>
                      <div><dt>출처</dt><dd>{document.publisher}</dd></div>
                      <div><dt>기준일</dt><dd>{formatDate(document.asOf)}</dd></div>
                      <div>
                        <dt>문서 상태</dt>
                        <dd>{document.status === "ready" ? "전체 검색 가능" : "부분 검색 가능"}</dd>
                      </div>
                      <div>
                        <dt>페이지 범위</dt>
                        <dd>{document.pages.length > 0 ? `${readyPages}/${document.pages.length}쪽 검색 가능` : "페이지 정보 없음"}</dd>
                      </div>
                    </dl>
                    {excludedPages.length > 0 ? (
                      <p className={s.blockNote}>
                        검색 제외 · {excludedPages.map((page) => `${page.page}쪽 ${PAGE_QUALITY_LABEL[page.quality]}`).join(" · ")}
                      </p>
                    ) : null}
                    {limitations.length > 0 ? (
                      <ul className={s.limitList}>{limitations.map((item) => <li key={item}>{item}</li>)}</ul>
                    ) : null}
                    <ul className={s.sourceList} aria-label={`${document.title} 문서 출처`}>
                      <li>
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${linkLabel} (새 창)`}>
                            원문 열기 · {document.publisher}
                          </a>
                        ) : <span>원문 링크 확인 불가 · {document.publisher}</span>}
                        <span>{formatDate(document.asOf)} 기준</span>
                      </li>
                    </ul>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className={s.emptyText}>현재 공개·검색 가능한 문서가 없어 근거 답변을 보류합니다.</p>
          )}
        </div>
      </section>

      <div className={s.detailWrap}>
        <EvidenceQuery
          scope={commonEvidenceScope(product)}
          examples={COMMON_EVIDENCE_EXAMPLES}
          lead="해당 상품에 정확히 연결된 공개 문서 범위에서만 찾습니다. 확인 자료가 없으면 답을 만들지 않고 보류합니다."
        />
      </div>
    </div>
  );
}
