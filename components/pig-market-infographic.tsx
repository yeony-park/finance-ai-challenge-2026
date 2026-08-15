import type { PigDisclosureProduct } from "@/data/pig-disclosure";
import type { PigMarketSnapshot } from "@/lib/pig/pig-market";

type PigMarketInfographicProps = {
  market: PigMarketSnapshot;
  products: PigDisclosureProduct[];
  selectedProduct: PigDisclosureProduct;
};

function formatChangePercent(value: number) {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

function formatCompactWon(value: number) {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}억원`;
  }

  return `${value.toLocaleString("ko-KR")}원`;
}

export function PigMarketInfographic({
  market,
  products,
  selectedProduct,
}: PigMarketInfographicProps) {
  const firstPoint = market.points[0];
  const latestPoint = market.points.at(-1);

  if (!firstPoint || !latestPoint) return null;

  const chartWidth = 640;
  const chartHeight = 220;
  const plot = { left: 10, right: 10, top: 20, bottom: 18 };
  const plotWidth = chartWidth - plot.left - plot.right;
  const plotHeight = chartHeight - plot.top - plot.bottom;
  const prices = market.points.map((point) => point.priceWonPerKg);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const axisMin = Math.floor((minPrice - 50) / 50) * 50;
  const axisMax = Math.ceil((maxPrice + 50) / 50) * 50;
  const axisRange = Math.max(axisMax - axisMin, 1);
  const xFor = (index: number) => plot.left + plotWidth * ((index + 0.5) / market.points.length);
  const yFor = (value: number) => plot.top + ((axisMax - value) / axisRange) * plotHeight;
  const chartPoints = market.points.map((point, index) => ({
    ...point,
    x: xFor(index),
    y: yFor(point.priceWonPerKg),
  }));
  const linePath = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const ticks = [axisMax, axisMin + axisRange / 2, axisMin];
  const change = ((latestPoint.priceWonPerKg / firstPoint.priceWonPerKg) - 1) * 100;
  const priceDelta = Math.round(latestPoint.priceWonPerKg - firstPoint.priceWonPerKg);
  const selectedGapWon = Math.round(latestPoint.priceWonPerKg - selectedProduct.pricing.baselinePriceWonPerKg);
  const selectedGapPercent = (selectedGapWon / selectedProduct.pricing.baselinePriceWonPerKg) * 100;
  const volumeMax = Math.max(...market.points.map((point) => point.headCount));
  const orderedProducts = products.slice().sort((left, right) => left.round - right.round);
  const roundPrices = orderedProducts.map((product) => product.pricing.baselinePriceWonPerKg);
  const roundScaleMin = Math.floor((Math.min(...roundPrices) - 150) / 250) * 250;
  const roundScaleMax = Math.ceil((Math.max(...roundPrices) + 150) / 250) * 250;
  const roundScaleRange = Math.max(roundScaleMax - roundScaleMin, 1);

  return (
    <div className="pig-price-dashboard">
      <article className="pig-market-card">
        <header className="pig-market-card-header">
          <div>
            <span className="pig-market-eyebrow">시장 흐름 · 2026.05–07</span>
            <h3>최근 3개월 돼지 경락가격</h3>
            <p>{market.filters.skinType} · {market.filters.grade} · {market.filters.region}</p>
          </div>
          <div className="pig-market-latest">
            <span>7월 월평균</span>
            <strong>
              {Math.round(latestPoint.priceWonPerKg).toLocaleString("ko-KR")}
              <small>원/kg</small>
            </strong>
            <p>
              5월보다 {Math.abs(priceDelta).toLocaleString("ko-KR")}원 {priceDelta < 0 ? "낮음" : "높음"}
              <b>{formatChangePercent(change)}</b>
            </p>
          </div>
        </header>

        <figure className="pig-market-figure">
          <div className="pig-market-scale-note">
            가격 차이를 보기 위한 확대 축 · {axisMin.toLocaleString("ko-KR")}~{axisMax.toLocaleString("ko-KR")}원/kg
          </div>

          <div className="pig-market-chart-body">
            <div className="pig-market-y-axis" aria-hidden="true">
              {ticks.map((tick) => <span key={tick}>{Math.round(tick).toLocaleString("ko-KR")}</span>)}
            </div>
            <svg
              className="pig-market-line"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-labelledby="pig-market-chart-title pig-market-chart-description"
            >
              <title id="pig-market-chart-title">2026년 5월부터 7월까지 돼지 경락가격 변화</title>
              <desc id="pig-market-chart-description">
                {market.points.map((point) => `${Number(point.month.slice(-2))}월 ${Math.round(point.priceWonPerKg).toLocaleString("ko-KR")}원`).join(", ")}
              </desc>
              {ticks.map((tick) => {
                const y = yFor(tick);
                return (
                  <line
                    key={tick}
                    x1={plot.left}
                    x2={chartWidth - plot.right}
                    y1={y}
                    y2={y}
                    fill="none"
                    stroke="#e8e8e8"
                    strokeDasharray="5 8"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              {chartPoints.map((point) => (
                <line
                  key={`${point.month}-guide`}
                  x1={point.x}
                  x2={point.x}
                  y1={point.y}
                  y2={chartHeight - plot.bottom}
                  fill="none"
                  stroke="#c9e0fc"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path
                d={linePath}
                fill="none"
                stroke="#024ad8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
                vectorEffect="non-scaling-stroke"
              />
              {chartPoints.map((point, index) => (
                <circle
                  key={point.month}
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill={index === chartPoints.length - 1 ? "#024ad8" : "#ffffff"}
                  stroke="#024ad8"
                  strokeWidth="4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>

          <div className="pig-market-months" role="list" aria-label="월별 경락가격과 경락두수">
            {market.points.map((point, index) => (
              <div className={index === market.points.length - 1 ? "is-latest" : undefined} role="listitem" key={point.month}>
                <span>{Number(point.month.slice(-2))}월</span>
                <strong>{Math.round(point.priceWonPerKg).toLocaleString("ko-KR")}원/kg</strong>
                <div className="pig-volume-bar" aria-hidden="true">
                  <i style={{ width: `${(point.headCount / volumeMax) * 100}%` }} />
                </div>
                <small>경락 {point.headCount.toLocaleString("ko-KR")}두</small>
              </div>
            ))}
          </div>
        </figure>

        <footer className="pig-market-caption">
          공식 월별 집계이며 개별 돼지의 실제 판매가격이 아닙니다. 가격선과 경락두수 막대는 서로 다른 단위를 사용합니다.
        </footer>
      </article>

      <article className="pig-selected-price-card">
        <header className="pig-side-card-heading">
          <div>
            <span>선택 상품과 비교</span>
            <h3>제{selectedProduct.round}호 공시 기준가</h3>
          </div>
          <em>선택</em>
        </header>

        <div className="pig-selected-price-value">
          <strong>{selectedProduct.pricing.baselinePriceWonPerKg.toLocaleString("ko-KR")}</strong>
          <span>원/kg</span>
          <small>{selectedProduct.pricing.baselineMonth} 기준</small>
        </div>

        <div className="pig-price-reference-row">
          <div>
            <span>2026-07 시장 월평균</span>
            <strong>{Math.round(latestPoint.priceWonPerKg).toLocaleString("ko-KR")}원/kg</strong>
          </div>
          <div>
            <span>참고 차이</span>
            <strong>{selectedGapWon > 0 ? "+" : ""}{selectedGapWon.toLocaleString("ko-KR")}원 · {formatChangePercent(selectedGapPercent)}</strong>
          </div>
        </div>

        <p className="pig-selected-price-caution">
          기준월이 달라 가격 적정성이나 회차의 유불리를 판정하는 비교가 아닙니다.
        </p>

        <dl className="pig-pricing-facts">
          <div>
            <dt>자돈 산식</dt>
            <dd>기준가 × {selectedProduct.pricing.purchaseMultiplier}</dd>
          </div>
          <div>
            <dt>자돈 평균가</dt>
            <dd>{selectedProduct.pricing.averagePigletPriceWon.toLocaleString("ko-KR")}원/두</dd>
          </div>
          <div>
            <dt>평균 입식체중</dt>
            <dd>{selectedProduct.pricing.averageEntryWeightKg.toLocaleString("ko-KR")}kg</dd>
          </div>
          <div>
            <dt>실제 매입액</dt>
            <dd>{formatCompactWon(selectedProduct.pricing.pigletPurchaseAmountWon)}</dd>
          </div>
        </dl>
      </article>

      <article className="pig-round-price-card">
        <header className="pig-side-card-heading">
          <div>
            <span>회차별 기준가격</span>
            <h3>공시에 사용된 시장 기준가</h3>
          </div>
          <small>기준월 서로 다름</small>
        </header>

        <div className="pig-round-prices" role="list" aria-label="제1호부터 제3호까지 공시 기준가격">
          {orderedProducts.map((product) => {
            const isSelected = product.id === selectedProduct.id;
            const position = ((product.pricing.baselinePriceWonPerKg - roundScaleMin) / roundScaleRange) * 100;

            return (
              <div className={isSelected ? "pig-round-price is-selected" : "pig-round-price"} role="listitem" key={product.id}>
                <div className="pig-round-price-label">
                  <div>
                    <strong>제{product.round}호</strong>
                    {isSelected ? <em>선택</em> : null}
                  </div>
                  <span>{product.pricing.baselineMonth}</span>
                  <b>{product.pricing.baselinePriceWonPerKg.toLocaleString("ko-KR")}원/kg</b>
                </div>
                <div className="pig-round-price-range" aria-hidden="true">
                  <i style={{ left: `${position}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pig-round-scale" aria-hidden="true">
          <span>{roundScaleMin.toLocaleString("ko-KR")}</span>
          <span>{roundScaleMax.toLocaleString("ko-KR")}원/kg</span>
        </div>
      </article>
    </div>
  );
}
