import type { SubscriptionPhase } from "@/components/site/offers";
import { analysisStatusFromSearchParam } from "@/lib/content/category-tabs";
import type { ScenarioOffer } from "@/lib/knowledge/schema";

export const scenarioSubscriptionPhase = (
  phase: ScenarioOffer["offering"]["phase"],
): SubscriptionPhase => phase === "subscription-open" ? "open" : "closed";

export function scenarioMatchesQuery(offer: ScenarioOffer, query: string): boolean {
  return `${offer.title} ${offer.asset.publicName} ${offer.asset.region}`
    .toLocaleLowerCase("ko-KR").includes(query.trim().toLocaleLowerCase("ko-KR"));
}

/** 기존 부동산 필터 주소도 공통 청약 상태로 연결한다. */
export const scenarioCatalogStatus = (
  value: string | string[] | undefined,
): SubscriptionPhase | null => {
  const status = Array.isArray(value) ? value[0] : value;
  if (status === "subscription-open") return "open";
  if (status === "listed-trading" || status === "settled") return "closed";
  return analysisStatusFromSearchParam(status);
};
