import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import type {
  ProductKnowledgeChunk,
  ProductKnowledgeDocument,
  ProductKnowledgeResult,
} from "@/lib/db/repositories/types";
import { containsObviousPii } from "./public-safety";
import { loadApprovedCattleFilingArtifactsForProduct } from "./cattle-filing-artifact";
import { calculateCommonChunkHash } from "./pdf";
import {
  CommonChunkRecordSchema,
  CommonDocumentRecordSchema,
  CommonKnowledgeIndexSchema,
  type CommonChunkRecord,
  type CommonDocumentRecord,
  type CommonKnowledgeIndex,
} from "./schema";
import {
  ONBOARDING_CATALOG,
  validateOnboardingCatalog,
  type OnboardingCategory,
  type OnboardingProduct,
} from "@/lib/verify/dart/onboarding-catalog";
import { readExactLocalRawXml } from "@/lib/verify/dart/raw-xml";
import { findTableRanges, readTables } from "@/lib/verify/parse/tables";
import { outlineAt, readOutline, stripMarkup } from "@/lib/verify/parse/outline";

const CORPUS_VERSION = "dart-filing-corpus-v1" as const;
const SANITIZER_VERSION = "public-filing-sanitizer-v1" as const;
const CHUNKER_VERSION = "section-aware-filing-chunker-v1" as const;
const MAX_CHUNK_CHARS = 1_800;
const MIN_BLOCK_CHARS = 20;
const MAX_ARTIFACT_BYTES = 64 * 1024 * 1024;
const SAFE_ID = /^[a-z0-9-]+$/;
const DART_URL = "https://dart.fss.or.kr/dsaf001/main.do";
const LIMITATIONS = [
  "DART 공개 XML을 논리적 문단·표 순서로 정규화한 검색용 파생본입니다.",
  "개체·농장·개인 식별 가능성이 있는 블록은 결정적 규칙으로 제외했으며 원문 전체를 대체하지 않습니다.",
  "공시 간 정정 관계와 최신값은 자동 병합하지 않고 접수번호별 문서로 분리합니다.",
] as const;

const SENSITIVE_LABEL = /(?:주민등록|외국인등록|여권번호|운전면허|전화번호|휴대전화|연락처|이메일|전자우편|계좌번호|예금주|상세주소|농장번호|농장주|농가명|농가주소|이력번호|개체식별|개체번호|사육지|축사주소|소유자\s*(?:성명|주소)|대표자\s*(?:주민|생년월일|주소)|생년월일|서면문서\s*:|(?:로|길)\s*\d{1,5}(?:[-, ]|$))/i;
const SENSITIVE_SECTION = /(?:개체별\s*정보|개체\s*명세|사육\s*농가|농장\s*명세|개인정보|임원(?:의)?\s*인적사항|주주(?:의)?\s*인적사항)/i;

const CorpusManifestEntrySchema = z.strictObject({
  categoryId: z.enum(["cattle", "pig"]),
  productId: z.string().regex(SAFE_ID),
  title: z.string().min(1).max(500),
  file: z.string().regex(/^(?:cattle|pig)\/[a-z0-9-]+\.json$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  localRcpNos: z.array(z.string().regex(/^\d{14}$/)).min(1),
  unavailableRcpNos: z.array(z.string().regex(/^\d{14}$/)),
  documents: z.number().int().positive(),
  chunks: z.number().int().positive(),
  characters: z.number().int().positive(),
  excludedBlocks: z.number().int().nonnegative(),
  searchText: z.string().min(1),
});

const CorpusManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  artifactVersion: z.literal(CORPUS_VERSION),
  sanitizerVersion: z.literal(SANITIZER_VERSION),
  chunkerVersion: z.literal(CHUNKER_VERSION),
  generatedAt: z.string().datetime(),
  entries: z.array(CorpusManifestEntrySchema).length(12),
});

export type FilingCorpusManifest = z.infer<typeof CorpusManifestSchema>;

interface TextBlock {
  readonly offset: number;
  readonly path: readonly string[];
  readonly text: string;
}

interface BuildStats {
  excludedBlocks: number;
}

const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

const normalize = (value: string): string =>
  value.normalize("NFKC").replace(/\s+/g, " ").trim();

const publicDate = (rcpNo: string): string =>
  `${rcpNo.slice(0, 4)}-${rcpNo.slice(4, 6)}-${rcpNo.slice(6, 8)}`;

const dartUrl = (rcpNo: string): string => `${DART_URL}?rcpNo=${rcpNo}`;

