"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { formatKrw, unexplainedDifference } from "@/lib/art/calculations";
import type { ArtProduct } from "@/lib/art/product-model";
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
  ART_GALLERY_COUNT_UNIT,
  ART_GALLERY_LEAD,
  ART_GALLERY_SELECT_SUFFIX,
  ART_GALLERY_TITLE,
  ART_HISTORICAL_NOTE,
  ART_IMAGE_ALT_SUFFIX,
  ART_IMAGE_FALLBACK_PREFIX,
  ART_IMAGE_GALLERY_NOTE,
  ART_IMAGE_LOAD_FAILED,
  ART_IMAGE_MISSING,
  ART_IMAGE_SOURCE_LINK,
  ART_IMAGE_SOURCE_MISSING,
} from "@/lib/content/art";
import { VERDICT_CAPTIONS } from "@/lib/content/verdict-captions";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";

import { ArtCompareSection } from "./ArtCompareSection";
import { ArtEvidenceCopilot } from "./ArtEvidenceCopilot";
import { OfferingComparisonChart, OfferingCompositionChart } from "./OfferingCharts";
import s from "./art.module.css";

const VERDICT_CHIP_CLASS: Record<
  ArtProduct["assessment"]["verdict"],
  string
> = {
  match: s.verdictMatch,
  mismatch: s.verdictMiss,
  unverifiable: s.verdictUnknown,
};

const subscribeToLocation = (onStoreChange: () => void) => {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
};

export function parseArtProductParam(
  search: string,
  validIds: ReadonlySet<string>,
  fallback: string,
): string {
  const selected = new URLSearchParams(search).get("product");
  return selected && validIds.has(selected) ? selected : fallback;
}

export function canonicalArtProductUrl(href: string, productId: string): string {
  const url = new URL(href);
  if (productId) url.searchParams.set("product", productId);
  else url.searchParams.delete("product");
  return `${url.pathname}${url.search}${url.hash}`;
}

function replaceProductParam(productId: string): void {
  window.history.replaceState(
    window.history.state,
    "",
    canonicalArtProductUrl(window.location.href, productId),
  );
}

function compositionCheckText(product: ArtProduct): string {
  if (
    product.art.acquisitionWon === null ||
    product.art.issuanceCostWon === null
  )
    return ART_CHECK_NONE;
  const diff = unexplainedDifference(
    product.offering.amountWon,
    product.art.acquisitionWon,
    [
      {
        category: "issuance",
        label: "발행비용",
        amount: product.art.issuanceCostWon,
      },
    ],
  );
  return `취득가 ${formatKrw(product.art.acquisitionWon)} + 발행비용 ${formatKrw(
    product.art.issuanceCostWon,
  )} = 공모가 ${formatKrw(product.offering.amountWon)} · 차액 ${(
    diff ?? 0
  ).toLocaleString("ko-KR")}원`;
}

