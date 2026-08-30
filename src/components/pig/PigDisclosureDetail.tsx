import {
  dartDocumentUrl,
  PIG_FARM,
  PIG_ISSUER,
  PIG_OVERVIEW,
  PIG_PRICE,
  PIG_GRADE_BAND,
  PIG_MARKET,
  type PigDisclosureProduct,
} from "@/lib/content/pig";

import { PigDiseaseContext } from "./PigDiseaseContext";
import { PigGradeBandChart } from "./PigGradeBandChart";
import { PigMarketInfographic } from "./PigMarketInfographic";
import s from "./pig.module.css";

interface PigDisclosureDetailProps {
  readonly product: PigDisclosureProduct;
  readonly allProducts: readonly PigDisclosureProduct[];
  readonly dartAsOf: string;
}

const formatWon = (value: number): string => `${value.toLocaleString("ko-KR")}원`;

const formatLargeWon = (value: number): string =>
  `${(value / 100_000_000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}억원`;

const formatPercent = (value: number): string => {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
};

const priorLabel = (round: PigDisclosureProduct["round"]): string => {
  if (round === 3) return PIG_FARM.priorRound3;
  if (round === 2) return PIG_FARM.priorRound2;
  return PIG_FARM.priorRound1;
};

export function PigDisclosureDetail({
  product,
  allProducts,
  dartAsOf,
}: PigDisclosureDetailProps) {
  const correctedDocument = product.documents.find(
    (document) => document.label === "기재정정 신고서",
  );

  return (
    <div className={s.detail} id="pig-detail">
      <section className={s.card} aria-labelledby="pig-overview-title">
        <div className={s.sectionHeading}>
          <div>
            <p className={s.sectionLabel}>{PIG_OVERVIEW.label}</p>
            <h3 className={s.sectionTitle} id="pig-overview-title">
              {product.productName}
            </h3>
            <p className={s.sectionDescription}>{PIG_OVERVIEW.description}</p>
          </div>
          <span className={s.badge}>{product.statusLabel}</span>
        </div>

        <dl className={s.overviewGrid}>
          <div>
            <dt>{PIG_OVERVIEW.subscription}</dt>
            <dd>{product.offering.subscriptionPeriod}</dd>
          </div>
          <div>
            <dt>{PIG_OVERVIEW.amount}</dt>
            <dd>{formatLargeWon(product.offering.issueAmountWon)}</dd>
          </div>
          <div>
            <dt>{PIG_OVERVIEW.unit}</dt>
            <dd>
              {product.offering.units.toLocaleString("ko-KR")}좌 ·{" "}
              {formatWon(product.offering.unitPriceWon)}
            </dd>
          </div>
          <div>
            <dt>{PIG_OVERVIEW.heads}</dt>
            <dd>{product.offering.heads.toLocaleString("ko-KR")}두</dd>
          </div>
        </dl>
      </section>

      <section className={s.card} aria-labelledby="pig-farm-title">
        <div className={s.sectionHeading}>
          <div>
            <p className={s.sectionLabel}>{PIG_FARM.label}</p>
            <h3 className={s.sectionTitle} id="pig-farm-title">
              {PIG_FARM.title}
            </h3>
            <p className={s.sectionDescription}>{PIG_FARM.description}</p>
          </div>
          <span className={s.badge}>{PIG_FARM.badge}</span>
        </div>

        <dl className={s.farmFacts}>
          <div>
            <dt>{PIG_FARM.farmDt}</dt>
            <dd>{product.farm.name}</dd>
            <small className={s.metaLine}>{product.farm.region}</small>
          </div>
          <div>
            <dt>{PIG_FARM.entryDt}</dt>
            <dd>{product.farm.entryDate}</dd>
            <small className={s.metaLine}>
              {product.offering.heads.toLocaleString("ko-KR")}
              {PIG_FARM.headsSuffix}
            </small>
          </div>
          <div>
            <dt>{PIG_FARM.supplierDt}</dt>
            <dd>{product.farm.supplier}</dd>
            <small className={s.metaLine}>{PIG_FARM.supplierNote}</small>
          </div>
          <div>
            <dt>{PIG_FARM.priorDt}</dt>
            <dd>{priorLabel(product.round)}</dd>
            <small className={s.metaLine}>{product.farm.participationHistory}</small>
          </div>
        </dl>

        <div className={s.settlementPanel}>
          <div>
            <span className={s.metaLine}>{PIG_FARM.saleLabel}</span>
            <strong className={s.mono}>
              {product.settlement.totalSaleWon === null
                ? PIG_FARM.saleEmpty
                : `${product.settlement.shippedHeads?.toLocaleString("ko-KR")}두 · ${formatLargeWon(product.settlement.totalSaleWon)}`}
            </strong>
          </div>
          <div>
            <span className={s.metaLine}>{PIG_FARM.returnLabel}</span>
            <strong className={s.mono}>
              {product.settlement.realizedReturnPercent === null
                ? PIG_FARM.returnEmpty
                : formatPercent(product.settlement.realizedReturnPercent)}
            </strong>
          </div>
          <p>{product.settlement.publicSummary}</p>
          <a href={product.settlement.sourceUrl} target="_blank" rel="noopener noreferrer">
            {PIG_FARM.sourceLink}
          </a>
        </div>
      </section>

      <PigDiseaseContext product={product} />

      <section className={s.card} aria-labelledby="pig-price-title">
        <div className={s.sectionHeading}>
          <div>
            <p className={s.sectionLabel}>{PIG_PRICE.label}</p>
            <h3 className={s.sectionTitle} id="pig-price-title">
              {PIG_PRICE.title}
            </h3>
            <p className={s.sectionDescription}>{PIG_PRICE.description}</p>
          </div>
          <span className={s.badge}>{PIG_PRICE.badge}</span>
        </div>

        <PigMarketInfographic
          market={PIG_MARKET}
          products={allProducts}
          selectedProduct={product}
        />

        <div className={s.gradeBandHeading}>
          <span className={s.eyebrow}>{PIG_PRICE.gradeBandEyebrow}</span>
          <h4 className={s.cardHeading}>{PIG_PRICE.gradeBandTitle}</h4>
          <p className={s.sectionDescription}>{PIG_PRICE.gradeBandDescription}</p>
        </div>

        <PigGradeBandChart
          points={PIG_GRADE_BAND.points}
          sourceName={PIG_PRICE.gradeBandSourceName}
          sourceUrl={PIG_GRADE_BAND.sourceUrl}
          retrievedAt={PIG_GRADE_BAND.retrievedAt}
          asOf={PIG_GRADE_BAND.asOf}
          limitation={PIG_GRADE_BAND.limitation}
        />

        <div className={s.sourceRow}>
          <a href={PIG_MARKET.sourceUrl} target="_blank" rel="noopener noreferrer">
            {PIG_PRICE.sourceLink}
          </a>
          {correctedDocument ? (
            <a
              href={dartDocumentUrl(correctedDocument.rceptNo)}
              target="_blank"
              rel="noopener noreferrer"
            >
              선택 상품 정정신고서
            </a>
          ) : null}
        </div>
      </section>

      <section className={s.card} aria-labelledby="pig-issuer-title">
        <div className={s.sectionHeading}>
          <div>
            <p className={s.sectionLabel}>{PIG_ISSUER.label}</p>
            <h3 className={s.sectionTitle} id="pig-issuer-title">
              {PIG_ISSUER.title}
            </h3>
            <p className={s.sectionDescription}>
              {PIG_ISSUER.descriptionPrefix} {dartAsOf} {PIG_ISSUER.descriptionSuffix}
            </p>
          </div>
          <span className={s.badge}>{PIG_ISSUER.badge}</span>
        </div>

        <div className={s.issuerHistory}>
          {[...allProducts]
            .sort((left, right) => left.round - right.round)
            .map((historyProduct) => (
              <article
                className={
                  historyProduct.id === product.id ? s.issuerRowCurrent : s.issuerRow
                }
                key={historyProduct.id}
              >
                <div className={s.issuerRowTop}>
                  <span>제{historyProduct.round}호</span>
                  <strong>{historyProduct.statusLabel}</strong>
                </div>
                <p className={s.metaLine}>
                  {historyProduct.farm.region} ·{" "}
                  {historyProduct.offering.heads.toLocaleString("ko-KR")}두 ·{" "}
                  {formatLargeWon(historyProduct.offering.issueAmountWon)}
                </p>
                <small className={s.metaLine}>
                  {historyProduct.settlement.completed
                    ? `${historyProduct.settlement.completedAt} ${PIG_ISSUER.completedNote} ${historyProduct.settlement.profitWon?.toLocaleString("ko-KR")}원`
                    : PIG_ISSUER.pendingNote}
                </small>
              </article>
            ))}
        </div>

        <div className={s.differenceBlock}>
          <strong>{PIG_ISSUER.differenceHeading}</strong>
          <p>{PIG_ISSUER.differenceBody}</p>
          <div className={s.sourceRow}>
            <a
              href={dartDocumentUrl("20260624000508")}
              target="_blank"
              rel="noopener noreferrer"
            >
              {PIG_ISSUER.diffLinkA}
            </a>
            <a
              href={dartDocumentUrl("20260528001031")}
              target="_blank"
              rel="noopener noreferrer"
            >
              {PIG_ISSUER.diffLinkB}
            </a>
          </div>
        </div>

        <div className={s.documentList}>
          <h4>{PIG_ISSUER.documentsHeading}</h4>
          <ul>
            {product.documents.map((document) => (
              <li key={document.rceptNo}>
                <div>
                  <strong>{document.label}</strong>
                  <span className={s.mono}>
                    {document.filedAt} · {document.rceptNo}
                  </span>
                </div>
                <a
                  href={dartDocumentUrl(document.rceptNo)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {PIG_ISSUER.documentLink}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
