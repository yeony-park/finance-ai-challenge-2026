import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import { z } from "zod";

import {
  CommonChunkRecordSchema,
  CommonDocumentRecordSchema,
} from "@/lib/knowledge/schema";
import { calculateCommonChunkHash } from "@/lib/knowledge/pdf";
import { parseFilingFacts, type FilingFacts } from "../report/filing-facts";
import { rawDataDir } from "../paths";
import { outlineAt, stripMarkup, type OutlineNode } from "../parse/outline";
import { parseDocument } from "../parse/document";
import {
  DartFilingRegistrySchema,
  sha256,
  type DartFilingRegistry,
} from "./filing-registry";

const SAFE_DART_URL = "https://dart.fss.or.kr/dsaf001/main.do";
const SANITIZER_VERSION = "cattle-filing-sanitizer-v1" as const;
const ARTIFACT_VERSION = "cattle-filing-derived-v1" as const;
const FORBIDDEN_KEY = /(?:traceNo|cattleNo|farmNo|currentFarmNo|farmer|address|farmHistory)/i;
const FORBIDDEN_TEXT = /(?:이력번호|농장번호|농장주|상세주소|사육이력)/;

const SectionSchema = z.strictObject({
  sectionId: z.string().regex(/^[a-z0-9-]+$/),
  factId: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  text: z.string().min(1),
  sectionPath: z.array(z.string().min(1)).min(1),
  charRange: z.strictObject({ start: z.number().int().nonnegative(), end: z.number().int().positive() }),
  anchorOffset: z.number().int().nonnegative(),
  occurrence: z.number().int().positive(),
  normalizedExcerptHash: z.string().regex(/^[a-f0-9]{64}$/),
  sectionHash: z.string().regex(/^[a-f0-9]{64}$/),
});

const ObservationSchema = z.strictObject({
  sourceKind: z.literal("external-observation"),
  sourceUrl: z.literal("https://www.data.go.kr"),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  observedAt: z.string().datetime({ offset: true }),
  allowedFields: z.array(z.enum(["품종", "성별", "취득시기"])).min(1),
  fieldSummary: z.array(z.strictObject({
    field: z.enum(["품종", "성별", "취득시기"]),
    matchCount: z.number().int().nonnegative(),
    mismatchCount: z.number().int().nonnegative(),
    unverifiableCount: z.number().int().nonnegative(),
  })),
  limitations: z.array(z.string().min(1)).min(1),
});

export const CattleFilingDerivedArtifactSchema = z.strictObject({
  schemaVersion: z.literal(1),
  artifactVersion: z.literal(ARTIFACT_VERSION),
  artifactHash: z.string().regex(/^[a-f0-9]{64}$/),
  registry: DartFilingRegistrySchema,
  registryHash: z.string().regex(/^[a-f0-9]{64}$/),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  sanitizerVersion: z.literal(SANITIZER_VERSION),
  sourceFileMtime: z.string().datetime({ offset: true }),
  approval: DartFilingRegistrySchema.shape.approval,
  sections: z.array(SectionSchema).min(1).max(50),
  document: CommonDocumentRecordSchema,
  chunks: z.array(CommonChunkRecordSchema).min(1).max(50),
  externalObservations: z.array(ObservationSchema).max(1),
  limitations: z.array(z.string().min(1)).min(1),
});

export type CattleFilingDerivedArtifact = z.infer<typeof CattleFilingDerivedArtifactSchema>;

const canonicalText = (value: string): string => value.normalize("NFKC").replace(/\s+/g, " ").trim();

const assertFactMatchesExcerpt = (
  fact: FilingFacts["facts"][number],
  locator: DartFilingRegistry["sectionLocators"][number],
  excerpt: string,
): void => {
  const factText = canonicalText(`${fact.label} ${fact.value}`).replaceAll(",", "");
  const excerptText = canonicalText(excerpt).replaceAll(",", "");
  const missing = locator.evidenceTokens.filter((token) =>
    !factText.includes(token.replaceAll(",", "")) || !excerptText.includes(token.replaceAll(",", "")),
  );
  if (missing.length > 0) {
    throw new Error(`승인 filing fact 핵심값이 XML excerpt에 없습니다: ${fact.id}`);
  }
};