const metadata = (xml: string): { readonly title: string; readonly publisher: string } => ({
  title: normalize(stripMarkup(/<DOCUMENT-NAME\b[^>]*>([\s\S]*?)<\/DOCUMENT-NAME>/i.exec(xml)?.[1] ?? "DART 공시 원문")),
  publisher: normalize(stripMarkup(/<COMPANY-NAME\b[^>]*>([\s\S]*?)<\/COMPANY-NAME>/i.exec(xml)?.[1] ?? "전자공시 제출인")),
});

const isSafeText = (text: string, sectionPath: readonly string[]): boolean =>
  text.length >= MIN_BLOCK_CHARS &&
  !containsObviousPii(text) &&
  !SENSITIVE_LABEL.test(text) &&
  !sectionPath.some((title) => SENSITIVE_SECTION.test(title) || SENSITIVE_LABEL.test(title));

const tableText = (xml: string): string => readTables(xml)
  .flatMap((table) => [table.header, ...table.rows])
  .map((row) => row.map(normalize).filter(Boolean).join(" | "))
  .filter(Boolean)
  .join("\n");

const extractBlocks = (xml: string): { readonly blocks: readonly TextBlock[]; readonly stats: BuildStats } => {
  const ranges = findTableRanges(xml);
  const outline = readOutline(xml, ranges);
  const blocks: TextBlock[] = [];
  const seen = new Set<string>();
  let excludedBlocks = 0;
  let rangeIndex = 0;
  const insideTable = (offset: number): boolean => {
    while (ranges[rangeIndex] && offset >= ranges[rangeIndex]![1]) rangeIndex += 1;
    const range = ranges[rangeIndex];
    return Boolean(range && offset >= range[0] && offset < range[1]);
  };
  const add = (offset: number, raw: string): void => {
    const text = normalize(raw);
    const sectionPath = outlineAt(outline, offset).map((node) => normalize(node.title)).filter(Boolean);
    if (!isSafeText(text, sectionPath)) {
      excludedBlocks += 1;
      return;
    }
    const key = sha256(text);
    if (seen.has(key)) return;
    seen.add(key);
    blocks.push({ offset, path: sectionPath, text });
  };

  const paragraphPattern = /<P\b[^>]*>([\s\S]*?)<\/P>/gi;
  for (let match = paragraphPattern.exec(xml); match !== null; match = paragraphPattern.exec(xml)) {
    if (!insideTable(match.index)) add(match.index, stripMarkup(match[1] ?? ""));
  }
  for (const [start, end] of ranges) add(start, tableText(xml.slice(start, end)));
  return { blocks: blocks.sort((left, right) => left.offset - right.offset), stats: { excludedBlocks } };
};

const splitLongText = (text: string): readonly string[] => {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > MAX_CHUNK_CHARS) {
    const window = rest.slice(0, MAX_CHUNK_CHARS + 1);
    const boundary = Math.max(window.lastIndexOf(". "), window.lastIndexOf("다. "), window.lastIndexOf(" | "), window.lastIndexOf(" "));
    const end = boundary >= Math.floor(MAX_CHUNK_CHARS * 0.6) ? boundary + 1 : MAX_CHUNK_CHARS;
    parts.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) parts.push(rest);
  return parts;
};

const chunkBlocks = (blocks: readonly TextBlock[]): readonly { readonly path: readonly string[]; readonly text: string }[] => {
  const chunks: { path: readonly string[]; text: string }[] = [];
  let pending: { path: readonly string[]; text: string } | null = null;
  const flush = (): void => {
    if (pending) chunks.push(pending);
    pending = null;
  };
  for (const block of blocks) {
    for (const part of splitLongText(block.text)) {
      const samePath = pending !== null && JSON.stringify(pending.path) === JSON.stringify(block.path);
      if (pending !== null && samePath && `${pending.text}\n${part}`.length <= MAX_CHUNK_CHARS) {
        pending = { path: pending.path, text: `${pending.text}\n${part}` };
      } else {
        flush();
        pending = { path: block.path, text: part };
      }
    }
  }
  flush();
  return chunks;
};

const commonChunk = (input: {
  readonly categoryId: OnboardingCategory;
  readonly productId: string;
  readonly documentId: string;
  readonly sourceHash: string;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly index: number;
  readonly page: number;
  readonly title: string;
  readonly text: string;
  readonly sourceKind?: "official-document" | "external-observation";
}): CommonChunkRecord => {
  const canonicalText = input.text;
  const base = {
    schemaVersion: 1 as const,
    categoryId: input.categoryId,
    productId: input.productId,
    documentId: input.documentId,
    chunkId: `${input.documentId}-chunk-${String(input.index + 1).padStart(4, "0")}`,
    title: input.title,
    sourceKind: input.sourceKind ?? "official-document" as const,
    sourceUrl: input.sourceUrl,
    asOf: input.asOf,
    dataNature: "observed" as const,
    page: input.page,
    text: input.text,
    canonicalText,
    positions: [],
    pageQuality: "ready" as const,
    sourceHash: input.sourceHash,
    approvedForPublic: true,
    approvedForExternalAi: false,
    piiReviewStatus: "passed" as const,
    status: "ready" as const,
    limitations: [...LIMITATIONS],
  };
  return CommonChunkRecordSchema.parse({ ...base, chunkHash: calculateCommonChunkHash(base) });
};

