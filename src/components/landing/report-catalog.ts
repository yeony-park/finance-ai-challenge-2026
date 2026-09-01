import { OFFERS, type SubscriptionPhase } from "@/components/site/offers";
import { ART_PRODUCT_FACTS } from "@/lib/content/art";
import { PIG_DISCLOSURE_PRODUCTS } from "@/lib/content/pig";
import type { RichText } from "@/lib/verify/report/view-model";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";

export interface ReportCatalogCardView {
  readonly id: string;
  readonly href: string;
  readonly title: string;
  readonly assetLabel: "한우" | "한돈" | "미술품";
  readonly badge: string;
  readonly meta: string;
  readonly summary: string;
  readonly phase: SubscriptionPhase;
}

const pigCards: readonly ReportCatalogCardView[] =
  PIG_DISCLOSURE_PRODUCTS.map((product) => ({
    id: `pig-${product.round}`,
    href: `/pig?tab=analysis&product=${product.id}#pig-review`,
    title: `한돈 ${product.round}호`,
    assetLabel: "한돈",
    badge: VERDICT_LABEL.unverifiable,
    meta: `${product.statusLabel} · 청약 ${product.offering.subscriptionPeriod.replace("~", " ~ ")}`,
    summary: `기초자산 ${product.offering.heads.toLocaleString("ko-KR")}두 · 발행금액 ${product.offering.issueAmountWon.toLocaleString("ko-KR")}원 · 공시 기준가 ${product.pricing.baselinePriceWonPerKg.toLocaleString("ko-KR")}원/kg`,
    phase: "closed",
  }));

const artCards: readonly ReportCatalogCardView[] = ART_PRODUCT_FACTS.map(
  (product) => ({
    id: product.id,
    href: `/art?tab=analysis&product=${product.id}#art-product-${product.id}`,
    title: product.label,
    assetLabel: "미술품",
    badge: VERDICT_LABEL[product.verdict],
    meta: `${product.lifecycle} · 기준 ${product.asOf.replaceAll("-", ".")}`,
    summary: product.finding,
    phase: "closed",
  }),
);

export const REPORT_CATALOG_CARDS: readonly ReportCatalogCardView[] = [
  ...pigCards,
  ...artCards,
];

const cattleCount = OFFERS.filter(
  (offer) => offer.assetKind === "livestock",
).length;
const pigCount = pigCards.length;
const artCount = artCards.length;
const realEstateCount = OFFERS.filter(
  (offer) => offer.assetKind === "real-estate",
).length;

export const REPORT_TOTAL_COUNT =
  cattleCount + pigCount + artCount + realEstateCount;

export const REPORT_COVERAGE: RichText = [
  { text: "한우 " },
  { text: `${cattleCount}건`, isStrong: true },
  { text: "·한돈 " },
  { text: `${pigCount}건`, isStrong: true },
  { text: "·미술품 " },
  { text: `${artCount}건`, isStrong: true },
  { text: "·부동산 " },
  { text: `${realEstateCount}건`, isStrong: true },
  { text: ", 총 " },
  { text: `${REPORT_TOTAL_COUNT}건`, isStrong: true },
  {
    text: "의 공모가 검증 리포트에 포함돼 있습니다. 각 공모는 공공 원장 대조 범위와 대조 불가 항목을 구분해 보여줍니다.",
  },
];
