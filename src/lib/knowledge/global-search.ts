import { OFFERS, buildOfferSchedule } from "@/components/site/offers";
import { commonProductHref } from "@/lib/knowledge/common-route";
import {
  loadApprovedCommonProducts,
  loadApprovedScenarios,
  routableLegacyScenarios,
} from "./loader";
import {
  isGenericKnowledgeQuery,
  listPublishedRepositoryOfferings,
  resolveRetrievalRepositories,
  retrieveGenericKnowledge,
  type GenericKnowledgeEvidence,
  type RetrievalRepositories,
} from "./retrieval";
import { evaluateScenarioReview, type ReviewAreaId } from "./scenario-review";
import { isRankingRequest, normalizeKorean, normalizeSearchQuery } from "./search";
import type { GlobalSearchQuery, GlobalSearchRequest } from "./schema";

export interface GlobalSearchResult {
  readonly id: string;
  readonly productId: string;
  readonly categoryId: "cattle" | "pig" | "art" | "real-estate";
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
  readonly isScenario: boolean;
  readonly dataNature: "observed" | "scenario";
  readonly namespace: "published-offer" | "common" | "legacy-scenario";
}

export interface GlobalSearchResponse {
  readonly mode: "matches" | "review-guidance";
  readonly results: readonly GlobalSearchResult[];
  readonly guidance?: {
    readonly message: string;
    readonly reviewAreas: readonly ReviewAreaId[];
  };
  readonly genericEvidence?: readonly GenericKnowledgeEvidence[];
  readonly retrieval: {
    readonly storage: {
      readonly offerings: "db" | "file" | "not-used";
      readonly rag: "db" | "file" | "not-used";
    };
    readonly degraded: boolean;
    readonly semantic: false;
    readonly strategy: "keyword";
  };
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
  if (tokens.length === 0) return { matchedFields: [], score: 1 };

