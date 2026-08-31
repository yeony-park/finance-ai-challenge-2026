import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { calculateCommonChunkHash } from "@/lib/knowledge/pdf";
import {
  CommonChunkRecordSchema,
  CommonDocumentRecordSchema,
} from "@/lib/knowledge/schema";
import { outlineAt, stripMarkup, type OutlineNode } from "../parse/outline";
import { parseDocument } from "../parse/document";
import { assertOfferId } from "../paths";
import { isExactDartPublicUrl, sha256 } from "./filing-registry";
import { MAX_DART_RAW_XML_BYTES, readExactLocalRawXml } from "./raw-xml";

const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ARTIFACT_VERSION = "pig-filing-derived-v1" as const;
const SANITIZER_VERSION = "pig-filing-sanitizer-v1" as const;
export const MAX_PIG_XML_BYTES = MAX_DART_RAW_XML_BYTES;
const DOCUMENT_LIMITATIONS = ["DART 원문에서 승인된 한돈 상품 확인 문단만 구조화했습니다."] as const;
const ARTIFACT_LIMITATIONS = ["승인된 원자 문단만 포함하며 복합 요약이나 실물 식별정보를 생성하지 않습니다."] as const;
const FORBIDDEN_SUBJECT = /농장|주소|소재지|개체|이력|주민등록|생년월일|성명|대표자|연락처|이메일|전화|계좌/;
const OBVIOUS_PII = [
  /\b\d{6}[- ]?[1-4]\d{6}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?<!\d)(?:01[016789]|0\d{1,2})[- ]?\d{3,4}[- ]?\d{4}(?!\d)/,
];

const canonicalText = (value: string): string =>
  value.normalize("NFKC").replace(/\s+/g, " ").trim();

const LocatorSchema = z.strictObject({
  factId: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().trim().min(1).max(120),
  anchor: z.string().trim().min(1).max(120),
  sectionPath: z.array(z.string().trim().min(1).max(240)).min(1).max(10),
  occurrence: z.number().int().positive(),
  evidenceTokens: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  normalizedExcerptHash: HashSchema,
});

export const PigFilingRegistrySchema = z.strictObject({
  schemaVersion: z.literal(1),
  registryVersion: z.literal("dart-pig-filing-registry-v1"),
  categoryId: z.literal("pig"),
  productId: z.string().regex(/^pig-[1-9]\d*$/),
  rcpNo: z.string().regex(/^\d{14}$/),
  submittedOn: DateSchema,
  entry: z.strictObject({
    name: z.string().regex(/^\d{14}\.xml$/),
    sha256: HashSchema,
  }),
  source: z.strictObject({
    landingUrl: z.literal("https://dart.fss.or.kr/dsaf001/main.do"),
    exactPublicUrl: z.string().url(),
    collectedAtSource: z.literal("local raw XML file mtime"),
    method: z.string().trim().min(1).max(500),
  }),
  relationship: z.strictObject({
    type: z.literal("primary"),
    mappingStatus: z.literal("confirmed"),
    mappingEvidence: z.string().trim().min(1).max(1_000),
    limitations: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
  }),
  approval: z.strictObject({
    policyId: z.string().trim().min(1).max(120),
    scope: z.string().trim().min(1).max(240),
    externalAiApproved: z.literal(false),
    piiReviewStatus: z.literal("passed"),
  }),
  sectionLocators: z.array(LocatorSchema).min(1).max(20),
}).superRefine((value, context) => {
  if (value.entry.name !== `${value.rcpNo}.xml`) {
    context.addIssue({ code: "custom", path: ["entry", "name"], message: "registry entry는 exact rcpNo XML이어야 합니다." });
  }
  if (!isExactDartPublicUrl(value.source.exactPublicUrl, value.rcpNo)) {
    context.addIssue({ code: "custom", path: ["source", "exactPublicUrl"], message: "DART 공개 URL은 exact rcpNo 하나만 포함해야 합니다." });
  }
  if (new Set(value.sectionLocators.map((locator) => locator.factId)).size !== value.sectionLocators.length) {
    context.addIssue({ code: "custom", path: ["sectionLocators"], message: "factId는 중복될 수 없습니다." });
  }
});

export type PigFilingRegistry = z.infer<typeof PigFilingRegistrySchema>;

const SectionSchema = z.strictObject({
  sectionId: z.string().regex(/^[a-z0-9-]+$/),
  factId: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  text: z.string().min(1),
  sectionPath: z.array(z.string().min(1)).min(1),
  charRange: z.strictObject({ start: z.number().int().nonnegative(), end: z.number().int().positive() }),
  anchorOffset: z.number().int().nonnegative(),
  occurrence: z.number().int().positive(),
  normalizedExcerptHash: HashSchema,
  sectionHash: HashSchema,
});

