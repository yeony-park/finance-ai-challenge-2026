import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { ProductKnowledgeResult } from "@/lib/db/repositories/types";
import { calculateCommonChunkHash } from "@/lib/knowledge/pdf";

const Id = z.string().trim().min(1).max(160);
const DateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const NullableMoney = z.number().int().nonnegative().safe().nullable();
const LocalImagePath = z.string().regex(/^\/synthetic-art\/[a-zA-Z0-9/_-]+\.svg$/);

const OfferingSchema = z.object({
  id: Id,
  slug: Id,
  artworkId: Id,
  artistId: Id,
  platformId: Id,
  title: z.string().trim().min(1),
  status: z.enum(["upcoming", "open", "operating", "exit_in_progress", "liquidated", "unverified"]),
  subscriptionStart: DateValue.nullable(),
  subscriptionEnd: DateValue.nullable(),
  unitPrice: NullableMoney,
  minimumInvestment: NullableMoney,
  numberOfUnits: z.number().int().positive().safe().nullable(),
  totalOfferingAmount: NullableMoney,
  acquisitionPrice: NullableMoney,
  appraisalValue: NullableMoney,
  targetHoldingMonths: z.number().int().positive().nullable(),
  distributionTerms: z.string().trim().min(1).nullable(),
  exitMethod: z.string().trim().min(1).nullable(),
  midTermTransferAvailable: z.boolean().nullable(),
  disclosedCosts: z.array(z.object({
    category: z.string().trim().min(1),
    label: z.string().trim().min(1),
    amount: z.number().int().nonnegative().safe(),
  })).max(20),
  asOfDate: DateValue,
  sourceIds: z.array(Id).min(1),
  isDemo: z.literal(true),
  dataMode: z.literal("synthetic"),
  recordScope: z.literal("current"),
});

const ArtworkSchema = z.object({
  id: Id,
  artistId: Id,
  title: z.string().trim().min(1),
  productionYear: z.number().int().min(1000).max(2200).nullable(),
  medium: z.string().trim().min(1).nullable(),
  width: z.number().positive().nullable(),
  height: z.number().positive().nullable(),
  series: z.string().trim().min(1).nullable(),
  provenance: z.string().trim().min(1).nullable(),
  condition: z.string().trim().min(1).nullable(),
  imageUrl: LocalImagePath.nullable(),
  sourceIds: z.array(Id).min(1),
});

const ArtistSchema = z.object({
  id: Id,
  nameKo: z.string().trim().min(1),
  nameEn: z.string().trim().min(1).nullable(),
  birthYear: z.number().int().min(1000).max(2200).nullable(),
  nationality: z.string().trim().min(1).nullable(),
  biography: z.string().trim().min(1).nullable(),
  officialCareer: z.array(z.object({
    type: z.string().trim().min(1),
    title: z.string().trim().min(1),
    year: z.number().int().min(1000).max(2200),
    sourceId: Id,
  })).max(50),
  sourceIds: z.array(Id).min(1),
});

const PlatformSchema = z.object({
  id: Id,
  name: z.string().trim().min(1),
  operatorName: z.string().trim().min(1).nullable(),
  sourceIds: z.array(Id).min(1),
});

const EvidenceSchema = z.object({
  id: Id,
  entityType: z.string().trim().min(1),
  entityId: Id,
  fieldPath: z.string().trim().min(1),
  claim: z.string().trim().min(1),
  value: z.unknown(),
  sourceTitle: z.string().trim().min(1),
  sourcePublisher: z.string().trim().min(1),
  sourceUrl: z.null(),
  sourceType: z.string().trim().min(1),
  asOfDate: DateValue.nullable(),
  notes: z.string().trim().min(1).nullable(),
});

const AnalysisSchema = z.object({
  offeringId: Id,
  verdict: z.enum(["worth_considering", "conditional", "caution", "danger"]),
  verdictLabel: z.string().trim().min(1),
  headline: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  keyReasons: z.array(z.object({
    title: z.string().trim().min(1),
    finding: z.string().trim().min(1),
    implication: z.string().trim().min(1),
    evidenceIds: z.array(Id),
  })).min(1),
  missingInformationRisks: z.array(z.string().trim().min(1)),
  conflicts: z.array(z.string().trim().min(1)),
  evidenceIds: z.array(Id).min(1),
  updatedAt: z.string().datetime({ offset: true }),
});