  const matchedFields = normalizedFields
    .filter(([, value]) => tokens.some((token) => value.includes(token)))
    .map(([field]) => field);
  const title = normalizedFields.find(([field]) => field === "title")?.[1] ?? "";
  return {
    matchedFields,
    score: matchedFields.length === 0 ? 0 :
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
  "최소 투자 공모 가격 배당 분배 수수료 비용 운용기간 보유 매각 회수 연면적 건물정보 자산검토 수익비용 금융 회수검토 운영그룹 과거이력";

const CATEGORY_ALIASES: Readonly<Record<GlobalSearchResult["categoryId"], readonly string[]>> = {
  cattle: ["cattle", "한우", "소", "가축"],
  pig: ["pig", "돼지", "돈육"],
  art: ["art", "미술", "미술품", "작품"],
  "real-estate": ["real estate", "부동산", "건물", "건축물"],
};

const hasCategoryAlias = (query: string, alias: string): boolean =>
  ` ${query} `.includes(` ${alias} `);

const intentsOf = (value: string): {
  readonly query: string;
  readonly categoryId?: GlobalSearchResult["categoryId"];
  readonly phases?: ReadonlySet<GlobalSearchResult["phase"]>;
} => {
  const normalized = normalizeSearchQuery(value);
  const categoryId = (Object.entries(CATEGORY_ALIASES) as Array<[GlobalSearchResult["categoryId"], readonly string[]]>)
    .find(([, aliases]) => aliases.some((alias) => hasCategoryAlias(normalized, alias)))?.[0];
  const active = /진행\s*중|현재\s*투자\s*가능/.test(normalized);
  const listed = /상장|거래\s*가능/.test(normalized);
  const subscription = /청약|공모\s*중|모집\s*중/.test(normalized);
  const phases = active
    ? new Set<GlobalSearchResult["phase"]>(["subscription-open", "listed-trading"])
    : listed
      ? new Set<GlobalSearchResult["phase"]>(["listed-trading"])
      : subscription
        ? new Set<GlobalSearchResult["phase"]>(["subscription-open"])
        : undefined;
  const ignored = new Set([
    "상품", "진행", "중", "현재", "투자", "가능", "청약", "공모", "모집", "상장", "거래",
    ...Object.values(CATEGORY_ALIASES).flat().flatMap((alias) => alias.split(" ")),
  ]);
  return {
    query: normalized.split(" ").filter((token) =>
      !ignored.has(token) &&
      !["상품", "진행", "중", "현재", "투자", "가능", "청약", "공모", "모집", "상장", "거래"]
        .some((term) => token.startsWith(term)),
    ).join(" "),
    ...(categoryId ? { categoryId } : {}),
    ...(phases ? { phases } : {}),
  };
};

const assetKindOf = (categoryId: GlobalSearchResult["categoryId"]): GlobalSearchResult["assetKind"] =>
  categoryId === "real-estate" ? "real-estate" : "livestock";

export const searchOffers = async (
  query: GlobalSearchQuery | GlobalSearchRequest,
  dataRoot?: string,
  repositories?: RetrievalRepositories,
): Promise<GlobalSearchResponse> => {
  const queryText = "query" in query ? query.query : query.q;
  if (isRankingRequest(queryText)) {
    return {
      mode: "review-guidance",
      results: [],
      guidance: {
        message: "상품 추천·안전성·최고 상품·적정가 순위 대신 확인할 투자검토 기준을 안내합니다.",
        reviewAreas: ["asset", "return-cost", "financing", "exit", "operator-history"],
      },
      retrieval: {
        storage: { offerings: "not-used", rag: "not-used" },
        degraded: false,
        semantic: false,
        strategy: "keyword",
      },
    };
  }
  const intent = intentsOf(queryText);
  const normalized = intent.query;
  const now = new Date();
  const [population, commonProducts, resolvedRepositories] = await Promise.all([
    loadApprovedScenarios(dataRoot),
    loadApprovedCommonProducts(dataRoot),
    repositories ?? resolveRetrievalRepositories({ dataDir: dataRoot }),
  ]);
  const repositoryOfferings = await listPublishedRepositoryOfferings(
    resolvedRepositories.offerings,
    query.categoryId ?? intent.categoryId,
  );
  const repositoryById = new Map(repositoryOfferings.map((item) => [item.entry.id, item.offering]));
  const published = OFFERS.map((offer) => {
    const schedulePhase = buildOfferSchedule(offer, now).phase;
    const phase: GlobalSearchResult["phase"] =
      schedulePhase === "open" ? "subscription-open" : schedulePhase;
    const match = matchFields(normalized, {
      id: offer.id,
      title: offer.title,
      assetKind: offer.assetLabel,
      phase: `${phase} ${PHASE_ALIASES[phase]}`,
      repositoryTitle: repositoryById.get(offer.id)?.titlePublic ?? "",
      repositoryAmount: repositoryById.get(offer.id)?.amountWon?.toString() ?? "",
    });
    return {
      id: offer.id,
      productId: offer.id,
      categoryId: "cattle" as const,
      title: offer.title,
      assetKind: offer.assetKind,
      phase,
      href: `/offers/${offer.id}`,
      matchedFields: match.matchedFields,
      isScenario: false,
      dataNature: "observed" as const,
      namespace: "published-offer" as const,
      score: match.score,
    };
  });
  const scenarios = routableLegacyScenarios(
    population,
    OFFERS.map((offer) => offer.id),
  ).map((offer) => {
    const phase = offer.offering.phase;
    const review = evaluateScenarioReview(offer, population);
    const match = matchFields(normalized, {
      id: offer.offerId,
      title: offer.title,
      publicName: offer.asset.publicName,
      assetKind: "부동산 real-estate",
      phase: `${phase} ${PHASE_ALIASES[phase]}`,
      region: offer.asset.region,
      topics: SCENARIO_TOPICS,
      review: review.areas
        .flatMap((area) => [
          area.area,
          area.headline,
          area.state,
          ...area.findings.flatMap((finding) => [
            finding.code,
            finding.message,
            finding.impact,
            finding.nextQuestion,
          ]),
        ])
        .join(" "),
    });
    return {
      id: offer.offerId,
      productId: offer.offerId,
      categoryId: "real-estate" as const,
      title: offer.title,
      assetKind: "real-estate" as const,
      phase,
      minimumInvestmentWon: offer.offering.minimumInvestmentWon,
      href: `/offers/${offer.offerId}`,
      matchedFields: match.matchedFields,
      isScenario: true,
      dataNature: "scenario" as const,
      namespace: "legacy-scenario" as const,
      score: match.score,
    };
  });

  const common = commonProducts.map((product) => {
    const phase = product.phase ?? "closed";
    const match = matchFields(normalized, {
      id: product.productId,
      title: product.title,
      aliases: product.aliases.join(" "),
      category: `${product.categoryId} ${CATEGORY_ALIASES[product.categoryId].join(" ")}`,
      phase: `${phase} ${PHASE_ALIASES[phase]}`,
      status: product.status ?? "",
    });
    return {
      id: product.productId,
      productId: product.productId,
      categoryId: product.categoryId,
      title: product.title,
      assetKind: assetKindOf(product.categoryId),
      phase,
      href: commonProductHref(product.categoryId, product.productId),
      matchedFields: match.matchedFields,
      isScenario: product.dataNature === "scenario",
      dataNature: product.dataNature,
      namespace: "common" as const,
      score: match.score,
    };
  });

  const results = [...new Map([...published, ...common, ...scenarios].map((item) => [
    `${item.categoryId}/${item.id}/${item.dataNature}/${item.namespace}`,
    item,
  ])).values()]
    .filter(
      (item) =>
        item.score > 0 &&
        (!query.assetKind || item.assetKind === query.assetKind) &&
        (!query.categoryId && !intent.categoryId || item.categoryId === (query.categoryId ?? intent.categoryId)) &&
        (!query.phase || item.phase === query.phase) &&
        (!intent.phases || intent.phases.has(item.phase)),
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.title.localeCompare(right.title, "ko"),
    )
    .slice(0, query.limit)
    .map((item) => ({
      id: item.id,
      productId: item.productId,
      categoryId: item.categoryId,
      title: item.title,
      assetKind: item.assetKind,
      phase: item.phase,
      ...("minimumInvestmentWon" in item && typeof item.minimumInvestmentWon === "number"
        ? { minimumInvestmentWon: item.minimumInvestmentWon }
        : {}),
      href: item.href,
      matchedFields: item.matchedFields,
      isScenario: item.isScenario,
      dataNature: item.dataNature,
      namespace: item.namespace,
    }));
  const generic = results.length === 0 && isGenericKnowledgeQuery(queryText)
    ? await retrieveGenericKnowledge(resolvedRepositories.rag, queryText, query.categoryId ?? intent.categoryId)
    : { evidence: [], degraded: false };
  return {
    mode: "matches",
    results,
    ...(generic.evidence.length ? { genericEvidence: generic.evidence } : {}),
    retrieval: {
      storage: {
        offerings: resolvedRepositories.offerings.mode,
        rag: resolvedRepositories.rag.mode,
      },
      degraded: true,
      semantic: false,
      strategy: "keyword",
    },
  };
};