const enclosingExcerpt = (
  xml: string,
  anchorOffset: number,
  anchor: string,
): { readonly text: string; readonly charRange: { readonly start: number; readonly end: number } } => {
  const patterns = [/<P\b[^>]*>([\s\S]*?)<\/P>/gi, /<TABLE\b[^>]*>([\s\S]*?)<\/TABLE>/gi];
  for (const pattern of patterns) {
    for (let match = pattern.exec(xml); match !== null; match = pattern.exec(xml)) {
      const raw = match[0] ?? "";
      const start = match.index;
      const end = start + raw.length;
      if (anchorOffset < start || anchorOffset >= end) continue;
      const text = canonicalText(stripMarkup(raw));
      if (!text.includes(anchor) || text.length === 0 || text.length > 8_000) break;
      if (canonicalText(stripMarkup(xml.slice(start, end))) !== text) {
        throw new Error("XML excerpt 정규화 검증에 실패했습니다.");
      }
      return { text, charRange: { start, end } };
    }
  }
  throw new Error("승인 locator 주변의 최소 XML 문단 또는 표를 추출하지 못했습니다.");
};

export const calculateCattleFilingArtifactHash = (value: Omit<CattleFilingDerivedArtifact, "artifactHash">): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const assertNoSensitiveContent = (value: unknown): void => {
  const inspect = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(inspect);
    if (node && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        if (FORBIDDEN_KEY.test(key)) throw new Error(`PII 금지 key가 artifact에 포함되었습니다: ${key}`);
        inspect(child);
      }
      return;
    }
    if (typeof node === "string" && FORBIDDEN_TEXT.test(node)) {
      throw new Error("PII 식별 필드명이 artifact 텍스트에 포함되었습니다.");
    }
  };
  inspect(value);
};

const exactXmlEntry = (
  entries: Readonly<Record<string, Uint8Array>>,
  registry: DartFilingRegistry,
): Uint8Array => {
  const xmlEntries = Object.entries(entries)
    .filter(([name]) => name.toLowerCase().endsWith(".xml"))
    .sort(([left], [right]) => left.localeCompare(right));
  if (xmlEntries.length !== 1 || xmlEntries[0]?.[0] !== registry.entry.name) {
    throw new Error("DART ZIP XML entry가 registry의 exact entry와 일치하지 않습니다.");
  }
  const bytes = xmlEntries[0][1];
  if (sha256(bytes) !== registry.entry.sha256) {
    throw new Error("DART XML entry hash가 registry와 일치하지 않습니다.");
  }
  return bytes;
};

export const readRegisteredXmlFromZip = (
  zip: Uint8Array,
  registry: DartFilingRegistry,
): string => new TextDecoder("utf-8").decode(exactXmlEntry(unzipSync(zip), registry));

const findLocator = (
  xml: string,
  outline: readonly OutlineNode[],
  locator: DartFilingRegistry["sectionLocators"][number],
) => {
  let cursor = 0;
  let occurrence = 0;
  while ((cursor = xml.indexOf(locator.anchor, cursor)) >= 0) {
    occurrence += 1;
    const sectionPath = outlineAt(outline, cursor);
    const titles = sectionPath.map((node) => node.title);
    if (occurrence === locator.occurrence) {
      if (JSON.stringify(titles) !== JSON.stringify(locator.sectionPath)) {
        throw new Error(`승인 locator의 full sectionPath가 XML과 일치하지 않습니다: ${locator.factId}`);
      }
      if (sectionPath.length === 0) throw new Error(`승인 locator의 sectionPath가 비어 있습니다: ${locator.factId}`);
      return { sectionPath, anchorOffset: cursor, occurrence };
    }
    cursor += locator.anchor.length;
  }
  throw new Error(`승인 locator occurrence를 exact XML에서 확인하지 못했습니다: ${locator.factId}`);
};

