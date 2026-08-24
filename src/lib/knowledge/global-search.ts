import { OFFERS, buildOfferSchedule } from "@/components/site/offers";
import { loadApprovedScenarios } from "./loader";
import { normalizeKorean } from "./search";
import type { GlobalSearchQuery } from "./schema";

export interface GlobalSearchResult {
  readonly id: string;
  readonly title: string;
  readonly assetKind: "livestock" | "real-estate";
  readonly phase:
    | "upcoming"
    | "subscription-open"
    | "closed"
    | "listed-trading"
    | "settled";
  readonly minimumInvestmentWon?: number;
  readonly href: string;
  readonly matchedFields: readonly string[];
}

const matchFields = (
  query: string,
  fields: Readonly<Record<string, string>>,
): { readonly matchedFields: readonly string[]; readonly score: number } => {
  const tokens = query.split(" ").filter(Boolean);
  const normalizedFields = Object.entries(fields).map(([field, value]) => [
    field,
    normalizeKorean(value),
  ] as const);
  if (
    tokens.length === 0 ||
    !tokens.every((token) => normalizedFields.some(([, value]) => value.includes(token)))
  ) {
    return { matchedFields: [], score: 0 };
  }

  const matchedFields = normalizedFields
    .filter(([, value]) => tokens.some((token) => value.includes(token)))
    .map(([field]) => field);
  const title = normalizedFields.find(([field]) => field === "title")?.[1] ?? "";
  return {
    matchedFields,
    score:
      (title === query ? 100 : title.startsWith(query) ? 50 : 0) +
      matchedFields.length,
  };
};

const PHASE_ALIASES: Readonly<Record<GlobalSearchResult["phase"], string>> = {
  upcoming: "청약 예정 모집 예정",
  "subscription-open": "청약 청약 중 공모 모집",
  closed: "청약 종료 모집 종료",
  "listed-trading": "상장 상장 거래 거래 가능 매매 가능",
  settled: "종료 정산 정산 완료 운용 종료",
};

const SCENARIO_TOPICS =
  "최소 투자 공모 가격 배당 분배 수수료 비용 운용기간 보유 매각 회수 연면적 건물정보 운영그룹 과거이력";

export const searchOffers = async (
  query: GlobalSearchQuery,
): Promise<readonly GlobalSearchResult[]> => {
  const normalized = normalizeKorean(query.q);
  const now = new Date();
  const published = OFFERS.map((offer) => {
    const schedulePhase = buildOfferSchedule(offer, now).phase;
    const phase: GlobalSearchResult["phase"] =
      schedulePhase === "open" ? "subscription-open" : schedulePhase;
    const match = matchFields(normalized, {
      id: offer.id,
      title: offer.title,
      assetKind: offer.assetLabel,
      phase: `${phase} ${PHASE_ALIASES[phase]}`,
    });
    return {
      id: offer.id,
      title: offer.title,
      assetKind: offer.assetKind,
      phase,
      href: `/offers/${offer.id}`,
      matchedFields: match.matchedFields,
      score: match.score,
    };
  });
  const scenarios = (await loadApprovedScenarios()).map((offer) => {
    const phase = offer.offering.phase;
    const match = matchFields(normalized, {
      id: offer.offerId,
      title: offer.title,
      publicName: offer.asset.publicName,
      assetKind: "부동산 real-estate",
      phase: `${phase} ${PHASE_ALIASES[phase]}`,
      region: offer.asset.region,
      topics: SCENARIO_TOPICS,
    });
    return {
      id: offer.offerId,
      title: offer.title,
      assetKind: "real-estate" as const,
      phase,
      minimumInvestmentWon: offer.offering.minimumInvestmentWon,
      href: `/offers/${offer.offerId}`,
      matchedFields: match.matchedFields,
      score: match.score,
    };
  });

  return [...new Map([...published, ...scenarios].map((item) => [item.id, item])).values()]
    .filter(
      (item) =>
        item.matchedFields.length > 0 &&
        (!query.assetKind || item.assetKind === query.assetKind) &&
        (!query.phase || item.phase === query.phase),
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.title.localeCompare(right.title, "ko"),
    )
    .slice(0, query.limit)
    .map((item) => ({
      id: item.id,
      title: item.title,
      assetKind: item.assetKind,
      phase: item.phase,
      ...("minimumInvestmentWon" in item
        ? { minimumInvestmentWon: item.minimumInvestmentWon }
        : {}),
      href: item.href,
      matchedFields: item.matchedFields,
    }));
};
