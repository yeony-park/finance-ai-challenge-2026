import { OFFERS, buildOfferSchedule } from "@/components/site/offers";
import { commonProductHref } from "@/lib/knowledge/common-route";
import {
  loadApprovedCommonProducts,
  loadApprovedScenarios,
  routableLegacyScenarios,
} from "./loader";
import { loadApprovedCattleFilingArtifacts } from "./cattle-filing-artifact";
import { loadApprovedPigFilingArtifacts } from "./pig-filing-artifact";
import { loadFilingCorpusSearchEntries } from "./filing-corpus";
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
import type { SemanticProductMatch } from "./local-rag/semantic";
import {
  listSyntheticArtCurrentProductsIfPresent,
  SYNTHETIC_ART_SCENARIO_ID,
  type SyntheticArtCurrentProduct,
} from "@/lib/art/synthetic-catalog";

export interface GlobalSearchResult {
  readonly id: string;
  readonly productId: string;
  readonly categoryId: "cattle" | "pig" | "art" | "real-estate";
  readonly title: string;
  readonly assetKind: "livestock" | "art" | "real-estate";
  readonly phase:
    | "upcoming"
    | "subscription-open"
    | "closed"
    | "listed-trading"
    | "settled"
    | "evidence-only";
  readonly minimumInvestmentWon?: number;
  readonly href: string;
  readonly matchedFields: readonly string[];
  readonly isScenario: boolean;
  readonly dataNature: "observed" | "scenario";
  readonly namespace: "published-offer" | "common" | "legacy-scenario";
  readonly status?: "evidence-ready";
}

export interface GlobalSearchResponse {
  readonly mode: "matches" | "review-guidance";
  readonly results: readonly GlobalSearchResult[];
  readonly generatedAnswer?: {
    readonly answer: string;
    readonly citedProductIds: readonly string[];
  };
  readonly generatedGeneralAnswer?: {
    readonly answer: string;
    readonly citedSourceIds: readonly string[];
  };
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
    readonly semantic: boolean;
    readonly strategy: "keyword" | "semantic" | "hybrid";
    readonly reason?: string;
    readonly planner?: {
      readonly used: boolean;
      readonly degraded: boolean;
      readonly reason?: string;
    };
  };
}

export interface GlobalSearchOptions {
  readonly semanticMatches?: readonly SemanticProductMatch[];
  readonly minimumInvestmentWonMin?: number;
  readonly minimumInvestmentWonMax?: number;
  readonly loadScenarios?: typeof loadApprovedScenarios;
  readonly loadCommonProducts?: typeof loadApprovedCommonProducts;
  readonly loadCattleFilings?: typeof loadApprovedCattleFilingArtifacts;
  readonly loadPigFilings?: typeof loadApprovedPigFilingArtifacts;
  readonly loadFilingCorpus?: typeof loadFilingCorpusSearchEntries;
  readonly loadArtProducts?: (dataRoot?: string) => Promise<readonly SyntheticArtCurrentProduct[]>;
}

let productionCattleFilings: ReturnType<typeof loadApprovedCattleFilingArtifacts> | undefined;
let productionPigFilings: ReturnType<typeof loadApprovedPigFilingArtifacts> | undefined;

const loadDefaultFilings = <T>(
  dataRoot: string | undefined,
  injected: ((dataRoot?: string) => Promise<T>) | undefined,
  load: (dataRoot?: string) => Promise<T>,
  cached: () => Promise<T> | undefined,
  setCached: (value: Promise<T> | undefined) => void,
): Promise<T> => {
  if (injected) return injected(dataRoot);
  if (process.env.NODE_ENV !== "production" || dataRoot !== undefined) return load(dataRoot);
  const existing = cached();
  if (existing) return existing;
  const pending = load();
  setCached(pending);
  void pending.catch(() => {
    if (cached() === pending) setCached(undefined);
  });
  return pending;
};

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
  "evidence-only": "공개 근거 확인 근거만",
};