const projectMaskedObservation = (
  raw: Uint8Array,
  registry: DartFilingRegistry,
) => {
  if (sha256(raw) !== registry.maskedObservation.sha256) {
    throw new Error("마스킹된 축산 관찰 리포트 hash가 registry와 일치하지 않습니다.");
  }
  const report = JSON.parse(new TextDecoder("utf-8").decode(raw)) as {
    offerId?: unknown;
    generatedAt?: unknown;
    judgements?: unknown;
  };
  if (report.offerId !== registry.offerId || typeof report.generatedAt !== "string" || !Array.isArray(report.judgements)) {
    throw new Error("마스킹된 축산 관찰 리포트 scope 또는 형식이 맞지 않습니다.");
  }
  const judgements: unknown[] = report.judgements;
  const fieldSummary = registry.maskedObservation.allowedFields.map((field) => {
    const selected = judgements.filter((item): item is { verdict?: unknown; claim?: { field?: unknown } } =>
      Boolean(item) && typeof item === "object" && (item as { claim?: { field?: unknown } }).claim?.field === field,
    );
    return {
      field,
      matchCount: selected.filter((item) => item.verdict === "match").length,
      mismatchCount: selected.filter((item) => item.verdict === "mismatch").length,
      unverifiableCount: selected.filter((item) => item.verdict === "unverifiable").length,
    };
  });
  return ObservationSchema.parse({
    sourceKind: "external-observation",
    sourceUrl: "https://www.data.go.kr",
    sourceHash: registry.maskedObservation.sha256,
    observedAt: report.generatedAt,
    allowedFields: registry.maskedObservation.allowedFields,
    fieldSummary,
    limitations: ["마스킹된 공개 리포트의 허용 필드 집계만 투영했으며, 개체·농장·소유자 식별 정보는 포함하지 않았습니다."],
  });
};

