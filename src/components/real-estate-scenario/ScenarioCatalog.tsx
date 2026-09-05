import Link from "next/link";

import { CategoryOfferCard, CategoryOfferCardGrid } from "@/components/landing/CategoryOfferCard";
import { OfferWatchIconButton } from "@/components/landing/OfferWatchControl";
import type { SubscriptionPhase } from "@/components/site/offers";
import { ANALYSIS_CARD_COPY } from "@/lib/content/analysis-cards";
import { CATEGORY_TAB_COPY } from "@/lib/content/category-tabs";
import { evaluateScenarioReview } from "@/lib/knowledge/scenario-review";
import {
  calculateCompletionMetrics,
  type ScenarioOffer,
} from "@/lib/knowledge/schema";

import { scenarioSubscriptionPhase } from "./scenario-catalog-status";
import cards from "@/components/landing/landing.module.css";
import base from "@/components/category/category.module.css";
import s from "./scenario.module.css";

export const PHASE_LABEL: Readonly<Record<ScenarioOffer["offering"]["phase"], string>> = {
  "subscription-open": CATEGORY_TAB_COPY.open,
  "listed-trading": "청약 종료 · 거래 중",
  settled: "청약 종료 · 정산 완료",
};

export const formatWon = (value: number): string =>
  value >= 100_000_000
    ? `${(value / 100_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억원`
    : `${value.toLocaleString("ko-KR")}원`;

export const formatDate = (value: string): string => value.replaceAll("-", ". ");

const REVIEW_TERM_LABEL: Readonly<Record<string, string>> = {
  "건물 기본정보 원장 대조": "건물 기본정보와 건축물대장 확인",
  "현재 연결된 근거 범위에서": "현재 연결된 공개정보에서",
  "현재 공개 근거 범위": "현재 공개정보 범위",
  "판정 근거 부족": "확인 자료 부족",
  "공식 주소정보로 정확 지번을 확인한 뒤 표제부 1회 조회 결과에서 후보 건물명·도로명이 일치하는 레코드를 연결": "주소와 건물명이 일치하는 건축물대장 공개정보를 확인",
  "현재 상품을 제외한 운영그룹 전체 완료 모집단": "현재 상품을 제외한 운영그룹 완료 사례 전체",
  "후보별 BuildingHUB 정확 레코드": "입력 주소별 건축물대장 공개정보의 동일 건물",
  "BuildingHUB 표제부의 정확 레코드": "건축물대장 공개정보의 동일 건물",
  "후보 주소만으로": "입력된 주소만으로",
  "대조할 시나리오 자산 주장": "확인할 시나리오 건물 조건",
  "상품 설명에서 확인하려는 자산값과 단위를 공개해 주세요.": "상품 설명에 기재된 자산값과 단위를 확인하세요.",
  "시나리오 조건과 한계를 입력해 주세요.": "시나리오 조건과 한계를 확인하세요.",
  "데모 규칙 v1 기준": "현재 확인 기준",
  "데모 규칙 v1 결과": "현재 확인 기준에 따른 결과",
  "데모 규칙 v1": "현재 확인 기준",
  "시나리오 입력조건": "시나리오 조건",
  "시나리오 입력": "시나리오 조건",
  "원장 대조": "공개정보 확인",
  "완료 모집단": "완료 사례 전체",
  "scenario-input": "시나리오 조건",
  "운영그룹은": "가상 운영주체는",
  "운영그룹이": "가상 운영주체가",
  "운영그룹의": "가상 운영주체의",
  "운영그룹을": "가상 운영주체를",
  "운영그룹": "가상 운영주체",
  "building-name": "건물명",
  "main-use": "주용도",
  "gross-floor-area": "연면적",
  "land-area": "대지면적",
  "use-approval-date": "사용승인일",
  "payout coverage": "예상 분배 충당배율",
  "stress DSCR": "스트레스 부채상환비율",
};

export const presentReviewText = (value: string): string =>
  Object.entries(REVIEW_TERM_LABEL).reduce(
    (text, [term, label]) => text.replaceAll(term, label),
    value,
  );

function ScenarioCard({
  offer,
  population,
}: {
  readonly offer: ScenarioOffer;
  readonly population: readonly ScenarioOffer[];
}) {
  const review = evaluateScenarioReview(offer, population);
  const completionMetrics = calculateCompletionMetrics(offer);
  return (
    <CategoryOfferCard
      id={offer.offerId}
      title={offer.asset.publicName}
      assetLabel="부동산"
      badge={PHASE_LABEL[offer.offering.phase]}
      badgeTone={scenarioSubscriptionPhase(offer.offering.phase)}
      notice="검토용 시나리오"
      meta={offer.asset.region}
      primaryMetric={{
        label: ANALYSIS_CARD_COPY.minimumInvestmentLabel,
        value: formatWon(offer.offering.minimumInvestmentWon),
      }}
      facts={[
        { label: ANALYSIS_CARD_COPY.totalOfferingLabel, value: formatWon(offer.offering.amountWon) },
        completionMetrics
          ? { label: "가상 단순 총수익률", value: `${completionMetrics.totalReturnRatePercent.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%` }
          : { label: "예상 배당 · 가정", value: `연 ${offer.offering.expectedAnnualDistributionRatePercent}%` },
      ]}
      metrics={[]}
      note={presentReviewText(review.overallLabel)}
      noteAlert={review.overallState === "critical"}
      footerMeta={`${ANALYSIS_CARD_COPY.asOfPrefix} ${offer.asOf}`}
      href={`/real-estate/products/${encodeURIComponent(offer.offerId)}`}
      ctaLabel={ANALYSIS_CARD_COPY.reportCta}
      appearance="analysis"
      action={<OfferWatchIconButton offerId={offer.offerId} offerTitle={offer.asset.publicName} />}
      media={{ src: "/category-real-estate-card-v2.png", alt: "", label: "부동산" }}
    />
  );
}

export function ScenarioCatalog({
  offers,
  query = "",
  status = null,
}: {
  readonly offers: readonly ScenarioOffer[];
  readonly query?: string;
  readonly status?: SubscriptionPhase | null;
}) {
  const keyword = query.trim().toLocaleLowerCase("ko-KR");
  const visible = offers.filter((offer) =>
    (status === null || scenarioSubscriptionPhase(offer.offering.phase) === status) &&
    `${offer.title} ${offer.asset.publicName} ${offer.asset.region}`.toLocaleLowerCase("ko-KR").includes(keyword),
  );
  return (
    <section className={`${base.slot} ${base.catalogSlot}`} aria-labelledby="scenario-catalog-title">
      <div className={base.slotGrid}>
        <div>
          <h2 id="scenario-catalog-title" className={cards.categoryOfferSectionTitle}>
            {ANALYSIS_CARD_COPY.catalogTitle} <span>{visible.length}</span>
          </h2>
          <p className={s.demoNote}>검토용 시나리오 · 실제 청약·판매 상품이 아닙니다.</p>
        </div>
        {visible.length > 0 ? (
          <CategoryOfferCardGrid>
            {visible.map((offer) => <ScenarioCard key={offer.offerId} offer={offer} population={offers} />)}
          </CategoryOfferCardGrid>
        ) : (
          <p className={base.emptyNote}>조건에 맞는 상품이 없습니다. <Link href="/real-estate">검색 조건 초기화</Link></p>
        )}
      </div>
    </section>
  );
}