export const PigFilingDerivedArtifactSchema = z.strictObject({
  schemaVersion: z.literal(1),
  artifactVersion: z.literal(ARTIFACT_VERSION),
  artifactHash: HashSchema,
  registry: PigFilingRegistrySchema,
  registryHash: HashSchema,
  sourceHash: HashSchema,
  sanitizerVersion: z.literal(SANITIZER_VERSION),
  sourceFileMtime: z.string().datetime({ offset: true }),
  approval: PigFilingRegistrySchema.shape.approval,
  sections: z.array(SectionSchema).min(1).max(20),
  document: CommonDocumentRecordSchema,
  chunks: z.array(CommonChunkRecordSchema).min(1).max(20),
  limitations: z.array(z.string().min(1)).min(1),
});

export type PigFilingDerivedArtifact = z.infer<typeof PigFilingDerivedArtifactSchema>;

const findLocator = (
  xml: string,
  outline: readonly OutlineNode[],
  locator: PigFilingRegistry["sectionLocators"][number],
) => {
  let cursor = 0;
  let occurrence = 0;
  while ((cursor = xml.indexOf(locator.anchor, cursor)) >= 0) {
    occurrence += 1;
    if (occurrence === locator.occurrence) {
      const sectionPath = outlineAt(outline, cursor);
      if (JSON.stringify(sectionPath.map((node) => node.title)) !== JSON.stringify(locator.sectionPath)) {
        throw new Error(`승인 locator의 full sectionPath가 XML과 일치하지 않습니다: ${locator.factId}`);
      }
      return { sectionPath, anchorOffset: cursor, occurrence };
    }
    cursor += locator.anchor.length;
  }
  throw new Error(`승인 locator occurrence를 exact XML에서 확인하지 못했습니다: ${locator.factId}`);
};

const enclosingExcerpt = (
  xml: string,
  anchorOffset: number,
  anchor: string,
): { readonly text: string; readonly charRange: { readonly start: number; readonly end: number } } => {
  for (const pattern of [/<P\b[^>]*>([\s\S]*?)<\/P>/gi, /<TABLE\b[^>]*>([\s\S]*?)<\/TABLE>/gi]) {
    for (let match = pattern.exec(xml); match !== null; match = pattern.exec(xml)) {
      const raw = match[0] ?? "";
      const start = match.index;
      const end = start + raw.length;
      if (anchorOffset < start || anchorOffset >= end) continue;
      const text = canonicalText(stripMarkup(raw));
      if (!text.includes(anchor) || text.length === 0 || text.length > 8_000) break;
      return { text, charRange: { start, end } };
    }
  }
  throw new Error("승인 locator 주변의 최소 XML 문단 또는 표를 추출하지 못했습니다.");
};

const assertNoSensitiveExcerpt = (value: string): void => {
  if (FORBIDDEN_SUBJECT.test(value) || OBVIOUS_PII.some((pattern) => pattern.test(value))) {
    throw new Error("PII 또는 실물 식별정보가 승인 excerpt에 남아 있습니다.");
  }
};