const buildFilingDocument = async (
  dataRoot: string,
  product: OnboardingProduct,
  rcpNo: string,
): Promise<{ readonly document: CommonDocumentRecord; readonly chunks: readonly CommonChunkRecord[]; readonly excludedBlocks: number }> => {
  const entryName = `${rcpNo}.xml`;
  const { bytes } = await readExactLocalRawXml({ dataDir: dataRoot, rcpNo, entryName });
  const sourceHash = sha256(bytes);
  const xml = new TextDecoder("utf-8").decode(bytes);
  const info = metadata(xml);
  const extracted = extractBlocks(xml);
  const grouped = chunkBlocks(extracted.blocks);
  if (grouped.length === 0) throw new Error(`공개 가능한 공시 청크가 없습니다: ${rcpNo}`);
  const documentId = `${product.categoryId}-${product.productId}-dart-full-${rcpNo}`;
  const pageKeys = new Map<string, number>();
  const chunks = grouped.map((chunk, index) => {
    const key = chunk.path.slice(0, 2).join(" > ") || "문서 본문";
    if (!pageKeys.has(key)) pageKeys.set(key, pageKeys.size + 1);
    const title = [info.title, ...chunk.path].filter(Boolean).join(" > ").slice(0, 500);
    return commonChunk({
      categoryId: product.categoryId,
      productId: product.productId,
      documentId,
      sourceHash,
      sourceUrl: dartUrl(rcpNo),
      asOf: publicDate(rcpNo),
      index,
      page: pageKeys.get(key)!,
      title,
      text: chunk.path.length > 0 ? `${chunk.path.join(" > ")}\n${chunk.text}` : chunk.text,
    });
  });
  if (pageKeys.size > 250) throw new Error(`논리 페이지 상한을 초과했습니다: ${rcpNo}`);
  const pageChunkCounts = new Map<number, number>();
  for (const chunk of chunks) pageChunkCounts.set(chunk.page, (pageChunkCounts.get(chunk.page) ?? 0) + 1);
  const document = CommonDocumentRecordSchema.parse({
    schemaVersion: 1,
    categoryId: product.categoryId,
    productId: product.productId,
    documentId,
    title: info.title,
    publisher: info.publisher,
    sourceKind: "official-document",
    sourceUrl: dartUrl(rcpNo),
    asOf: publicDate(rcpNo),
    collectedAt: `${publicDate(rcpNo)}T00:00:00.000Z`,
    dataNature: "observed",
    rightsStatus: "unknown",
    approvedForPublic: true,
    approvedForExternalAi: false,
    piiReviewStatus: "passed",
    sourceHash,
    status: "ready",
    pages: [...pageChunkCounts].map(([page, count]) => ({
      page,
      quality: "ready",
      metrics: { itemCount: count, characterCount: chunks.filter((chunk) => chunk.page === page).reduce((sum, chunk) => sum + chunk.text.length, 0), density: 1 },
      limitations: [...LIMITATIONS],
    })),
    limitations: [...LIMITATIONS],
  });
  return { document, chunks, excludedBlocks: extracted.stats.excludedBlocks };
};

const externalDocument = (input: {
  readonly categoryId: OnboardingCategory;
  readonly productId: string;
  readonly suffix: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly sourceHash: string;
  readonly text: string;
  readonly limitations?: readonly string[];
}): { readonly document: CommonDocumentRecord; readonly chunks: readonly CommonChunkRecord[] } => {
  const documentId = `${input.categoryId}-${input.productId}-external-${input.suffix}`;
  const limitations = [...(input.limitations ?? [
    "공개 외부자료의 비식별 집계만 상품 검토 문맥에 연결했으며 해당 상품의 개별 자산과 직접 일치함을 뜻하지 않습니다.",
  ])];
  const document = CommonDocumentRecordSchema.parse({
    schemaVersion: 1,
    categoryId: input.categoryId,
    productId: input.productId,
    documentId,
    title: input.title,
    publisher: "공공데이터 제공기관",
    sourceKind: "external-observation",
    sourceUrl: input.sourceUrl,
    asOf: input.asOf,
    collectedAt: `${input.asOf}T00:00:00.000Z`,
    dataNature: "observed",
    rightsStatus: "licensed",
    approvedForPublic: true,
    approvedForExternalAi: false,
    piiReviewStatus: "passed",
    sourceHash: input.sourceHash,
    status: "ready",
    pages: [{ page: 1, quality: "ready", metrics: { itemCount: 1, characterCount: input.text.length, density: 1 }, limitations }],
    limitations,
  });
  const chunk = commonChunk({ ...input, documentId, index: 0, page: 1, sourceKind: "external-observation" });
  return { document, chunks: [{ ...chunk, limitations }] };
};