const TrackRecordSchema = z.object({
  id: Id,
  platformId: Id,
  issuerId: Id.nullable(),
  productName: z.string().trim().min(1),
  artworkTitle: z.string().trim().min(1),
  artistName: z.string().trim().min(1),
  artistNameEn: z.string().trim().min(1).nullable().optional(),
  artworkProductionYear: z.number().int().min(1000).max(2200).nullable().optional(),
  artworkMedium: z.string().trim().min(1).nullable().optional(),
  artworkImageUrl: LocalImagePath.nullable().optional(),
  subscriptionStart: DateValue.nullable().optional(),
  subscriptionEnd: DateValue.nullable().optional(),
  soldPlace: z.string().trim().min(1).nullable().optional(),
  sourceDataset: z.string().trim().min(1).nullable().optional(),
  offeringAmount: NullableMoney,
  targetHoldingMonths: z.number().int().positive().nullable(),
  actualHoldingMonths: z.number().int().nonnegative().nullable(),
  totalDistribution: NullableMoney,
  exitAmount: NullableMoney,
  finalReturn: z.number().finite().nullable(),
  status: z.enum(["offering", "operating", "exit_in_progress", "sold", "returned", "liquidated", "delayed", "unsold", "loss_confirmed", "unknown"]),
  delayDays: z.number().int().nonnegative().nullable(),
  soldAt: DateValue.nullable(),
  liquidatedAt: DateValue.nullable(),
  sourceIds: z.array(Id).min(1),
  dataMode: z.literal("synthetic"),
  recordScope: z.literal("historical"),
  lifecycle: z.enum(["offering", "operating", "exit_in_progress", "sold", "liquidated", "returned", "loss_confirmed", "unknown"]),
  identityStatus: z.enum(["exact_match", "partial", "self_reported", "unverified", "unknown"]),
  evidenceNote: z.string().trim().min(1).nullable().optional(),
});

const ArtDatasetSchema = z.object({
  dataMode: z.literal("synthetic"),
  offerings: z.array(OfferingSchema).min(1),
  artworks: z.array(ArtworkSchema).min(1),
  artists: z.array(ArtistSchema).min(1),
  platforms: z.array(PlatformSchema).min(1),
  trackRecords: z.array(TrackRecordSchema).min(1),
  evidence: z.array(EvidenceSchema).min(1),
  analyses: z.array(AnalysisSchema).min(1),
});

export type SyntheticArtOffering = z.infer<typeof OfferingSchema>;
export type SyntheticArtTrackRecord = z.infer<typeof TrackRecordSchema>;
export type SyntheticArtDataset = z.infer<typeof ArtDatasetSchema>;

export interface SyntheticArtCurrentProduct {
  readonly kind: "current";
  readonly offering: SyntheticArtOffering;
  readonly artwork: z.infer<typeof ArtworkSchema>;
  readonly artist: z.infer<typeof ArtistSchema>;
  readonly platform: z.infer<typeof PlatformSchema>;
  readonly analysis: z.infer<typeof AnalysisSchema>;
  readonly evidence: readonly z.infer<typeof EvidenceSchema>[];
}

export interface SyntheticArtHistoricalProduct {
  readonly kind: "historical";
  readonly record: SyntheticArtTrackRecord;
  readonly platform: z.infer<typeof PlatformSchema>;
}

export type SyntheticArtCatalogItem = SyntheticArtCurrentProduct | SyntheticArtHistoricalProduct;

export const SYNTHETIC_ART_SCENARIO_ID = "synthetic-art-catalog";
export const SYNTHETIC_ART_DATA_PATH = "data/synthetic/art-investment.json";
export const SYNTHETIC_ART_LIMITATION =
  "화면·검색·RAG 흐름 검증을 위해 생성한 합성 데이터이며 실제 작품, 거래, 투자 권유 또는 수익 예측이 아닙니다.";

const hash = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

const uniqueIds = (label: string, values: readonly { readonly id: string }[]): void => {
  if (new Set(values.map((value) => value.id)).size !== values.length) {
    throw new Error(`합성 미술품 ${label} ID가 중복되었습니다.`);
  }
};

