import type { Metadata } from "next";

import { AuctionMarketSection } from "@/components/category/AuctionMarketSection";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import { OFFERS } from "@/components/site/offers";
import { categoryTabFromSearchParam } from "@/lib/content/category-tabs";
import {
  CATTLE_FLOW_LEAD,
  CATTLE_FLOW_STEPS,
  CATTLE_FLOW_TITLE,
  CATTLE_TERMS,
  CATTLE_TERMS_TITLE,
} from "@/lib/content/cattle";
import { CATTLE_CATEGORY } from "@/lib/verify/contract/cattle";
import { loadCattleAuctionSeries } from "@/lib/verify/reference/auction-series";

import category from "@/components/category/category.module.css";

export const metadata: Metadata = {
  title: "한우",
  description: "한우 공모의 공시-공공 원장 대조 확인 현황",
};

const kstMonth = (iso: string): string => iso.slice(0, 7);

function CattleFlowBand() {
  return (
    <>
      <p className={category.slotLead}>{CATTLE_FLOW_LEAD}</p>
      <ol className={category.flowRow}>
        {CATTLE_FLOW_STEPS.map((step) => (
          <li key={step.id} className={category.flowStep}>
            <span className={category.flowName}>{step.name}</span>
            <span className={category.flowLayer}>{step.layer}</span>
            <p className={category.flowCheck}>{step.check}</p>
          </li>
        ))}
      </ol>
      <h3 className={category.groupTitle}>{CATTLE_TERMS_TITLE}</h3>
      <dl className={category.termList}>
        {CATTLE_TERMS.map((item) => (
          <div key={item.term} className={category.termItem}>
            <dt className={category.termName}>{item.term}</dt>
            <dd className={category.termEasy}>{item.easy}</dd>
            <dd className={category.termWhy}>
              {item.why} · 확인 경로:{" "}
              <a href={item.source.url} target="_blank" rel="noopener noreferrer">
                {item.source.label}
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

interface CattlePageProps {
  readonly searchParams: Promise<{ readonly tab?: string | string[] }>;
}

export default async function CattlePage({ searchParams }: CattlePageProps) {
  const [series, params] = await Promise.all([
    loadCattleAuctionSeries(),
    searchParams,
  ]);
  const activeTab = categoryTabFromSearchParam(params.tab);
  const cattleOffers = OFFERS.filter((offer) => offer.assetKind === "livestock");
  const markers = cattleOffers.map((offer) => ({
    month: kstMonth(offer.subscription.opensAt),
    label: offer.title.replace("가축 ", ""),
  }));

  return (
    <CategoryLanding
      categoryId="cattle"
      activeTab={activeTab}
      title="한우"
      lead="공시된 개체를 축산물이력제 원장과 대조하고, 공모가의 시장 위치와 정정 이력을 함께 보여줍니다."
      descriptor={CATTLE_CATEGORY}
      offers={cattleOffers}
      heroImage="/category-cattle.jpg"
      market={<AuctionMarketSection series={series} markers={markers} />}
      customTitle={CATTLE_FLOW_TITLE}
      custom={<CattleFlowBand />}
    />
  );
}