const readJson = async <T>(file: string): Promise<{ readonly value: T; readonly bytes: Uint8Array }> => {
  const bytes = new Uint8Array(await readFile(file));
  return { value: JSON.parse(new TextDecoder().decode(bytes)) as T, bytes };
};

interface DiseaseEventSource {
  readonly asOf: string;
  readonly source: { readonly boardUrl: string };
  readonly events: readonly {
    readonly disease?: "FMD" | "LSD";
    readonly occurredAt: string;
    readonly species?: "cattle" | "pig" | "goat";
    readonly raisedHeadCount?: number | null;
    readonly culledHeadCount?: number | null;
    readonly province: string;
    readonly region: string;
  }[];
}

const DISEASE_LABELS = {
  ASF: "아프리카돼지열병",
  FMD: "구제역",
  LSD: "럼피스킨",
} as const;

const diseaseDocuments = (
  product: OnboardingProduct,
  input: {
    readonly code: keyof typeof DISEASE_LABELS;
    readonly source: DiseaseEventSource;
    readonly bytes: Uint8Array;
  },
): readonly { readonly document: CommonDocumentRecord; readonly chunks: readonly CommonChunkRecord[] }[] => {
  const events = input.source.events.filter((event) =>
    (event.species ?? "pig") === product.categoryId,
  );
  const byYear = Map.groupBy(events, (event) => event.occurredAt.slice(0, 4));
  return [...byYear.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([year, rows]) => {
    const provinces = [...Map.groupBy(rows, (event) => event.province)]
      .map(([province, values]) => `${province} ${values.length}건`)
      .sort((left, right) => left.localeCompare(right, "ko-KR"));
    const occurrences = rows.map((event) => {
      const count = event.culledHeadCount ?? event.raisedHeadCount;
      const countLabel = event.culledHeadCount !== undefined ? "살처분 규모" : "사육두수";
      return `${event.occurredAt} ${event.region}${count === null || count === undefined ? "" : ` (${countLabel} ${count.toLocaleString("ko-KR")}두)`}`;
    });
    const label = DISEASE_LABELS[input.code];
    return externalDocument({
      categoryId: product.categoryId,
      productId: product.productId,
      suffix: `disease-${input.code.toLocaleLowerCase()}-${year}`,
      title: `${label}(${input.code}) 공개 발생 이력 — ${year}년`,
      sourceUrl: input.source.source.boardUrl,
      asOf: input.source.asOf,
      sourceHash: sha256(input.bytes),
      text: `${year}년 ${product.categoryId === "cattle" ? "한우" : "한돈"} 관련 ${label}(${input.code}) 공개 발생 ${rows.length}건. 지역별 집계: ${provinces.join(", ")}. 발생 목록: ${occurrences.join("; ")}.`,
      limitations: [
        "농림축산식품부 공개 발생일·시도·시군구 자료이며 농장명·농장주·읍면동 이하 상세주소는 포함하지 않습니다.",
        "공개 지역 발생 이력은 해당 상품의 개별 가축 감염이나 손익 영향을 뜻하지 않습니다.",
      ],
    });
  });
};