export const calculatePigFilingArtifactHash = (
  value: Omit<PigFilingDerivedArtifact, "artifactHash">,
): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export const buildPigFilingDerivedArtifact = (input: {
  readonly registry: PigFilingRegistry;
  readonly xml: Uint8Array;
  readonly sourceFileMtime: string;
}): PigFilingDerivedArtifact => {
  const registry = PigFilingRegistrySchema.parse(input.registry);
  if (sha256(input.xml) !== registry.entry.sha256) {
    throw new Error("XML sourceHash가 registry와 일치하지 않습니다.");
  }
  const xml = new TextDecoder("utf-8").decode(input.xml);
  const parsed = parseDocument(xml);
  const sections = registry.sectionLocators.map((locator) => {
    const resolved = findLocator(xml, parsed.outline, locator);
    const excerpt = enclosingExcerpt(xml, resolved.anchorOffset, locator.anchor);
    const normalizedExcerptHash = sha256(canonicalText(excerpt.text));
    if (normalizedExcerptHash !== locator.normalizedExcerptHash) {
      throw new Error(`승인 locator excerpt hash가 XML과 일치하지 않습니다: ${locator.factId}`);
    }
    if (locator.evidenceTokens.some((token) => !canonicalText(excerpt.text).includes(canonicalText(token)))) {
      throw new Error(`승인 locator 핵심 token이 하나의 XML excerpt에 모두 존재하지 않습니다: ${locator.factId}`);
    }
    assertNoSensitiveExcerpt(`${locator.title} ${excerpt.text}`);
    const sectionPath = resolved.sectionPath.map((node) => node.title);
    return SectionSchema.parse({
      sectionId: `dart-${locator.factId}`,
      factId: locator.factId,
      title: locator.title,
      text: excerpt.text,
      sectionPath,
      charRange: excerpt.charRange,
      anchorOffset: resolved.anchorOffset,
      occurrence: resolved.occurrence,
      normalizedExcerptHash,
      sectionHash: sha256(JSON.stringify({ factId: locator.factId, text: excerpt.text, sectionPath, ...excerpt.charRange })),
    });
  });
  const excerptKeys = sections.map((section) =>
    `${section.normalizedExcerptHash}:${section.charRange.start}:${section.charRange.end}`
  );
  if (new Set(excerptKeys).size !== excerptKeys.length) {
    throw new Error("동일한 XML excerpt를 가리키는 locator는 중복될 수 없습니다.");
  }
  const documentId = `pig-${registry.productId}-dart-${registry.rcpNo}`;
  const limitations = [...DOCUMENT_LIMITATIONS];
  const commonBase = {
    schemaVersion: 1 as const,
    categoryId: "pig" as const,
    productId: registry.productId,
    documentId,
    sourceKind: "official-document" as const,
    sourceUrl: registry.source.exactPublicUrl,
    asOf: registry.submittedOn,
    dataNature: "observed" as const,
    sourceHash: registry.entry.sha256,
    approvedForPublic: true,
    approvedForExternalAi: false,
    piiReviewStatus: "passed" as const,
    status: "ready" as const,
    limitations,
  };
  const document = CommonDocumentRecordSchema.parse({
    ...commonBase,
    title: registry.sectionLocators[0]!.title,
    publisher: "OpenDART",
    collectedAt: input.sourceFileMtime,
    rightsStatus: "unknown",
    pages: [{
      page: 1,
      quality: "ready",
      reasonCodes: ["xml-logical-page"],
      metrics: {
        itemCount: sections.length,
        characterCount: sections.reduce((sum, section) => sum + section.text.length, 0),
        density: 0,
      },
      limitations: ["원천은 XML이므로 PDF 페이지 대신 논리 페이지 1로 기록했습니다."],
    }],
  });
  const chunks = sections.map((section) => {
    const chunkBase = {
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
    return CommonChunkRecordSchema.parse({
      ...chunkBase,
      chunkHash: calculateCommonChunkHash(chunkBase),
    });
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
    limitations: [...ARTIFACT_LIMITATIONS],
  };
  return PigFilingDerivedArtifactSchema.parse({
    ...base,
    artifactHash: calculatePigFilingArtifactHash(base),
  });
};

export const verifyPigFilingDerivedArtifact = (value: unknown): PigFilingDerivedArtifact => {
  const artifact = PigFilingDerivedArtifactSchema.parse(value);
  const { artifactHash, ...base } = artifact;
  const expectedDocumentId = `pig-${artifact.registry.productId}-dart-${artifact.registry.rcpNo}`;
  const metrics = artifact.document.pages[0]?.metrics;
  if (
    artifactHash !== calculatePigFilingArtifactHash(base) ||
    artifact.registryHash !== sha256(JSON.stringify(artifact.registry)) ||
    artifact.sourceHash !== artifact.registry.entry.sha256 ||
    JSON.stringify(artifact.approval) !== JSON.stringify(artifact.registry.approval) ||
    JSON.stringify(artifact.limitations) !== JSON.stringify(ARTIFACT_LIMITATIONS) ||
    artifact.document.categoryId !== "pig" ||
    artifact.document.productId !== artifact.registry.productId ||
    artifact.document.documentId !== expectedDocumentId ||
    artifact.document.dataNature !== "observed" ||
    artifact.document.sourceKind !== "official-document" ||
    artifact.document.status !== "ready" ||
    !artifact.document.approvedForPublic ||
    artifact.document.title !== artifact.registry.sectionLocators[0]!.title ||
    artifact.document.publisher !== "OpenDART" ||
    artifact.document.collectedAt !== artifact.sourceFileMtime ||
    artifact.document.rightsStatus !== "unknown" ||
    artifact.document.sourceUrl !== artifact.registry.source.exactPublicUrl ||
    artifact.document.asOf !== artifact.registry.submittedOn ||
    artifact.document.sourceHash !== artifact.sourceHash ||
    JSON.stringify(artifact.document.limitations) !== JSON.stringify(DOCUMENT_LIMITATIONS) ||
    artifact.document.pages.length !== 1 ||
    artifact.document.pages[0]?.page !== 1 ||
    artifact.document.pages[0]?.quality !== "ready" ||
    metrics?.itemCount !== artifact.sections.length ||
    metrics?.characterCount !== artifact.sections.reduce((sum, section) => sum + section.text.length, 0) ||
    metrics?.density !== 0 ||
    artifact.document.approvedForExternalAi ||
    artifact.document.piiReviewStatus !== "passed" ||
    artifact.sections.length !== artifact.registry.sectionLocators.length ||
    artifact.chunks.length !== artifact.sections.length
  ) throw new Error("pig derived registry/document/chunk hash 또는 scope가 일치하지 않습니다.");
  const excerptKeys = new Set<string>();
  for (const [index, locator] of artifact.registry.sectionLocators.entries()) {
    const section = artifact.sections[index]!;
    const chunk = artifact.chunks[index]!;
    const excerptKey = `${section.normalizedExcerptHash}:${section.charRange.start}:${section.charRange.end}`;
    const expectedSectionHash = sha256(JSON.stringify({
      factId: section.factId,
      text: section.text,
      sectionPath: section.sectionPath,
      ...section.charRange,
    }));
    if (
      excerptKeys.has(excerptKey) ||
      chunk.categoryId !== "pig" ||
      chunk.productId !== artifact.registry.productId ||
      chunk.documentId !== artifact.document.documentId ||
      chunk.dataNature !== "observed" ||
      chunk.sourceKind !== "official-document" ||
      chunk.status !== "ready" ||
      !chunk.approvedForPublic ||
      chunk.chunkId !== `${expectedDocumentId}-${locator.factId}` ||
      chunk.title !== locator.title ||
      chunk.page !== 1 ||
      chunk.pageQuality !== "ready" ||
      chunk.canonicalText !== canonicalText(chunk.text) ||
      chunk.positions.length !== 0 ||
      JSON.stringify(chunk.limitations) !== JSON.stringify(DOCUMENT_LIMITATIONS) ||
      chunk.sourceUrl !== artifact.registry.source.exactPublicUrl ||
      chunk.asOf !== artifact.registry.submittedOn ||
      chunk.sourceHash !== artifact.sourceHash ||
      chunk.approvedForExternalAi ||
      chunk.piiReviewStatus !== "passed" ||
      calculateCommonChunkHash(chunk) !== chunk.chunkHash ||
      section.factId !== locator.factId ||
      section.sectionId !== `dart-${locator.factId}` ||
      section.title !== locator.title ||
      section.text !== chunk.text ||
      section.normalizedExcerptHash !== locator.normalizedExcerptHash ||
      section.normalizedExcerptHash !== sha256(canonicalText(section.text)) ||
      section.sectionHash !== expectedSectionHash ||
      JSON.stringify(section.sectionPath) !== JSON.stringify(locator.sectionPath) ||
      section.anchorOffset < section.charRange.start ||
      section.anchorOffset >= section.charRange.end ||
      section.occurrence !== locator.occurrence
    ) throw new Error("pig derived registry/document/chunk hash 또는 scope가 일치하지 않습니다.");
    excerptKeys.add(excerptKey);
    assertNoSensitiveExcerpt(`${section.title} ${section.text}`);
  }
  return artifact;
};

export const pigFilingRegistryPath = (productId: string, dataDir = "data"): string =>
  path.resolve(dataDir, "knowledge", "filing-registry", "pig", `${assertOfferId(productId)}.json`);

export const loadPigFilingRegistry = async (
  productId: string,
  dataDir = "data",
): Promise<PigFilingRegistry> => {
  const expected = assertOfferId(productId);
  const registry = PigFilingRegistrySchema.parse(JSON.parse(await readFile(pigFilingRegistryPath(expected, dataDir), "utf8")));
  if (registry.productId !== expected) throw new Error("pig filing registry productId 불일치");
  return registry;
};

export const pigDerivedArtifactPath = (registry: PigFilingRegistry, dataDir = "data"): string =>
  path.resolve(dataDir, "knowledge", "derived", "pig", registry.productId, `dart-${registry.rcpNo}-${registry.entry.sha256.slice(0, 12)}.json`);

export const buildAndWritePigFilingDerivedArtifact = async (
  registry: PigFilingRegistry,
  dataDir = "data",
): Promise<{ readonly path: string; readonly artifact: PigFilingDerivedArtifact }> => {
  const approvedRegistry = PigFilingRegistrySchema.parse(registry);
  const source = await readExactLocalRawXml({
    dataDir,
    rcpNo: approvedRegistry.rcpNo,
    entryName: approvedRegistry.entry.name,
  });
  const artifact = buildPigFilingDerivedArtifact({
    registry: approvedRegistry,
    xml: source.bytes,
    sourceFileMtime: source.mtime,
  });
  const output = pigDerivedArtifactPath(approvedRegistry, dataDir);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return { path: output, artifact };
};