export const buildCattleFilingDerivedArtifact = (input: {
  readonly registry: DartFilingRegistry;
  readonly xml: string;
  readonly filingFacts: FilingFacts;
  readonly maskedObservationRaw: Uint8Array;
  readonly sourceFileMtime: string;
}): CattleFilingDerivedArtifact => {
  const { registry, xml, filingFacts } = input;
  if (filingFacts.offerId !== registry.offerId || filingFacts.rcpNo !== registry.rcpNo) {
    throw new Error("approved filing facts의 offerId 또는 rcpNo가 registry와 일치하지 않습니다.");
  }
  if (sha256(xml) !== registry.entry.sha256) throw new Error("XML sourceHash가 registry와 일치하지 않습니다.");
  const parsed = parseDocument(xml);
  const factsById = new Map(filingFacts.facts.map((fact) => [fact.id, fact]));
  if (registry.sectionLocators.some((locator) => !factsById.has(locator.factId))) {
    throw new Error("승인 registry locator에 대응하는 filing fact가 없습니다.");
  }
  const sections = registry.sectionLocators.map((locator) => {
    const fact = factsById.get(locator.factId);
    if (!fact) throw new Error(`승인 filing fact가 없습니다: ${locator.factId}`);
    const resolved = findLocator(xml, parsed.outline, locator);
    const sectionPath = resolved.sectionPath.map((node) => node.title);
    const excerpt = enclosingExcerpt(xml, resolved.anchorOffset, locator.anchor);
    if (!xml.slice(excerpt.charRange.start, excerpt.charRange.end).includes(locator.anchor)) {
      throw new Error(`XML excerpt 범위가 승인 anchor를 포함하지 않습니다: ${locator.factId}`);
    }
    const normalizedExcerptHash = sha256(canonicalText(excerpt.text));
    if (normalizedExcerptHash !== locator.normalizedExcerptHash) {
      throw new Error(`승인 locator excerpt hash가 XML과 일치하지 않습니다: ${locator.factId}`);
    }
    assertFactMatchesExcerpt(fact, locator, excerpt.text);
    return SectionSchema.parse({
      sectionId: `dart-${locator.factId}`,
      factId: locator.factId,
      title: fact.label,
      text: excerpt.text,
      sectionPath,
      charRange: excerpt.charRange,
      anchorOffset: resolved.anchorOffset,
      occurrence: resolved.occurrence,
      normalizedExcerptHash,
      sectionHash: sha256(JSON.stringify({ factId: locator.factId, text: excerpt.text, sectionPath, start: excerpt.charRange.start, end: excerpt.charRange.end })),
    });
  });
  const documentId = `cattle-${registry.offerId}-dart-${registry.rcpNo}`;
  if (registry.relationship.mappingStatus !== "confirmed") {
    throw new Error("needs-review mapping은 public/ready product chunk를 생성할 수 없습니다.");
  }
  const commonBase = {
    schemaVersion: 1 as const,
    categoryId: "cattle" as const,
    productId: registry.offerId,
    documentId,
    sourceKind: "official-document" as const,
    sourceUrl: SAFE_DART_URL,
    asOf: registry.submittedOn,
    dataNature: "observed" as const,
    sourceHash: registry.entry.sha256,
    approvedForPublic: true,
    approvedForExternalAi: false,
    piiReviewStatus: "passed" as const,
    status: "ready" as const,
    limitations: ["OpenDART exact rcpNo XML의 승인된 product-specific 사실만 정규화했으며, 원문 XML과 식별정보는 포함하지 않았습니다."],
  };
  const document = CommonDocumentRecordSchema.parse({
    ...commonBase,
    title: "축산 투자계약증권 공시 승인 사실",
    publisher: "OpenDART",
    collectedAt: input.sourceFileMtime,
    rightsStatus: "unknown",
    pages: [{
      page: 1,
      quality: "ready",
      reasonCodes: ["xml-logical-page"],
      metrics: { itemCount: sections.length, characterCount: sections.reduce((sum, section) => sum + section.text.length, 0), density: 0 },
      limitations: ["원천은 XML이므로 PDF 페이지 대신 논리 페이지 1로 기록했습니다."],
    }],
  });
  const chunks = sections.map((section) => {
    const chunk = {
      ...commonBase,
      chunkId: `${documentId}-${section.factId}`,
      title: section.title,
      page: 1,
      text: section.text,
      canonicalText: canonicalText(section.text),
      positions: [],
      pageQuality: "ready" as const,
      chunkHash: "0".repeat(64),
    };
    return CommonChunkRecordSchema.parse({ ...chunk, chunkHash: calculateCommonChunkHash(chunk) });
  });
  const base = {
    schemaVersion: 1 as const,
    artifactVersion: ARTIFACT_VERSION,
    registry,
    registryHash: sha256(JSON.stringify(registry)),
    sourceHash: registry.entry.sha256,
    sanitizerVersion: SANITIZER_VERSION,
    sourceFileMtime: input.sourceFileMtime,
    approval: registry.approval,
    sections,
    document,
    chunks,
    externalObservations: [projectMaskedObservation(input.maskedObservationRaw, registry)],
    limitations: [
      "단일 versioned derived artifact입니다. runtime/index는 이 artifact를 직접 읽도록 후속 단계에서 연결해야 합니다.",
      "청약 미달 처리 사실은 발행인과 공동사업 운영자의 동일성을 원문에서 확정하지 못해 RAG 근거에서 제외",
    ],
  };
  assertNoSensitiveContent(base);
  return CattleFilingDerivedArtifactSchema.parse({ ...base, artifactHash: calculateCattleFilingArtifactHash(base) });
};

