import Link from "next/link";
import type { PigDisclosureProduct } from "@/data/pig-disclosure";

type PigDisclosureGalleryProps = {
  products: PigDisclosureProduct[];
  selectedProductId: PigDisclosureProduct["id"];
};

function formatWon(value: number) {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2).replace(/\.00$/, "")}억원`;
  }

  return `${value.toLocaleString("ko-KR")}원`;
}

export function PigDisclosureGallery({ products, selectedProductId }: PigDisclosureGalleryProps) {
  return (
    <section className="content-card pig-disclosure-gallery" aria-labelledby="pig-disclosure-gallery-title">
      <div className="section-heading">
        <div>
          <p className="section-label">최근 상품</p>
          <h2 className="type-subtitle" id="pig-disclosure-gallery-title">최근 발행된 한돈 STO 3개 회차</h2>
          <p className="section-description">회차를 선택하면 농장·가격·질병 지역·발행사 이력이 한 화면에서 바뀝니다.</p>
        </div>
        <span className="sample-badge">DART 공시 기준</span>
      </div>

      <div className="pig-disclosure-grid">
        {products.map((product) => {
          const isSelected = product.id === selectedProductId;

          return (
            <Link
              className={`pig-disclosure-card${isSelected ? " is-active" : ""}`}
              href={`/livestock/pig?product=${product.id}#product-detail`}
              aria-current={isSelected ? "page" : undefined}
              key={product.id}
            >
              <div className="pig-disclosure-card-topline">
                <span>제{product.round}호</span>
                <em>{product.statusLabel}</em>
              </div>
              <h3>{product.productName}</h3>
              <p>{product.farm.region} · {product.farm.name}</p>
              <dl>
                <div>
                  <dt>기초자산</dt>
                  <dd>{product.offering.heads.toLocaleString("ko-KR")}두</dd>
                </div>
                <div>
                  <dt>발행금액</dt>
                  <dd>{formatWon(product.offering.issueAmountWon)}</dd>
                </div>
              </dl>
              <small className="pig-disclosure-card-note">
                {product.settlement.realizedReturnPercent === null
                  ? "최종 매각금액·수익률은 DART에서 확인되지 않음"
                  : `DART 기재 수익률 ${product.settlement.realizedReturnPercent.toFixed(1)}%`}
              </small>
              <span className="pig-disclosure-card-cta">{isSelected ? "선택됨" : "상세 보기"}<b aria-hidden="true">→</b></span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