function ArtFactCard({ product }: { product: ArtProduct }) {
  const { art, assessment, evidence, offering } = product;
  return (
    <article id={`art-product-${product.id}`} className={s.factCard}>
      <span className={s.factCardHead}>
        <span className={s.factLabel}>{product.label}</span>
        <span
          className={`${s.verdictChip} ${VERDICT_CHIP_CLASS[assessment.verdict]}`}
        >
          {VERDICT_LABEL[assessment.verdict]}
        </span>
      </span>
      <p className={s.factStatusNote}>{assessment.statusNote}</p>
      <dl className={s.factMetaRow}>
        <div className={s.factMeta}>
          <dt>공모금액</dt>
          <dd>{formatKrw(offering.amountWon)}</dd>
        </div>
        <div className={s.factMeta}>
          <dt>기준일</dt>
          <dd>{art.asOf}</dd>
        </div>
        <div className={s.factMeta}>
          <dt>상태</dt>
          <dd>{art.lifecycle}</dd>
        </div>
      </dl>
      <p className={s.priceChain}>{assessment.priceChain}</p>
      <p className={s.factFinding}>{assessment.finding}</p>
      {evidence.length > 0 ? (
        <ul className={s.factSources}>
          {evidence.map((source) => (
            <li key={source.id}>
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
        <p className={s.sourceEmpty}>{assessment.sourceNote}</p>
      )}
      <details className={s.detail}>
        <summary className={s.detailToggle}>{ART_DETAIL_TOGGLE}</summary>
        <dl className={s.detailBody}>
          <div className={s.detailBlock}>
            <dt>{ART_DETAIL_DOC_LABEL}</dt>
            {evidence.length > 0 ? (
              evidence.map((source) => (
                <dd key={source.id} className={s.detailMono}>
                  {source.label} · 접수번호 {source.rcpNo} · {source.asOf}
                </dd>
              ))
            ) : (
              <dd>{assessment.sourceNote}</dd>
            )}
          </div>
          <div className={s.detailBlock}>
            <dt>{ART_DETAIL_CHECK_LABEL}</dt>
            <dd className={s.detailMono}>{compositionCheckText(product)}</dd>
          </div>
          <div className={s.detailBlock}>
            <dt>{ART_DETAIL_CHAIN_LABEL}</dt>
            <dd className={s.detailMono}>{assessment.priceChain}</dd>
          </div>
          <div className={s.detailBlock}>
            <dt>{ART_DETAIL_LIMIT_LABEL}</dt>
            <dd>{assessment.limitation}</dd>
          </div>
          <div className={s.detailBlock}>
            <dt>{ART_DETAIL_CAPTION_LABEL}</dt>
            <dd>
              {VERDICT_LABEL[assessment.verdict]} —{" "}
              {VERDICT_CAPTIONS[assessment.verdict]}
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

function ArtProductImage({
  product,
  sequence,
}: {
  readonly product: ArtProduct;
  readonly sequence: number;
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const officialMedia =
    product.media.imageType === "official_remote" && !loadFailed
      ? product.media
      : null;

  return (
    <span className={s.productImage}>
      {officialMedia ? (
        <Image
          src={officialMedia.imageUrl}
          alt={`${product.label} ${ART_IMAGE_ALT_SUFFIX}`}
          fill
          sizes="(max-width: 40rem) 44vw, (max-width: 56.25rem) 30vw, (max-width: 72rem) 24vw, 180px"
          onError={() => setLoadFailed(true)}
        />
      ) : (
        <span className={s.productImageFallback} aria-hidden="true">
          <strong>
            {ART_IMAGE_FALLBACK_PREFIX} {String(sequence).padStart(2, "0")}
          </strong>
          <span>
            {loadFailed ? ART_IMAGE_LOAD_FAILED : ART_IMAGE_MISSING}
          </span>
        </span>
      )}
    </span>
  );
}

interface ArtFactsSectionProps {
  readonly products: readonly ArtProduct[];
  readonly initialProductId?: string;
}

export function ArtFactsSection({
  products,
  initialProductId = "",
}: ArtFactsSectionProps) {
  const validIds = useMemo(
    () => new Set(products.map((product) => product.id)),
    [products],
  );
  const fallbackProductId = validIds.has(initialProductId)
    ? initialProductId
    : (products[0]?.id ?? "");
  const selectedProductId = useSyncExternalStore(
    subscribeToLocation,
    () =>
      parseArtProductParam(
        window.location.search,
        validIds,
        fallbackProductId,
      ),
    () => fallbackProductId,
  );
  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? products[0];

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("product");
    if (raw && raw !== selectedProductId) {
      replaceProductParam(selectedProductId);
    }
  }, [selectedProductId]);

  const selectProduct = (productId: string) => {
    if (!validIds.has(productId)) return;
    replaceProductParam(productId);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div>
      <p className={s.factLead}>{ART_FACT_LEAD}</p>
      <p className={s.absenceNote}>{ART_ABSENCE_NOTE}</p>

      <section className={s.productGallery} aria-labelledby="art-product-gallery">
        <div className={s.productGalleryHead}>
          <div>
            <h3 id="art-product-gallery" className={s.subhead}>
              {ART_GALLERY_TITLE}
            </h3>
            <p className={s.compareLead}>{ART_GALLERY_LEAD}</p>
          </div>
          <span>
            {products.length}
            {ART_GALLERY_COUNT_UNIT}
          </span>
        </div>
        <ul className={s.productImageGrid}>
          {products.map((product, index) => {
            const selected = product.id === selectedProduct?.id;
            return (
              <li key={product.id} className={s.productImageItem}>
                <button
                  type="button"
                  className={s.productImageButton}
                  aria-label={`${product.label} ${ART_GALLERY_SELECT_SUFFIX}`}
                  aria-pressed={selected}
                  aria-controls="art-selected-product evidence-copilot"
                  onClick={() => selectProduct(product.id)}
                >
                  <ArtProductImage product={product} sequence={index + 1} />
                  <span className={s.productImageMeta}>
                    <strong>{product.label}</strong>
                    <span>{product.assessment.statusNote}</span>
                  </span>
                </button>
                {product.media.sourcePageUrl ? (
                  <a
                    className={s.productImageSource}
                    href={product.media.sourcePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ART_IMAGE_SOURCE_LINK}
                  </a>
                ) : (
                  <span className={s.productImageSourceMissing}>
                    {ART_IMAGE_SOURCE_MISSING}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className={s.productImageNote}>{ART_IMAGE_GALLERY_NOTE}</p>
      </section>

      <div id="art-selected-product" className={s.selectedFact} aria-live="polite">
        {selectedProduct ? (
          <ArtFactCard key={selectedProduct.id} product={selectedProduct} />
        ) : null}
      </div>

      <section className={s.artSub} aria-labelledby="art-charts">
        <h3 id="art-charts" className={s.subhead}>
          {ART_CHART_SECTION_TITLE}
        </h3>
        <p className={s.chartSectionLead}>{ART_CHART_SECTION_LEAD}</p>
        <div className={s.chartPair}>
          <OfferingCompositionChart products={products} />
          <OfferingComparisonChart products={products} />
        </div>
      </section>

      <section className={s.artSub} aria-labelledby="art-compare">
        <h3 id="art-compare" className={s.subhead}>
          {ART_COMPARE_TITLE}
        </h3>
        <p className={s.compareLead}>{ART_COMPARE_LEAD}</p>
        <ArtCompareSection products={products} />
      </section>

      <ArtCalcBlock />

      <ArtEvidenceCopilot
        key={selectedProduct?.id ?? "empty"}
        products={products.map(({ id, label }) => ({ id, label }))}
        selectedProductId={selectedProduct?.id ?? ""}
        onSelectedProductIdChange={selectProduct}
      />

      <p className={s.historicalNote}>{ART_HISTORICAL_NOTE}</p>
    </div>
  );
}