const buildExternalDocuments = async (
  dataRoot: string,
  product: OnboardingProduct,
): Promise<readonly { readonly document: CommonDocumentRecord; readonly chunks: readonly CommonChunkRecord[] }[]> => {
  if (product.categoryId === "cattle") {
    const [auction, artifacts, fmd, lsd] = await Promise.all([readJson<{
      month: string; partial: boolean; sourceName: string; entries: readonly { sexName: string; status: string; averagePricePerKg?: number; sampleSize?: number }[];
    }>(path.join(dataRoot, "reference/auction-price/024001-2026-08.json")),
    loadApprovedCattleFilingArtifactsForProduct("cattle", product.productId, dataRoot),
    readJson<DiseaseEventSource>(path.join(dataRoot, "reference/livestock-disease/fmd/mafra_fmd_events.json")),
    readJson<DiseaseEventSource>(path.join(dataRoot, "reference/livestock-disease/lsd/mafra_lsd_events.json"))]);
    const text = `한우 경락가격 공개 집계 ${auction.value.month}${auction.value.partial ? "(부분 월)" : ""}. ` +
      auction.value.entries.filter((item) => item.status === "ok").map((item) =>
        `${item.sexName} 평균 ${item.averagePricePerKg?.toLocaleString("ko-KR")}원/kg, 표본 ${item.sampleSize?.toLocaleString("ko-KR")}두`
      ).join("; ");
    const trace = artifacts.flatMap((artifact) => artifact.externalObservations).at(0);
    return [externalDocument({
      categoryId: "cattle",
      productId: product.productId,
      suffix: "auction-2026-08",
      title: auction.value.sourceName,
      sourceUrl: "https://www.data.go.kr/data/15058822/openapi.do",
      asOf: "2026-08-13",
      sourceHash: sha256(auction.bytes),
      text,
    }), ...(trace ? [externalDocument({
      categoryId: "cattle",
      productId: product.productId,
      suffix: "trace-summary",
      title: "축산물이력제 공개 대조 집계",
      sourceUrl: trace.sourceUrl,
      asOf: trace.observedAt.slice(0, 10),
      sourceHash: trace.sourceHash,
      text: trace.fieldSummary.map((item) =>
        `${item.field}: 일치 ${item.matchCount}건, 불일치 ${item.mismatchCount}건, 대조 불가 ${item.unverifiableCount}건`
      ).join("; "),
    })] : []),
    ...diseaseDocuments(product, { code: "FMD", source: fmd.value, bytes: fmd.bytes }),
    ...diseaseDocuments(product, { code: "LSD", source: lsd.value, bytes: lsd.bytes })];
  }
  const [asf, fmd, priceMeta] = await Promise.all([
    readJson<DiseaseEventSource>(path.join(dataRoot, "reference/pig-asf/mafra_asf_events.json")),
    readJson<DiseaseEventSource>(path.join(dataRoot, "reference/livestock-disease/fmd/mafra_fmd_events.json")),
    readJson<{ sourceName: string; sourceUrl: string; sha256: string; filters: Record<string, string>; derivedMonths: readonly string[]; note: string }>(path.join(dataRoot, "reference/pig-auction-price/pig_price_20260815021618.meta.json")),
  ]);
  return [
    externalDocument({
      categoryId: "pig",
      productId: product.productId,
      suffix: "auction-2026-07",
      title: priceMeta.value.sourceName,
      sourceUrl: priceMeta.value.sourceUrl,
      asOf: "2026-08-15",
      sourceHash: priceMeta.value.sha256,
      text: `돼지 경락가격 공개 파일의 필터는 ${Object.values(priceMeta.value.filters).join(", ")}이고 파생 월은 ${priceMeta.value.derivedMonths.join(", ")}입니다. ${priceMeta.value.note}`,
    }),
    ...diseaseDocuments(product, { code: "ASF", source: asf.value, bytes: asf.bytes }),
    ...diseaseDocuments(product, { code: "FMD", source: fmd.value, bytes: fmd.bytes }),
  ];
};

const generatedAtFor = (product: OnboardingProduct): string => {
  const latest = [...product.candidateRcpNos].filter((rcpNo) => /^\d{14}$/.test(rcpNo)).sort().at(-1)!;
  return `${publicDate(latest)}T00:00:00.000Z`;
};

const productSearchText = (index: CommonKnowledgeIndex): string => {
  const terms = new Set<string>();
  for (const value of [
    ...index.documents.flatMap((document) => [document.productId, document.title]),
    ...index.chunks.flatMap((chunk) => [chunk.title, chunk.canonicalText]),
  ]) {
    for (const term of normalize(value).split(/[^0-9A-Za-z가-힣.%-]+/).filter((item) => item.length >= 2)) {
      terms.add(term);
    }
  }
  return [...terms].sort((left, right) => left.localeCompare(right, "ko")).join(" ");
};

export const buildFilingCorpusProduct = async (
  product: OnboardingProduct,
  dataRoot = "data",
): Promise<{ readonly index: CommonKnowledgeIndex; readonly excludedBlocks: number }> => {
  const local = product.inventory.filter((item) => item.status === "local");
  const filings = await Promise.all(local.map((item) => buildFilingDocument(dataRoot, product, item.rcpNo)));
  const external = await buildExternalDocuments(dataRoot, product);
  return {
    index: CommonKnowledgeIndexSchema.parse({
      schemaVersion: 1,
      generatedAt: generatedAtFor(product),
      products: [],
      documents: [...filings.map((item) => item.document), ...external.map((item) => item.document)],
      chunks: [...filings.flatMap((item) => item.chunks), ...external.flatMap((item) => item.chunks)],
    }),
    excludedBlocks: filings.reduce((sum, item) => sum + item.excludedBlocks, 0),
  };
};

