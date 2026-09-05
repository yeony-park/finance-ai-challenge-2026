"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type { PigDisclosureProduct } from "@/lib/content/pig";

import { PigDisclosureDetail } from "./PigDisclosureDetail";
import { PigReviewSections } from "./PigReviewSections";
import s from "./pig.module.css";

const tabs = [
  { id: "review", label: "검토 요약", anchor: "#pig-review" },
  { id: "detail", label: "공시 상세", anchor: "#pig-detail" },
] as const;

type PigAnalysisTab = (typeof tabs)[number]["id"];

const tabForHash = (hash: string): PigAnalysisTab =>
  hash === "#pig-detail" ? "detail" : "review";

const formatLargeWon = (value: number): string =>
  `${(value / 100_000_000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}억원`;

export function PigProductAnalysis({
  product,
  allProducts,
  dartAsOf,
}: {
  readonly product: PigDisclosureProduct;
  readonly allProducts: readonly PigDisclosureProduct[];
  readonly dartAsOf: string;
}) {
  const [activeTab, setActiveTab] = useState<PigAnalysisTab>("review");

  useEffect(() => {
    const syncFromHash = () => setActiveTab(tabForHash(window.location.hash));
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const selectTab = (tab: (typeof tabs)[number]) => {
    setActiveTab(tab.id);
    window.history.replaceState(window.history.state, "", tab.anchor);
  };

  const facts = [
    { label: "청약 기간", value: product.offering.subscriptionPeriod },
    { label: "총 공모금액", value: formatLargeWon(product.offering.issueAmountWon) },
    {
      label: "발행 단위",
      value: `${product.offering.units.toLocaleString("ko-KR")}좌 · ${product.offering.unitPriceWon.toLocaleString("ko-KR")}원`,
    },
    { label: "사육두수", value: `${product.offering.heads.toLocaleString("ko-KR")}두` },
    { label: "농장", value: `${product.farm.name} · ${product.farm.region}` },
    { label: "발행일", value: product.offering.issuedAt },
  ];

  return (
    <section className={s.productAnalysis} id="pig-product-analysis">
      <header className={s.productHeader}>
        <div className={s.productImage}>
          <Image
            src="/category-pig.jpg"
            alt="한돈 분석 대표 이미지"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 42vw"
          />
        </div>
        <div className={s.productCopy}>
          <span className={s.productStatus}>{product.statusLabel}</span>
          <h2>{product.productName}</h2>
          <p>{product.farm.name} · {product.farm.region}</p>
          <dl className={s.productFacts}>
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <nav className={s.productTabs} aria-label="한돈 분석 항목" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-controls={`pig-${tab.id}-panel`}
            aria-selected={activeTab === tab.id}
            className={
              activeTab === tab.id
                ? `${s.productTab} ${s.productTabActive}`
                : s.productTab
            }
            id={`pig-${tab.id}-tab`}
            key={tab.id}
            onClick={() => selectTab(tab)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div
        aria-labelledby="pig-review-tab"
        hidden={activeTab !== "review"}
        id="pig-review-panel"
        role="tabpanel"
      >
        <PigReviewSections product={product} />
      </div>
      <div
        aria-labelledby="pig-detail-tab"
        hidden={activeTab !== "detail"}
        id="pig-detail-panel"
        role="tabpanel"
      >
        <PigDisclosureDetail
          allProducts={allProducts}
          dartAsOf={dartAsOf}
          product={product}
        />
      </div>
    </section>
  );
}
