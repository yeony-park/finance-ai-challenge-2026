import { PigDiseaseMap } from "@/components/pig-disease-map";
import { PigMarketInfographic } from "@/components/pig-market-infographic";
import {
  getDartDocumentUrl,
  type PigDisclosureProduct,
} from "@/data/pig-disclosure";
import type { PigMarketSnapshot } from "@/lib/pig/pig-market";

type PigDisclosureDetailProps = {
  product: PigDisclosureProduct;
  allProducts: PigDisclosureProduct[];
  market: PigMarketSnapshot;
  dartAsOf: string;
};

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function formatLargeWon(value: number) {
  return `${(value / 100_000_000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}억원`;
}

function formatPercent(value: number) {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

export function PigDisclosureDetail({
  product,
  allProducts,
  market,
  dartAsOf,
}: PigDisclosureDetailProps) {
  const correctedDocument = product.documents.find((document) => document.label === "기재정정 신고서");

  return (
    <div className="pig-product-detail" id="product-detail">
      <section className="content-card pig-product-overview" aria-labelledby="pig-product-detail-title">
        <div className="section-heading">
          <div>
            <p className="section-label">선택 상품</p>
            <h2 className="type-subtitle" id="pig-product-detail-title">{product.productName}</h2>
            <p className="section-description">공시 속 상품 조건과 그 밖의 공식 자료를 같은 기준일로 나눠 보여줍니다.</p>
          </div>
          <span className="sample-badge">{product.statusLabel}</span>
        </div>

        <dl className="pig-overview-grid">
          <div>
            <dt>청약 기간</dt>
            <dd>{product.offering.subscriptionPeriod}</dd>
          </div>
          <div>
            <dt>발행금액</dt>
            <dd>{formatLargeWon(product.offering.issueAmountWon)}</dd>
          </div>
          <div>
            <dt>발행 단위</dt>
            <dd>{product.offering.units.toLocaleString("ko-KR")}좌 · {formatWon(product.offering.unitPriceWon)}</dd>
          </div>
          <div>
            <dt>기초자산</dt>
            <dd>{product.offering.heads.toLocaleString("ko-KR")}두</dd>
          </div>
        </dl>
      </section>

      <section className="content-card" aria-labelledby="pig-farm-history-title">
        <div className="section-heading">
          <div>
            <p className="section-label">농장과 정산 이력</p>
            <h2 className="type-subtitle" id="pig-farm-history-title">이 농장은 이전에도 참여했나요?</h2>
            <p className="section-description">공시에 공개된 농장명과 시군 단위 지역만 사용하며 상세 주소는 표시하지 않습니다.</p>
          </div>
          <span className="sample-badge">공시 기재 정보</span>
        </div>

        <dl className="pig-farm-facts">
          <div>
            <dt>참여 농장</dt>
            <dd>{product.farm.name}</dd>
            <small>{product.farm.region}</small>
          </div>
          <div>
            <dt>입식일</dt>
            <dd>{product.farm.entryDate}</dd>
            <small>{product.offering.heads.toLocaleString("ko-KR")}두 공시</small>
          </div>
          <div>
            <dt>자돈 공급</dt>
            <dd>{product.farm.supplier}</dd>
            <small>발행사 신고서 기재</small>
          </div>
          <div>
            <dt>이전 참여</dt>
            <dd>{product.round === 3 ? "제2호 참여 확인" : product.round === 2 ? "첫 확인 회차" : "첫 발행 회차"}</dd>
            <small>{product.farm.participationHistory}</small>
          </div>
        </dl>

        <div className="pig-settlement-panel">
          <div>
            <span>실제 출하·매각</span>
            <strong>{product.settlement.totalSaleWon === null
              ? "공개 숫자 없음"
              : `${product.settlement.shippedHeads?.toLocaleString("ko-KR")}두 · ${formatLargeWon(product.settlement.totalSaleWon)}`}</strong>
          </div>
          <div>
            <span>DART 기재 수익률</span>
            <strong>{product.settlement.realizedReturnPercent === null
              ? "공개 숫자 없음"
              : formatPercent(product.settlement.realizedReturnPercent)}</strong>
          </div>
          <p>{product.settlement.publicSummary}</p>
          <a href={product.settlement.sourceUrl} target="_blank" rel="noopener noreferrer">근거 공시 보기</a>
        </div>
      </section>

      <PigDiseaseMap
        productName={product.productName}
        farmName={product.farm.name}
        farmRegion={product.farm.region}
      />

      <section className="content-card" aria-labelledby="pig-price-title">
        <div className="section-heading">
          <div>
            <p className="section-label">가격 비교</p>
            <h2 className="type-subtitle" id="pig-price-title">공시 기준가격과 최근 시장 흐름</h2>
            <p className="section-description">같은 탕박·등외제외·제주제외 조건의 월별 공식 통계를 시장 참고값으로 사용합니다.</p>
          </div>
          <span className="sample-badge">시장 참고값</span>
        </div>

        <PigMarketInfographic
          market={market}
          products={allProducts}
          selectedProduct={product}
        />

        <div className="pig-detail-source">
          <a href={market.sourceUrl} target="_blank" rel="noopener noreferrer">축산물 등급별 경락가격 공식 자료</a>
          {correctedDocument ? (
            <a href={getDartDocumentUrl(correctedDocument.rceptNo)} target="_blank" rel="noopener noreferrer">선택 상품 정정신고서</a>
          ) : null}
        </div>
      </section>

      <section className="content-card" aria-labelledby="pig-issuer-title">
        <div className="section-heading">
          <div>
            <p className="section-label">발행사 이력</p>
            <h2 className="type-subtitle" id="pig-issuer-title">데이터젠의 한돈 STO 발행 이력</h2>
            <p className="section-description">DART {dartAsOf} 기준 발행 3회, 최종 정산 결과 확인 1회입니다. 같은 상품의 최초·정정·발행실적 문서를 회차별로 묶었습니다.</p>
          </div>
          <span className="sample-badge">3개 회차</span>
        </div>

        <div className="pig-issuer-history">
          {allProducts.slice().reverse().map((historyProduct) => (
            <article className={historyProduct.id === product.id ? "is-current" : undefined} key={historyProduct.id}>
              <div>
                <span>제{historyProduct.round}호</span>
                <strong>{historyProduct.statusLabel}</strong>
              </div>
              <p>{historyProduct.farm.region} · {historyProduct.offering.heads.toLocaleString("ko-KR")}두 · {formatLargeWon(historyProduct.offering.issueAmountWon)}</p>
              <small>{historyProduct.settlement.completed
                ? `${historyProduct.settlement.completedAt} 정산 · 수익금 ${historyProduct.settlement.profitWon?.toLocaleString("ko-KR")}원`
                : "발행실적 확인 · 최종 정산 숫자는 DART에 없음"}</small>
            </article>
          ))}
        </div>

        <div className="pig-disclosure-difference">
          <strong>원문 간 금액 차이</strong>
          <p>제3호 신고서의 과거 발행내역에는 제2호 모집금액이 218,800,000원으로 적혀 있지만, 제2호 정정신고서와 발행실적보고서는 모두 212,800,000원입니다. 이 화면은 발행실적보고서의 212,800,000원을 사용합니다.</p>
          <div>
            <a href={getDartDocumentUrl("20260624000508")} target="_blank" rel="noopener noreferrer">제3호 정정신고서</a>
            <a href={getDartDocumentUrl("20260528001031")} target="_blank" rel="noopener noreferrer">제2호 발행실적</a>
          </div>
        </div>

        <div className="pig-document-list">
          <h3>선택 회차 공시 원문</h3>
          <ul>
            {product.documents.map((document) => (
              <li key={document.rceptNo}>
                <div>
                  <strong>{document.label}</strong>
                  <span>{document.filedAt} · {document.rceptNo}</span>
                </div>
                <a href={getDartDocumentUrl(document.rceptNo)} target="_blank" rel="noopener noreferrer">원문 보기</a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