const corpusRoot = (dataRoot: string): string => path.resolve(dataRoot, "knowledge/derived/filing-corpus");

export const writeFilingCorpus = async (dataRoot = "data"): Promise<FilingCorpusManifest> => {
  const root = corpusRoot(dataRoot);
  const staging = `${root}.staging-${process.pid}`;
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  const entries: z.infer<typeof CorpusManifestEntrySchema>[] = [];
  try {
    for (const product of validateOnboardingCatalog(ONBOARDING_CATALOG)) {
      const built = await buildFilingCorpusProduct(product, dataRoot);
      const file = `${product.categoryId}/${product.productId}.json`;
      const output = `${JSON.stringify(built.index)}\n`;
      await mkdir(path.dirname(path.join(staging, file)), { recursive: true });
      await writeFile(path.join(staging, file), output, "utf8");
      entries.push({
        categoryId: product.categoryId,
        productId: product.productId,
        title: built.index.documents.find((document) => document.sourceKind === "official-document")!.title,
        file,
        sha256: sha256(output),
        localRcpNos: product.inventory.filter((item) => item.status === "local").map((item) => item.rcpNo),
        unavailableRcpNos: product.inventory.filter((item) => item.status === "source-unavailable").map((item) => item.rcpNo),
        documents: built.index.documents.length,
        chunks: built.index.chunks.length,
        characters: built.index.chunks.reduce((sum, chunk) => sum + chunk.canonicalText.length, 0),
        excludedBlocks: built.excludedBlocks,
        searchText: productSearchText(built.index),
      });
    }
    const generatedAt = entries.map((entry) => entry.localRcpNos.at(-1) ?? "19700101000000").sort().at(-1)!;
    const manifest = CorpusManifestSchema.parse({
      schemaVersion: 1,
      artifactVersion: CORPUS_VERSION,
      sanitizerVersion: SANITIZER_VERSION,
      chunkerVersion: CHUNKER_VERSION,
      generatedAt: `${publicDate(generatedAt)}T00:00:00.000Z`,
      entries,
    });
    await writeFile(path.join(staging, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await rm(root, { recursive: true, force: true });
    await rename(staging, root);
    return manifest;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
};

const readSafeFile = async (file: string): Promise<Uint8Array> => {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > MAX_ARTIFACT_BYTES) {
    throw new Error(`안전하지 않은 filing corpus 파일입니다: ${path.basename(file)}`);
  }
  return new Uint8Array(await readFile(file));
};

const validateProductIndex = (
  index: CommonKnowledgeIndex,
  entry: z.infer<typeof CorpusManifestEntrySchema>,
): CommonKnowledgeIndex => {
  const expectedRcp = new Set(entry.localRcpNos);
  const filingDocuments = index.documents.filter((item) => item.sourceKind === "official-document");
  if (filingDocuments.length !== expectedRcp.size || index.documents.length !== entry.documents || index.chunks.length !== entry.chunks) {
    throw new Error(`filing corpus 개수가 manifest와 다릅니다: ${entry.productId}`);
  }
  for (const document of index.documents) {
    if (document.categoryId !== entry.categoryId || document.productId !== entry.productId || !document.approvedForPublic || document.approvedForExternalAi || document.piiReviewStatus !== "passed") {
      throw new Error(`filing corpus 문서 범위 또는 공개 게이트가 잘못됐습니다: ${document.documentId}`);
    }
    if (document.sourceKind === "official-document") {
      const rcpNo = new URL(document.sourceUrl).searchParams.get("rcpNo");
      if (!rcpNo || !expectedRcp.delete(rcpNo)) throw new Error(`filing corpus RCP가 inventory와 다릅니다: ${document.documentId}`);
    }
  }
  if (expectedRcp.size > 0) throw new Error(`filing corpus RCP가 누락됐습니다: ${entry.productId}`);
  const byDocument = new Map(index.documents.map((item) => [item.documentId, item]));
  for (const chunk of index.chunks) {
    const document = byDocument.get(chunk.documentId);
    if (!document || chunk.categoryId !== document.categoryId || chunk.productId !== document.productId || chunk.sourceHash !== document.sourceHash ||
      chunk.approvedForExternalAi || chunk.piiReviewStatus !== "passed" || containsObviousPii(chunk.canonicalText) || SENSITIVE_LABEL.test(chunk.canonicalText) ||
      calculateCommonChunkHash(chunk) !== chunk.chunkHash) {
      throw new Error(`filing corpus 청크 검증에 실패했습니다: ${chunk.chunkId}`);
    }
  }
  return index;
};

const corpusCache = new Map<string, Promise<readonly CommonKnowledgeIndex[]>>();

const loadAll = async (dataRoot: string): Promise<readonly CommonKnowledgeIndex[]> => {
  const root = corpusRoot(dataRoot);
  const manifest = CorpusManifestSchema.parse(JSON.parse(new TextDecoder().decode(await readSafeFile(path.join(root, "manifest.json")))));
  const catalog = validateOnboardingCatalog(ONBOARDING_CATALOG);
  const expectedProducts = new Set(catalog.map((item) => `${item.categoryId}/${item.productId}`));
  if (manifest.entries.some((entry) => !expectedProducts.delete(`${entry.categoryId}/${entry.productId}`)) || expectedProducts.size > 0) {
    throw new Error("filing corpus 상품 집합이 onboarding catalog와 다릅니다.");
  }
  return Promise.all(manifest.entries.map(async (entry) => {
    const file = path.resolve(root, entry.file);
    if (!file.startsWith(`${root}${path.sep}`)) throw new Error("filing corpus 경로가 루트를 벗어났습니다.");
    const bytes = await readSafeFile(file);
    if (sha256(bytes) !== entry.sha256) throw new Error(`filing corpus 파일 hash가 다릅니다: ${entry.file}`);
    return validateProductIndex(CommonKnowledgeIndexSchema.parse(JSON.parse(new TextDecoder().decode(bytes))), entry);
  }));
};

const loadManifest = async (dataRoot: string): Promise<FilingCorpusManifest> => {
  const root = corpusRoot(dataRoot);
  return CorpusManifestSchema.parse(JSON.parse(new TextDecoder().decode(await readSafeFile(path.join(root, "manifest.json")))));
};

export const loadFilingCorpus = async (dataRoot = "data"): Promise<readonly CommonKnowledgeIndex[]> => {
  const root = corpusRoot(dataRoot);
  const cacheable = root === corpusRoot("data") || process.env.NODE_ENV === "production";
  if (!cacheable) return loadAll(dataRoot);
  const manifestHash = sha256(await readSafeFile(path.join(root, "manifest.json")));
  const cacheKey = `${root}\u0000${manifestHash}`;
  const existing = corpusCache.get(cacheKey);
  if (existing) return existing;
  const pending = loadAll(dataRoot);
  for (const key of corpusCache.keys()) {
    if (key.startsWith(`${root}\u0000`) && key !== cacheKey) corpusCache.delete(key);
  }
  corpusCache.set(cacheKey, pending);
  void pending.catch(() => {
    if (corpusCache.get(cacheKey) === pending) corpusCache.delete(cacheKey);
  });
  return pending;
};

export const loadFilingCorpusIfPresent = async (dataRoot = "data"): Promise<readonly CommonKnowledgeIndex[]> => {
  const manifest = path.join(corpusRoot(dataRoot), "manifest.json");
  const stat = await lstat(manifest).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return stat === null ? [] : loadFilingCorpus(dataRoot);
};

export const loadFilingCorpusSearchEntries = async (
  dataRoot = "data",
): Promise<FilingCorpusManifest["entries"]> => {
  const stat = await lstat(path.join(corpusRoot(dataRoot), "manifest.json")).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return stat === null ? [] : (await loadManifest(dataRoot)).entries;
};

const productIndexCache = new Map<string, Promise<CommonKnowledgeIndex>>();

const loadProductIndex = async (
  entry: FilingCorpusManifest["entries"][number],
  dataRoot: string,
): Promise<CommonKnowledgeIndex> => {
  const root = corpusRoot(dataRoot);
  const file = path.resolve(root, entry.file);
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error("filing corpus 경로가 루트를 벗어났습니다.");
  const load = async (): Promise<CommonKnowledgeIndex> => {
    const bytes = await readSafeFile(file);
    if (sha256(bytes) !== entry.sha256) throw new Error(`filing corpus 파일 hash가 다릅니다: ${entry.file}`);
    return validateProductIndex(CommonKnowledgeIndexSchema.parse(JSON.parse(new TextDecoder().decode(bytes))), entry);
  };
  const cacheable = root === corpusRoot("data") || process.env.NODE_ENV === "production";
  if (!cacheable) return load();
  const cacheKey = `${file}\u0000${entry.sha256}`;
  const existing = productIndexCache.get(cacheKey);
  if (existing) return existing;
  const pending = load();
  for (const key of productIndexCache.keys()) {
    if (key.startsWith(`${file}\u0000`) && key !== cacheKey) productIndexCache.delete(key);
  }
  productIndexCache.set(cacheKey, pending);
  void pending.catch(() => {
    if (productIndexCache.get(cacheKey) === pending) productIndexCache.delete(cacheKey);
  });
  return pending;
};

export const loadFilingCorpusForProduct = async (
  categoryId: string,
  productId: string,
  dataRoot = "data",
): Promise<CommonKnowledgeIndex | null> => {
  return (await loadFilingCorpusProductSnapshot(categoryId, productId, dataRoot))?.index ?? null;
};

export const loadFilingCorpusProductSnapshot = async (
  categoryId: string,
  productId: string,
  dataRoot = "data",
): Promise<{ readonly index: CommonKnowledgeIndex; readonly manifestSha256: string } | null> => {
  if ((categoryId !== "cattle" && categoryId !== "pig") || !SAFE_ID.test(productId)) return null;
  const manifestFile = path.join(corpusRoot(dataRoot), "manifest.json");
  const manifestStat = await lstat(manifestFile).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (manifestStat === null) return null;
  const manifestBytes = await readSafeFile(manifestFile);
  const manifestSha256 = sha256(manifestBytes);
  const manifest = CorpusManifestSchema.parse(JSON.parse(new TextDecoder().decode(manifestBytes)));
  const entry = manifest.entries.find((item) =>
    item.categoryId === categoryId && item.productId === productId
  );
  if (!entry) return null;
  const index = await loadProductIndex(entry, dataRoot);
  if (sha256(await readSafeFile(manifestFile)) !== manifestSha256) {
    throw new Error("filing corpus manifest가 로드 중 변경되었습니다.");
  }
  return { index, manifestSha256 };
};

export const filingCorpusKnowledge = (index: CommonKnowledgeIndex): ProductKnowledgeResult => ({
  documents: index.documents.map((document): ProductKnowledgeDocument => ({
    categoryId: document.categoryId,
    productId: document.productId,
    dataNature: document.dataNature,
    sourceId: document.documentId,
    documentId: document.documentId,
    title: document.title,
    sourceKind: document.sourceKind,
    sourceUrl: document.sourceUrl,
    asOf: document.asOf,
    sourceHash: document.sourceHash,
    status: document.status === "ready" ? "ready" : "partial",
    approvedForPublic: document.approvedForPublic,
    approvedForExternalAi: document.approvedForExternalAi,
    piiReviewStatus: document.piiReviewStatus,
    limitations: document.limitations,
  })),
  chunks: index.chunks.map((chunk): ProductKnowledgeChunk => ({
    categoryId: chunk.categoryId,
    productId: chunk.productId,
    dataNature: chunk.dataNature,
    sourceId: chunk.documentId,
    documentId: chunk.documentId,
    chunkId: chunk.chunkId,
    title: chunk.title,
    sourceKind: chunk.sourceKind,
    sourceUrl: chunk.sourceUrl,
    asOf: chunk.asOf,
    sourceHash: chunk.sourceHash,
    status: "ready",
    approvedForPublic: chunk.approvedForPublic,
    approvedForExternalAi: chunk.approvedForExternalAi,
    piiReviewStatus: chunk.piiReviewStatus,
    limitations: chunk.limitations,
    page: chunk.page,
    text: chunk.text,
    canonicalText: chunk.canonicalText,
    chunkHash: chunk.chunkHash,
  })),
});

export const matchesFilingCorpusKnowledge = (
  index: CommonKnowledgeIndex,
  knowledge: ProductKnowledgeResult,
): boolean => {
  const expected = filingCorpusKnowledge(index);
  const documents = new Set(knowledge.documents.map((item) => `${item.documentId}:${item.sourceHash}`));
  const chunks = new Set(knowledge.chunks.map((item) => `${item.chunkId}:${item.chunkHash}`));
  return expected.documents.every((item) => documents.has(`${item.documentId}:${item.sourceHash}`)) &&
    expected.chunks.every((item) => chunks.has(`${item.chunkId}:${item.chunkHash}`));
};

export const auditFilingCorpus = async (dataRoot = "data"): Promise<readonly string[]> => {
  try {
    const indexes = await loadFilingCorpusIfPresent(dataRoot);
    if (indexes.length === 0) return [];
    const documents = indexes.reduce((sum, index) => sum + index.documents.length, 0);
    const chunks = indexes.reduce((sum, index) => sum + index.chunks.length, 0);
    return documents > 37 && chunks > documents ? [] : ["filing corpus 범위가 37개 공시와 외부 관측을 포함하지 않습니다."];
  } catch (error) {
    return [(error as Error).message];
  }
};

export const filingCorpusSummary = async (dataRoot = "data") => {
  const root = corpusRoot(dataRoot);
  return CorpusManifestSchema.parse(JSON.parse(new TextDecoder().decode(await readSafeFile(path.join(root, "manifest.json")))));
};