const validateDataset = (dataset: SyntheticArtDataset): SyntheticArtDataset => {
  uniqueIds("상품", dataset.offerings);
  uniqueIds("작품", dataset.artworks);
  uniqueIds("작가", dataset.artists);
  uniqueIds("플랫폼", dataset.platforms);
  uniqueIds("과거 이력", dataset.trackRecords);
  uniqueIds("근거", dataset.evidence);
  const artworks = new Map(dataset.artworks.map((item) => [item.id, item]));
  const artists = new Set(dataset.artists.map((item) => item.id));
  const platforms = new Set(dataset.platforms.map((item) => item.id));
  const analyses = new Map(dataset.analyses.map((item) => [item.offeringId, item]));
  const evidence = new Set(dataset.evidence.map((item) => item.id));
  for (const offering of dataset.offerings) {
    const artwork = artworks.get(offering.artworkId);
    if (!artwork || artwork.artistId !== offering.artistId || !artists.has(offering.artistId)) {
      throw new Error(`합성 미술품 상품의 작품·작가 참조가 맞지 않습니다: ${offering.id}`);
    }
    if (!platforms.has(offering.platformId) || !analyses.has(offering.id)) {
      throw new Error(`합성 미술품 상품의 플랫폼·분석 참조가 없습니다: ${offering.id}`);
    }
    if (
      offering.unitPrice !== null && offering.numberOfUnits !== null &&
      offering.totalOfferingAmount !== offering.unitPrice * offering.numberOfUnits
    ) {
      throw new Error(`합성 미술품 단가×수량과 공모금액이 다릅니다: ${offering.id}`);
    }
    if (offering.sourceIds.some((id) => !evidence.has(id))) {
      throw new Error(`합성 미술품 상품의 근거 참조가 없습니다: ${offering.id}`);
    }
  }
  for (const record of dataset.trackRecords) {
    if (!platforms.has(record.platformId) || record.sourceIds.some((id) => !evidence.has(id))) {
      throw new Error(`합성 미술품 과거 이력의 참조가 없습니다: ${record.id}`);
    }
  }
  return dataset;
};

let productionDataset: Promise<SyntheticArtDataset> | undefined;

export const loadSyntheticArtDataset = async (
  dataRoot = "data",
): Promise<SyntheticArtDataset> => {
  const load = async () => {
    const file = path.resolve(dataRoot, "synthetic/art-investment.json");
    const raw = await readFile(file);
    if (raw.byteLength > 2 * 1024 * 1024) throw new Error("합성 미술품 JSON 크기 제한을 초과했습니다.");
    return validateDataset(ArtDatasetSchema.parse(JSON.parse(raw.toString("utf8"))));
  };
  if (process.env.NODE_ENV !== "production" || path.resolve(dataRoot) !== path.resolve("data")) return load();
  productionDataset ??= load();
  void productionDataset.catch(() => { productionDataset = undefined; });
  return productionDataset;
};

export const listSyntheticArtCurrentProducts = async (
  dataRoot = "data",
): Promise<readonly SyntheticArtCurrentProduct[]> => {
  const dataset = await loadSyntheticArtDataset(dataRoot);
  const artworks = new Map(dataset.artworks.map((item) => [item.id, item]));
  const artists = new Map(dataset.artists.map((item) => [item.id, item]));
  const platforms = new Map(dataset.platforms.map((item) => [item.id, item]));
  const analyses = new Map(dataset.analyses.map((item) => [item.offeringId, item]));
  const evidence = new Map(dataset.evidence.map((item) => [item.id, item]));
  return dataset.offerings.map((offering) => ({
    kind: "current" as const,
    offering,
    artwork: artworks.get(offering.artworkId)!,
    artist: artists.get(offering.artistId)!,
    platform: platforms.get(offering.platformId)!,
    analysis: analyses.get(offering.id)!,
    evidence: offering.sourceIds.flatMap((id) => evidence.get(id) ?? []),
  }));
};

export const listSyntheticArtHistoricalProducts = async (
  dataRoot = "data",
): Promise<readonly SyntheticArtHistoricalProduct[]> => {
  const dataset = await loadSyntheticArtDataset(dataRoot);
  const platforms = new Map(dataset.platforms.map((item) => [item.id, item]));
  return dataset.trackRecords.map((record) => ({
    kind: "historical" as const,
    record,
    platform: platforms.get(record.platformId)!,
  }));
};

const canonical = (value: string): string => value.normalize("NFKC").replace(/\s+/g, " ").trim();
const money = (value: number | null): string => value === null ? "미확인" : `${value.toLocaleString("ko-KR")}원`;

