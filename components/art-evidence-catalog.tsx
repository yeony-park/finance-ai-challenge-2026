import type { ArtEvidenceStatus } from "@/data/art-evidence";
import {
  artPlatformSnapshots,
  artProductSnapshots,
  artSnapshotLineage,
} from "@/data/art-evidence";

const statusLabels: Record<ArtEvidenceStatus, string> = {
  verified: "핵심 근거 확인",
  mismatch: "원문 간 차이",
  review: "추가 대조 필요",
  missing: "핵심 자료 미확인",
  stale: "현재성 재확인",
};

const reviewPrinciples = [
  {
    number: "01",
    title: "공시 주장을 나눕니다",
    description: "가격, 작품 식별, 보유·보험, 처분 조건을 서로 다른 확인 항목으로 분리합니다.",
  },
  {
    number: "02",
    title: "외부 원문과 대조합니다",
    description: "발행사 설명만 반복하지 않고 DART, 경매 원문과 독립 증빙을 함께 연결합니다.",
  },
  {
    number: "03",
    title: "정정과 현재성을 남깁니다",
    description: "최초·정정 공시와 최근 검증일을 보존해 언제 무엇이 달라졌는지 추적합니다.",
  },
  {
    number: "04",
    title: "모르면 질문으로 돌려줍니다",
    description: "자료가 부족한 항목은 추정하지 않고 발행사에 확인할 다음 질문으로 남깁니다.",
  },
];

function formatKrw(amount: number) {
  return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
}

export function ArtEvidenceCatalog() {
  return (
    <>
      <section className="content-card art-catalog" aria-labelledby="art-catalog-title">
        <div className="section-heading">
          <div>
            <p className="section-label">Disclosure gallery</p>
            <h2 className="type-subtitle" id="art-catalog-title">공모 완료·운용 추적 미술품</h2>
            <p className="section-description">
              현재 진행·예정 청약은 0건입니다. 아래는 발행 이후 공시와 외부 근거를 계속 확인할 5개 상품의 저장본입니다.
            </p>
          </div>
          <span className="branch-badge">현석 자료 반영 · {artSnapshotLineage.commit}</span>
        </div>

        <div className="art-catalog-notice">
          <span>현재 진행·예정 청약</span>
          <strong>0건 확인</strong>
          <p>DART·투게더아트·아트앤가이드 공개 목록 · 2026. 8. 15.</p>
          <div className="art-catalog-source-links" aria-label="현재 청약 확인 출처">
            <a href="https://dart.fss.or.kr/dsac005/main.do" target="_blank" rel="noopener noreferrer">DART</a>
            <a href="https://weshareart.com/goods/subscription/list" target="_blank" rel="noopener noreferrer">투게더아트</a>
            <a href="https://artnguide.co.kr/group-sale/list" target="_blank" rel="noopener noreferrer">아트앤가이드</a>
          </div>
        </div>

        <div className="art-gallery-grid">
          {artProductSnapshots.map((product, index) => (
            <article className="art-product-card" key={product.id}>
              <figure className="art-card-visual">
                {product.imageUrl && product.imageSourceUrl ? (
                  <a
                    className="art-card-frame has-image"
                    href={product.imageSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundImage: `url("${product.imageUrl}")` }}
                    aria-label={`${product.artist} ${product.artworkTitle} 공식 상품 이미지 원문 보기`}
                  >
                    <span>OFFICIAL IMAGE</span>
                    <small className="art-card-image-link">원문 보기 ↗</small>
                  </a>
                ) : (
                  <div className="art-card-frame">
                    <span>ART {String(index + 1).padStart(2, "0")}</span>
                    <strong>{product.artist}</strong>
                    <small>{product.artworkTitle}</small>
                  </div>
                )}
                <figcaption>
                  {product.imageUrl ? "공식 플랫폼 제공 이미지 · 원문 연결" : "작품 이미지가 아닌 식별용 표지입니다."}
                </figcaption>
              </figure>

              <div className="art-card-body">
                <div className="art-card-topline">
                  <span>{product.issuer}</span>
                  <strong className={`status-chip ${product.status}`}>
                    {statusLabels[product.status]}
                  </strong>
                </div>
                <h3>{product.name}</h3>
                <p className="artwork-detail">{product.artworkDetail}</p>

                <dl className="art-card-facts">
                  <div>
                    <dt>총 공모금액</dt>
                    <dd>{formatKrw(product.offeringAmount)}</dd>
                  </div>
                  <div>
                    <dt>검토 기준일</dt>
                    <dd>{product.asOf}</dd>
                  </div>
                </dl>

                <p className="art-card-price-chain">
                  <span>가격 연결</span>
                  {product.priceChain}
                </p>

                <div className="art-card-review">
                  <span>{product.statusLabel}</span>
                  <p>{product.finding}</p>
                  <small><strong>남은 확인</strong> {product.limitation}</small>
                </div>

                <p className="art-card-lifecycle">{product.lifecycle}</p>
                <div className="art-source-links" aria-label={`${product.name} 출처`}>
                  {product.sources.map((source) => (
                    <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.label}<small>{source.asOf}</small>
                    </a>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="content-card art-review-method" aria-labelledby="art-review-method-title">
        <div className="section-heading">
          <div>
            <p className="section-label">After discovery</p>
            <h2 className="type-subtitle" id="art-review-method-title">모아본 다음, 공시를 다시 확인합니다</h2>
          </div>
          <p className="type-sub-text">수익률 순위가 아니라 주장별 근거 상태와 다음 확인 항목을 보여줍니다.</p>
        </div>
        <div className="art-review-grid">
          {reviewPrinciples.map((item) => (
            <article key={item.number}>
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-card platform-snapshot" aria-labelledby="platform-snapshot-title">
        <div className="section-heading">
          <div>
            <p className="section-label">Platform background records</p>
            <h2 className="type-subtitle" id="platform-snapshot-title">플랫폼 공개 이력 저장본 338건</h2>
          </div>
          <p className="type-sub-text">상품 검증 결과가 아니라 발행사·플랫폼 이력을 검토하기 위한 배경자료입니다.</p>
        </div>
        <div className="platform-snapshot-grid">
          {artPlatformSnapshots.map((snapshot) => (
            <article key={snapshot.platform}>
              <span>{snapshot.platform}</span>
              <strong>{snapshot.count}건</strong>
              <small>수집 기준 {snapshot.asOf}</small>
              <p>{snapshot.limitation}</p>
            </article>
          ))}
        </div>
        <p className="snapshot-warning">
          세 저장본은 플랫폼이 공개한 상태·금액·일자를 보존한 자료입니다. 작품 동일성, 법적 발행사, 실제 청산 여부가 확인되지 않은 값을 자동으로 합산하거나 투자성과로 표시하지 않습니다.
        </p>
      </section>
    </>
  );
}