export const verifyCattleFilingDerivedArtifact = (value: unknown): CattleFilingDerivedArtifact => {
  const artifact = CattleFilingDerivedArtifactSchema.parse(value);
  const { artifactHash, ...base } = artifact;
  if (artifactHash !== calculateCattleFilingArtifactHash(base)) throw new Error("derived artifactHash가 일치하지 않습니다.");
  if (artifact.registryHash !== sha256(JSON.stringify(artifact.registry))) {
    throw new Error("derived registryHash가 일치하지 않습니다.");
  }
  if (artifact.registry.entry.sha256 !== artifact.sourceHash ||
    JSON.stringify(artifact.approval) !== JSON.stringify(artifact.registry.approval) ||
    artifact.document.categoryId !== artifact.registry.categoryId ||
    artifact.document.productId !== artifact.registry.offerId ||
    artifact.document.sourceHash !== artifact.sourceHash ||
    artifact.document.collectedAt !== artifact.sourceFileMtime ||
    (artifact.registry.relationship.mappingStatus !== "confirmed" && artifact.document.approvedForPublic) ||
    artifact.chunks.some((chunk) =>
    chunk.categoryId !== artifact.registry.categoryId ||
    chunk.productId !== artifact.registry.offerId ||
    chunk.documentId !== artifact.document.documentId ||
    chunk.sourceHash !== artifact.sourceHash ||
    (artifact.registry.relationship.mappingStatus !== "confirmed" && chunk.approvedForPublic) ||
    calculateCommonChunkHash(chunk) !== chunk.chunkHash,
  )) throw new Error("derived registry/document/chunk hash 또는 scope가 일치하지 않습니다.");
  const locatorByFactId = new Map(artifact.registry.sectionLocators.map((locator) => [locator.factId, locator]));
  if (artifact.sections.length !== locatorByFactId.size || new Set(artifact.sections.map((section) => section.factId)).size !== artifact.sections.length) {
    throw new Error("derived section locator 집합이 중복되거나 불완전합니다.");
  }
  for (const section of artifact.sections) {
    const locator = locatorByFactId.get(section.factId);
    if (!locator ||
      JSON.stringify(section.sectionPath) !== JSON.stringify(locator.sectionPath) ||
      section.occurrence !== locator.occurrence ||
      section.normalizedExcerptHash !== locator.normalizedExcerptHash ||
      section.normalizedExcerptHash !== sha256(canonicalText(section.text)) ||
      section.sectionHash !== sha256(JSON.stringify({ factId: section.factId, text: section.text, sectionPath: section.sectionPath, start: section.charRange.start, end: section.charRange.end }))
    ) throw new Error(`derived section locator 또는 excerpt hash가 일치하지 않습니다: ${section.factId}`);
  }
  assertNoSensitiveContent(artifact);
  return artifact;
};

export const cattleDerivedArtifactPath = (registry: DartFilingRegistry, dataDir = "data"): string =>
  path.resolve(dataDir, "knowledge", "derived", "cattle", registry.offerId, `dart-${registry.rcpNo}-${registry.entry.sha256.slice(0, 12)}.json`);

export const buildAndWriteCattleFilingDerivedArtifact = async (
  registry: DartFilingRegistry,
  dataDir = "data",
): Promise<{ readonly path: string; readonly artifact: CattleFilingDerivedArtifact }> => {
  const rawDir = rawDataDir(registry.rcpNo, dataDir);
  const xmlEntries = (await readdir(rawDir)).filter((name) => name.toLowerCase().endsWith(".xml"));
  if (xmlEntries.length !== 1 || xmlEntries[0] !== registry.entry.name) {
    throw new Error("로컬 DART raw XML entry가 registry의 exact entry와 일치하지 않습니다.");
  }
  const xmlPath = path.join(rawDir, registry.entry.name);
  const [xmlBytes, factsRaw, observationRaw, xmlStat] = await Promise.all([
    readFile(xmlPath),
    readFile(path.resolve(dataDir, "offers", "filing-facts", `${registry.offerId}.json`), "utf8"),
    readFile(path.resolve(dataDir, registry.maskedObservation.reportPath)),
    stat(xmlPath),
  ]);
  const artifact = buildCattleFilingDerivedArtifact({
    registry,
    xml: new TextDecoder("utf-8").decode(xmlBytes),
    filingFacts: parseFilingFacts(JSON.parse(factsRaw)),
    maskedObservationRaw: new Uint8Array(observationRaw),
    sourceFileMtime: xmlStat.mtime.toISOString(),
  });
  const output = cattleDerivedArtifactPath(registry, dataDir);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return { path: output, artifact };
};