const SCENARIO_TOPICS =
  "최소 투자 공모 가격 배당 분배 수수료 비용 운용기간 보유 매각 회수 연면적 건물정보 자산검토 수익비용 금융 회수검토 운영그룹 과거이력";

const CATEGORY_ALIASES: Readonly<Record<GlobalSearchResult["categoryId"], readonly string[]>> = {
  cattle: ["cattle", "한우", "소", "가축"],
  pig: ["pig", "돼지", "돈육", "한돈"],
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
  categoryId === "real-estate" ? "real-estate" : categoryId === "art" ? "art" : "livestock";

const artPhase = (status: SyntheticArtCurrentProduct["offering"]["status"]): GlobalSearchResult["phase"] => {
  if (status === "upcoming") return "upcoming";
  if (status === "open") return "subscription-open";
  if (status === "operating" || status === "exit_in_progress") return "listed-trading";
  if (status === "liquidated") return "settled";
  return "evidence-only";
};

const isCattleFilingQuery = (
  query: string,
  categoryId?: GlobalSearchResult["categoryId"],
): boolean => categoryId === "cattle" || categoryId === undefined &&
  /공모\s*가격|공모가(?:액)?|배정|사업\s*기간|운용\s*기간|수수료|보호\s*기금|투자자\s*보호|가격\s*산정|수요\s*예측/.test(query);

const isPigFilingQuery = (
  query: string,
  categoryId?: GlobalSearchResult["categoryId"],
): boolean => categoryId === "pig" || categoryId === undefined && (
  /^pig-[1-9]\d*$/.test(query.trim().toLowerCase()) ||
  /공모\s*(?:조건|개요|가격|총액|금액)|공모가(?:액)?|좌수|단가|청약|배정|납입|수수료|위험|보상|원금\s*미보장|투자자\s*보호|보호\s*기금/.test(query) ||
  /돼지|돈육|한돈|pig|가축\s*투자계약증권/i.test(query) &&
    /공시|상품\s*명|(?:제\s*)?[1-9]\d*\s*호/.test(query)
);

export const searchOffers = async (
  query: GlobalSearchQuery | GlobalSearchRequest,
  dataRoot?: string,
  repositories?: RetrievalRepositories,
  options: GlobalSearchOptions = {},
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
  const semanticScore = (
    categoryId: GlobalSearchResult["categoryId"],
    productId: string,
    dataNature: GlobalSearchResult["dataNature"],
    namespace: GlobalSearchResult["namespace"],
    scenarioId?: string,
  ): number => options.semanticMatches?.find((item) =>
    item.categoryId === categoryId &&
    item.productId === productId &&
    item.dataNature === dataNature &&
    (item.namespace === namespace ||
      namespace === "published-offer" && item.namespace === "common" &&
        (categoryId === "cattle" || categoryId === "pig")) &&
    item.scenarioId === scenarioId
  )?.score ?? 0;
  const now = new Date();
  const categoryId = query.categoryId ?? intent.categoryId;
  const cattleFilingsPromise = isCattleFilingQuery(queryText, categoryId)
    ? loadDefaultFilings(
      dataRoot,
      options.loadCattleFilings,
      loadApprovedCattleFilingArtifacts,
      () => productionCattleFilings,
      (value) => { productionCattleFilings = value; },
    )
    : Promise.resolve([]);
  const pigFilingsPromise = isPigFilingQuery(queryText, query.categoryId)
    ? loadDefaultFilings(
      dataRoot,
      options.loadPigFilings,
      loadApprovedPigFilingArtifacts,
      () => productionPigFilings,
      (value) => { productionPigFilings = value; },
    )
    : Promise.resolve([]);
  const filingCorpusPromise = (
    categoryId === "cattle" || categoryId === "pig" ||
    /한우|돼지|돈육|한돈|가축|공모|청약|배정|수수료|위험|원금|투자자\s*보호|질병|경락|ASF/i.test(queryText)
  ) ? (options.loadFilingCorpus ?? loadFilingCorpusSearchEntries)(dataRoot) : Promise.resolve([]);
  const artProductsPromise = (options.loadArtProducts ?? listSyntheticArtCurrentProductsIfPresent)(dataRoot)
    .catch((error) => {
      if (categoryId === "art") throw error;
      return [];
    });
  const [population, commonProducts, cattleFilings, pigFilings, filingCorpus, artProducts, resolvedRepositories] = await Promise.all([
    (options.loadScenarios ?? loadApprovedScenarios)(dataRoot),
    (options.loadCommonProducts ?? loadApprovedCommonProducts)(dataRoot),
    cattleFilingsPromise,
    pigFilingsPromise,
    filingCorpusPromise,
    artProductsPromise,
    repositories ?? resolveRetrievalRepositories({ dataDir: dataRoot }),
  ]);
  const corpusByCategory = (category: "cattle" | "pig") => filingCorpus.filter((entry) => entry.categoryId === category);
  const cattleFilingByProduct = new Map(corpusByCategory("cattle").map((entry) => [entry.productId, entry.searchText]));
  for (const artifact of cattleFilings) {
    const productId = artifact.registry.offerId;
    const text = artifact.sections.map((section) => `${section.title} ${section.text}`).join(" ");
    cattleFilingByProduct.set(productId, `${cattleFilingByProduct.get(productId) ?? ""} ${text}`.trim());
  }
  const pigFilingByProduct = new Map(corpusByCategory("pig").map((entry) => [entry.productId, entry.searchText]));
  for (const artifact of pigFilings) {
    const productId = artifact.registry.productId;
    const text = artifact.sections.map((section) => `${section.title} ${section.text}`).join(" ");
    pigFilingByProduct.set(productId, `${pigFilingByProduct.get(productId) ?? ""} ${text}`.trim());
  }
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
      filing: cattleFilingByProduct.get(offer.id) ?? "",
    });
    const semantic = semanticScore("cattle", offer.id, "observed", "published-offer");
    return {
      id: offer.id,
      productId: offer.id,
      categoryId: "cattle" as const,
      title: offer.title,
      assetKind: offer.assetKind,
      phase,
      href: `/offers/${offer.id}`,
      matchedFields: semantic > 0 ? [...match.matchedFields, "semantic"] : match.matchedFields,
      isScenario: false,
      dataNature: "observed" as const,
      namespace: "published-offer" as const,
      score: match.score + semantic * 30,
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
    const semantic = semanticScore("real-estate", offer.offerId, "scenario", "legacy-scenario", offer.scenarioId);
    return {
      id: offer.offerId,
      productId: offer.offerId,
      categoryId: "real-estate" as const,
      title: offer.title,
      assetKind: "real-estate" as const,
      phase,
      minimumInvestmentWon: offer.offering.minimumInvestmentWon,
      href: `/offers/${offer.offerId}`,
      matchedFields: semantic > 0 ? [...match.matchedFields, "semantic"] : match.matchedFields,
      isScenario: true,
      dataNature: "scenario" as const,
      namespace: "legacy-scenario" as const,
      score: match.score + semantic * 30,
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
    const semantic = semanticScore(
      product.categoryId,
      product.productId,
      product.dataNature,
      "common",
      product.scenarioId,
    );
    return {
      id: product.productId,
      productId: product.productId,
      categoryId: product.categoryId,
      title: product.title,
      assetKind: assetKindOf(product.categoryId),
      phase,
      href: commonProductHref(product.categoryId, product.productId),
      matchedFields: semantic > 0 ? [...match.matchedFields, "semantic"] : match.matchedFields,
      isScenario: product.dataNature === "scenario",
      dataNature: product.dataNature,
      namespace: "common" as const,
      score: match.score + semantic * 30,
    };
  });

  const art = artProducts.map((product) => {
    const { offering, artwork, artist, platform, analysis } = product;
    const phase = artPhase(offering.status);
    const match = matchFields(normalized, {
      id: offering.id,
      title: `${artwork.title} ${offering.title}`,
      artist: `${artist.nameKo} ${artist.nameEn ?? ""}`,
      artwork: `${artwork.medium ?? ""} ${artwork.productionYear ?? ""} ${artwork.series ?? ""}`,
      platform: platform.name,
      category: `art ${CATEGORY_ALIASES.art.join(" ")}`,
      phase: `${phase} ${PHASE_ALIASES[phase]}`,
      amount: `${offering.minimumInvestment ?? ""} ${offering.unitPrice ?? ""} ${offering.totalOfferingAmount ?? ""}`,
      analysis: `${analysis.headline} ${analysis.summary} ${analysis.keyReasons.map((reason) => `${reason.title} ${reason.finding} ${reason.implication}`).join(" ")}`,
    });
    const semantic = semanticScore("art", offering.id, "scenario", "common", SYNTHETIC_ART_SCENARIO_ID);
    return {
      id: offering.id,
      productId: offering.id,
      categoryId: "art" as const,
      title: `${artwork.title} · ${artist.nameKo}`,
      assetKind: "art" as const,
      phase,
      ...(offering.minimumInvestment === null ? {} : { minimumInvestmentWon: offering.minimumInvestment }),
      href: `/art?scope=current&product=${encodeURIComponent(offering.id)}#selected-art-product`,
      matchedFields: semantic > 0 ? [...match.matchedFields, "semantic"] : match.matchedFields,
      isScenario: true,
      dataNature: "scenario" as const,
      namespace: "common" as const,
      score: match.score + semantic * 30,
    };
  });

  const pig = [...pigFilingByProduct].flatMap(([productId, filing]) => {
    const corpus = filingCorpus.find((entry) => entry.categoryId === "pig" && entry.productId === productId);
    const title = pigFilings.find((item) => item.registry.productId === productId)?.document.title ??
      corpus?.title;
    if (!title) return [];
    const match = matchFields(normalized, {
      id: productId,
      title,
      category: `pig ${CATEGORY_ALIASES.pig.join(" ")}`,
      filing,
    });
    const semantic = semanticScore("pig", productId, "observed", "published-offer");
    return [{
      id: productId,
      productId,
      categoryId: "pig" as const,
      title,
      assetKind: "livestock" as const,
      phase: "evidence-only" as const,
      status: "evidence-ready" as const,
      href: `/offers/${productId}`,
      matchedFields: semantic > 0 ? [...match.matchedFields, "semantic"] : match.matchedFields,
      isScenario: false,
      dataNature: "observed" as const,
      namespace: "published-offer" as const,
      score: match.score + semantic * 30,
    }];
  });

  const results = [...new Map([...published, ...pig, ...art, ...common, ...scenarios].map((item) => [
    `${item.categoryId}/${item.id}/${item.dataNature}/${item.namespace}`,
    item,
  ])).values()]
    .filter(
      (item) =>
        item.score > 0 &&
        (!query.assetKind || item.assetKind === query.assetKind) &&
        (!query.categoryId && !intent.categoryId || item.categoryId === (query.categoryId ?? intent.categoryId)) &&
        (!query.phase || item.phase === query.phase) &&
        (!intent.phases || intent.phases.has(item.phase)) &&
        (options.minimumInvestmentWonMin === undefined ||
          "minimumInvestmentWon" in item &&
          typeof item.minimumInvestmentWon === "number" &&
          item.minimumInvestmentWon >= options.minimumInvestmentWonMin) &&
        (options.minimumInvestmentWonMax === undefined ||
          "minimumInvestmentWon" in item &&
          typeof item.minimumInvestmentWon === "number" &&
          item.minimumInvestmentWon <= options.minimumInvestmentWonMax),
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
      ...("status" in item && item.status === "evidence-ready"
        ? { status: item.status }
        : {}),
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