const currentSections = (product: SyntheticArtCurrentProduct): readonly { readonly title: string; readonly text: string }[] => {
  const { offering, artwork, artist, platform, analysis } = product;
  return [
    {
      title: "상품·작품 개요",
      text: [
        `상품명 ${offering.title}.`, `작품 ${artwork.title}.`, `가상 작가 ${artist.nameKo}${artist.nameEn ? ` (${artist.nameEn})` : ""}.`,
        `제작연도 ${artwork.productionYear ?? "미확인"}년.`, `재료 ${artwork.medium ?? "미확인"}.`,
        `크기 ${artwork.width ?? "미확인"}×${artwork.height ?? "미확인"}cm.`, `가상 플랫폼 ${platform.name}.`,
        `기준일 ${offering.asOfDate}.`, SYNTHETIC_ART_LIMITATION,
      ].join(" "),
    },
    {
      title: "공모 조건과 비용",
      text: [
        `공모총액 ${money(offering.totalOfferingAmount)}.`, `1조각 단가 ${money(offering.unitPrice)}.`,
        `발행 수량 ${offering.numberOfUnits?.toLocaleString("ko-KR") ?? "미확인"}개.`,
        `최소투자금 ${money(offering.minimumInvestment)}.`,
        `모집기간 ${offering.subscriptionStart ?? "미확인"}부터 ${offering.subscriptionEnd ?? "미확인"}까지.`,
        `취득가 ${money(offering.acquisitionPrice)}.`, `감정 참고값 ${money(offering.appraisalValue)}.`,
        ...offering.disclosedCosts.map((cost) => `${cost.label} ${money(cost.amount)}.`),
      ].join(" "),
    },
    {
      title: "분배·회수와 검토 메모",
      text: [
        `목표 보유기간 ${offering.targetHoldingMonths ?? "미확인"}개월.`,
        `분배 조건 ${offering.distributionTerms ?? "미확인"}.`, `회수 방식 ${offering.exitMethod ?? "미확인"}.`,
        `중도 이전 가능 여부 ${offering.midTermTransferAvailable === null ? "미확인" : offering.midTermTransferAvailable ? "가능" : "불가"}.`,
        `합성 분석 요약 ${analysis.summary}`, ...analysis.keyReasons.map((reason) => `${reason.title}: ${reason.finding} ${reason.implication}`),
        ...analysis.missingInformationRisks.map((risk) => `한계: ${risk}`), SYNTHETIC_ART_LIMITATION,
      ].join(" "),
    },
  ];
};

const knowledgeFor = (product: SyntheticArtCurrentProduct, sourceHash: string): ProductKnowledgeResult => {
  const { offering } = product;
  const documentId = `art-${offering.id}-synthetic-json`;
  const sourceUrl = `/art?product=${encodeURIComponent(offering.id)}`;
  const limitations = [SYNTHETIC_ART_LIMITATION];
  const base = {
    categoryId: "art" as const,
    productId: offering.id,
    scenarioId: SYNTHETIC_ART_SCENARIO_ID,
    dataNature: "scenario" as const,
    sourceId: documentId,
    documentId,
    title: `${offering.title} 합성 원천 JSON`,
    sourceKind: "scenario-input" as const,
    sourceUrl,
    asOf: offering.asOfDate,
    sourceHash,
    approvedForPublic: true,
    approvedForExternalAi: true,
    piiReviewStatus: "passed" as const,
    limitations,
  };
  const chunks = currentSections(product).map((section, index) => {
    const text = canonical(`${section.title}\n${section.text}`);
    const canonicalText = text;
    return {
      ...base,
      status: "ready" as const,
      chunkId: `${documentId}-${index + 1}`,
      page: index + 1,
      text,
      canonicalText,
      chunkHash: calculateCommonChunkHash({ page: index + 1, text, canonicalText, positions: [], pageQuality: "ready" }),
    };
  });
  return { documents: [{ ...base, status: "ready" }], chunks };
};

export const loadSyntheticArtKnowledge = async (
  productId: string,
  dataRoot = "data",
): Promise<ProductKnowledgeResult> => {
  const [raw, products] = await Promise.all([
    readFile(path.resolve(dataRoot, "synthetic/art-investment.json")),
    listSyntheticArtCurrentProducts(dataRoot),
  ]);
  const product = products.find((item) => item.offering.id === productId);
  return product ? knowledgeFor(product, hash(raw)) : { documents: [], chunks: [] };
};

export const listSyntheticArtKnowledge = async (
  dataRoot = "data",
): Promise<readonly { readonly product: SyntheticArtCurrentProduct; readonly knowledge: ProductKnowledgeResult }[]> => {
  const [raw, products] = await Promise.all([
    readFile(path.resolve(dataRoot, "synthetic/art-investment.json")),
    listSyntheticArtCurrentProducts(dataRoot),
  ]);
  const sourceHash = hash(raw);
  return products.map((product) => ({ product, knowledge: knowledgeFor(product, sourceHash) }));
};

export const syntheticArtContentHash = (knowledge: ProductKnowledgeResult): string =>
  hash(knowledge.chunks.map((chunk) => `${chunk.chunkId}:${chunk.chunkHash}`).join("\n"));
