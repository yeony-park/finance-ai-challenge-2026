import { mkdir, mkdtemp, rm, symlink, truncate, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import { offeringRowSchema } from "@/lib/db/records";
import { buildKnowledgeIngestPlan } from "@/lib/db/ingest/knowledge";
import { createDbProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge-db";
import { createFileProductKnowledgeRepository } from "@/lib/db/repositories/product-knowledge";
import { sha256 } from "@/lib/verify/dart/filing-registry";
import {
  buildPigFilingDerivedArtifact,
  buildAndWritePigFilingDerivedArtifact,
  calculatePigFilingArtifactHash,
  MAX_PIG_XML_BYTES,
  pigDerivedArtifactPath,
  PigFilingRegistrySchema,
  verifyPigFilingDerivedArtifact,
  type PigFilingDerivedArtifact,
  type PigFilingRegistry,
} from "@/lib/verify/dart/pig-filing";
import { answerFromProductKnowledge } from "../evidence";
import { searchOffers } from "../global-search";
import { runKnowledgeIndex } from "../index-cli";
import { loadApprovedCommonProducts, loadApprovedScenarios } from "../loader";
import { collectCanonicalSemanticCorpus } from "../local-rag/corpus";
import { retrieveExactProductEvidence } from "../search-orchestration";
import { loadApprovedCattleFilingArtifact } from "../cattle-filing-artifact";
import {
  auditPigFilingArtifacts,
  loadApprovedPigFilingArtifact,
  matchesPigFilingKnowledge,
  pigFilingKnowledge,
} from "../pig-filing-artifact";

const roots: string[] = [];
const XML = "<ROOT><PART><TITLE>제1부 모집 또는 매출에 관한 사항</TITLE><SECTION-1><TITLE>1. 공모개요</TITLE><P>1단위 공모가액은 20,000원입니다.</P></SECTION-1></PART></ROOT>";
const XML_BYTES = new TextEncoder().encode(XML);
const EXCERPT = "1단위 공모가액은 20,000원입니다.";

const registry = (): PigFilingRegistry => PigFilingRegistrySchema.parse({
  schemaVersion: 1,
  registryVersion: "dart-pig-filing-registry-v1",
  categoryId: "pig",
  productId: "pig-1",
  rcpNo: "20251215000259",
  submittedOn: "2026-01-29",
  entry: { name: "20251215000259.xml", sha256: sha256(XML_BYTES) },
  source: {
    landingUrl: "https://dart.fss.or.kr/dsaf001/main.do",
    exactPublicUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20251215000259",
    collectedAtSource: "local raw XML file mtime",
    method: "로컬 primary XML의 승인 locator 검증",
  },
  relationship: {
    type: "primary",
    mappingStatus: "confirmed",
    mappingEvidence: "pig-1 primary XML과 exact product scope를 수기 확인",
    limitations: ["이 locator 밖의 문장은 공개 근거로 사용하지 않습니다."],
  },
  approval: {
    policyId: "pig-filing-pilot-v1",
    scope: "pig-1 원자 문단 1개",
    externalAiApproved: false,
    piiReviewStatus: "passed",
  },
  sectionLocators: [{
    factId: "offering-price",
    title: "공모가액",
    anchor: "20,000원",
    sectionPath: ["제1부 모집 또는 매출에 관한 사항", "1. 공모개요"],
    occurrence: 1,
    evidenceTokens: ["1단위", "20,000원"],
    normalizedExcerptHash: sha256(EXCERPT),
  }],
});

const artifact = (): PigFilingDerivedArtifact => buildPigFilingDerivedArtifact({
  registry: registry(),
  xml: XML_BYTES,
  sourceFileMtime: "2026-08-31T00:00:00.000Z",
});

const MULTI_FACTS = [
  { factId: "offering-overview", title: "공모개요", anchor: "216,240,000원", text: "총 공모금액은 216,240,000원입니다." },
  { factId: "schedule", title: "청약 일정", anchor: "2026년 2월 11일", text: "청약 종료일은 2026년 2월 11일입니다." },
  { factId: "fees", title: "수수료", anchor: "100원", text: "플랫폼 수수료는 1단위당 100원입니다." },
  { factId: "compensation", title: "피해보상", anchor: "피해보상 절차", text: "피해보상 절차는 약관에 따릅니다." },
  { factId: "principal-risk", title: "원금 미보장", anchor: "보장되지", text: "투자 원금은 보장되지 않습니다." },
] as const;
const MULTI_XML = `<ROOT><PART><TITLE>제1부 모집 또는 매출에 관한 사항</TITLE><SECTION-1><TITLE>1. 공모개요</TITLE>${MULTI_FACTS.map((fact) => `<P>${fact.text}</P>`).join("")}</SECTION-1></PART></ROOT>`;
const MULTI_XML_BYTES = new TextEncoder().encode(MULTI_XML);

const multiRegistry = (): PigFilingRegistry => PigFilingRegistrySchema.parse({
  ...registry(),
  entry: { name: "20251215000259.xml", sha256: sha256(MULTI_XML_BYTES) },
  approval: { ...registry().approval, scope: "pig-1 원자 문단 5개" },
  sectionLocators: MULTI_FACTS.map((fact) => ({
    factId: fact.factId,
    title: fact.title,
    anchor: fact.anchor,
    sectionPath: ["제1부 모집 또는 매출에 관한 사항", "1. 공모개요"],
    occurrence: 1,
    evidenceTokens: [fact.anchor],
    normalizedExcerptHash: sha256(fact.text),
  })),
});

const multiArtifact = (): PigFilingDerivedArtifact => buildPigFilingDerivedArtifact({
  registry: multiRegistry(),
  xml: MULTI_XML_BYTES,
  sourceFileMtime: "2026-08-31T00:00:00.000Z",
});

const writeFixture = async (
  built: PigFilingDerivedArtifact = artifact(),
): Promise<{ readonly root: string; readonly artifact: PigFilingDerivedArtifact }> => {
  const root = await mkdtemp(path.join(os.tmpdir(), "pig-filing-"));
  roots.push(root);
  const registryFile = path.join(root, "knowledge", "filing-registry", "pig", "pig-1.json");
  const artifactFile = pigDerivedArtifactPath(built.registry, root);
  await mkdir(path.dirname(registryFile), { recursive: true });
  await mkdir(path.dirname(artifactFile), { recursive: true });
  await writeFile(registryFile, JSON.stringify(built.registry));
  await writeFile(artifactFile, JSON.stringify(built));
  return { root, artifact: built };
};

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("pig DART filing artifact", () => {
  test("exact raw XML locator 하나만 stable public common record로 만든다", () => {
    const first = artifact();
    const second = artifact();
    expect(first.artifactHash).toBe(second.artifactHash);
    expect(first.sections).toEqual([expect.objectContaining({
      factId: "offering-price",
      text: EXCERPT,
      sectionPath: ["제1부 모집 또는 매출에 관한 사항", "1. 공모개요"],
      occurrence: 1,
    })]);
    expect(first.document).toMatchObject({
      categoryId: "pig",
      productId: "pig-1",
      dataNature: "observed",
      sourceKind: "official-document",
      sourceUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20251215000259",
      approvedForPublic: true,
      approvedForExternalAi: false,
      piiReviewStatus: "passed",
      status: "ready",
    });
    expect(first.chunks).toHaveLength(1);
  });

  test("다중 locator를 입력 순서대로 독립 section/chunk로 안정 생성한다", async () => {
    const first = multiArtifact();
    const second = multiArtifact();
    expect(first.artifactHash).toBe(second.artifactHash);
    expect(first.sections.map((section) => section.factId)).toEqual(MULTI_FACTS.map((fact) => fact.factId));
    expect(first.chunks.map((chunk) => chunk.chunkId)).toEqual(MULTI_FACTS.map((fact) =>
      `pig-pig-1-dart-20251215000259-${fact.factId}`
    ));
    expect(first.document.pages[0]?.metrics).toMatchObject({
      itemCount: 5,
      characterCount: MULTI_FACTS.reduce((sum, fact) => sum + fact.text.length, 0),
    });
    expect(matchesPigFilingKnowledge(first, pigFilingKnowledge(first))).toBe(true);
    expect(matchesPigFilingKnowledge(first, {
      ...pigFilingKnowledge(first),
      chunks: pigFilingKnowledge(first).chunks.slice(0, -1),
    })).toBe(false);
    const tampered = {
      ...first,
      chunks: first.chunks.map((chunk, index) => index === 3 ? { ...chunk, text: "변조" } : chunk),
    };
    const { artifactHash: _artifactHash, ...tamperedBase } = tampered;
    void _artifactHash;
    expect(() => verifyPigFilingDerivedArtifact({
      ...tamperedBase,
      artifactHash: calculatePigFilingArtifactHash(tamperedBase),
    })).toThrow("hash");
    const expected = pigFilingKnowledge(first);
    const document = expected.documents[0]!;
    const db = await createDbProductKnowledgeRepository(async () => expected.chunks.map((chunk, index) => ({
      source_id: `product:pig:pig-1::observed:official-document:${document.documentId}`,
      document_id: document.documentId,
      chunk_id: chunk.chunkId,
      title: document.title,
      category_id: "pig" as const,
      product_id: "pig-1",
      scenario_id: null,
      data_nature: "observed" as const,
      source_kind: "official-document" as const,
      source_url: document.sourceUrl,
      as_of: document.asOf,
      source_hash: document.sourceHash,
      document_status: "ready" as const,
      document_approved_for_public: true,
      document_limitations: ["내부 문구"],
      page: chunk.page,
      text: chunk.text,
      canonical_text: chunk.canonicalText,
      chunk_hash: chunk.chunkHash,
      chunk_status: "ready" as const,
      chunk_approved_for_public: true,
      chunk_limitations: [`내부 문구 ${index}`],
      approved_for_external_ai: true,
      pii_review_status: "passed" as const,
    }))).findExact({ categoryId: "pig", productId: "pig-1", dataNature: "observed" });
    expect(matchesPigFilingKnowledge(first, db)).toBe(true);
  });

  test("중복 excerpt와 다중 locator 중 하나의 tamper·PII를 거부한다", () => {
    const duplicateText = "공모가액은 20,000원이며 수수료는 100원입니다.";
    const duplicateXml = `<ROOT><PART><TITLE>제1부 모집 또는 매출에 관한 사항</TITLE><SECTION-1><TITLE>1. 공모개요</TITLE><P>${duplicateText}</P></SECTION-1></PART></ROOT>`;
    const duplicateBytes = new TextEncoder().encode(duplicateXml);
    const duplicateRegistry = PigFilingRegistrySchema.parse({
      ...registry(),
      entry: { ...registry().entry, sha256: sha256(duplicateBytes) },
      sectionLocators: [
        { ...registry().sectionLocators[0]!, factId: "price", anchor: "20,000원", evidenceTokens: ["20,000원"], normalizedExcerptHash: sha256(duplicateText) },
        { ...registry().sectionLocators[0]!, factId: "fee", title: "수수료", anchor: "100원", evidenceTokens: ["100원"], normalizedExcerptHash: sha256(duplicateText) },
      ],
    });
    expect(() => buildPigFilingDerivedArtifact({
      registry: duplicateRegistry,
      xml: duplicateBytes,
      sourceFileMtime: "2026-08-31T00:00:00.000Z",
    })).toThrow("중복");

    const tamperedLocators = [...multiRegistry().sectionLocators];
    tamperedLocators[2] = { ...tamperedLocators[2]!, evidenceTokens: ["없는 수수료"] };
    expect(() => buildPigFilingDerivedArtifact({
      registry: PigFilingRegistrySchema.parse({ ...multiRegistry(), sectionLocators: tamperedLocators }),
      xml: MULTI_XML_BYTES,
      sourceFileMtime: "2026-08-31T00:00:00.000Z",
    })).toThrow("fees");

    const piiText = `${MULTI_FACTS[3].text} 연락처 010-1234-5678`;
    const piiXml = MULTI_XML.replace(MULTI_FACTS[3].text, piiText);
    const piiLocators = [...multiRegistry().sectionLocators];
    piiLocators[3] = { ...piiLocators[3]!, normalizedExcerptHash: sha256(piiText) };
    expect(() => buildPigFilingDerivedArtifact({
      registry: PigFilingRegistrySchema.parse({
        ...multiRegistry(),
        entry: { ...multiRegistry().entry, sha256: sha256(piiXml) },
        sectionLocators: piiLocators,
      }),
      xml: new TextEncoder().encode(piiXml),
      sourceFileMtime: "2026-08-31T00:00:00.000Z",
    })).toThrow("PII");
  });

  test("XML hash·locator path/token과 민감 식별 잔존을 fail-closed한다", () => {
    expect(PigFilingRegistrySchema.safeParse({
      ...registry(),
      source: {
        ...registry().source,
        exactPublicUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20251215000259&key=secret",
      },
    }).success).toBe(false);

    expect(() => buildPigFilingDerivedArtifact({
      registry: registry(),
      xml: new TextEncoder().encode(XML.replace("20,000원", "30,000원")),
      sourceFileMtime: "2026-08-31T00:00:00.000Z",
    })).toThrow("sourceHash");

    expect(() => buildPigFilingDerivedArtifact({
      registry: PigFilingRegistrySchema.parse({
        ...registry(),
        sectionLocators: [{ ...registry().sectionLocators[0], evidenceTokens: ["없는값"] }],
      }),
      xml: XML_BYTES,
      sourceFileMtime: "2026-08-31T00:00:00.000Z",
    })).toThrow("핵심 token");

    const piiXml = XML.replace(EXCERPT, `${EXCERPT} 농장 주소 홍길동 010-1234-5678`);
    expect(() => buildPigFilingDerivedArtifact({
      registry: PigFilingRegistrySchema.parse({
        ...registry(),
        entry: { ...registry().entry, sha256: sha256(piiXml) },
        sectionLocators: [{
          ...registry().sectionLocators[0],
          normalizedExcerptHash: sha256(`${EXCERPT} 농장 주소 홍길동 010-1234-5678`),
        }],
      }),
      xml: new TextEncoder().encode(piiXml),
      sourceFileMtime: "2026-08-31T00:00:00.000Z",
    })).toThrow("PII");
  });

  test("canonical registry와 artifact 1:1을 runtime·knowledge:index에서 감사한다", async () => {
    const fixture = await writeFixture();
    expect(await auditPigFilingArtifacts(fixture.root)).toEqual([]);
    await expect(loadApprovedPigFilingArtifact("pig", "pig-1", fixture.root)).resolves.toEqual(fixture.artifact);
    await expect(loadApprovedPigFilingArtifact("pig", "pig-2", fixture.root)).resolves.toBeNull();
    await expect(loadApprovedPigFilingArtifact("cattle", "pig-1", fixture.root)).resolves.toBeNull();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(await runKnowledgeIndex(fixture.root)).toBe(0);
    const plan = await buildKnowledgeIngestPlan(fixture.root);
    expect(plan.documents).toContainEqual(expect.objectContaining({
      categoryId: "pig",
      productId: "pig-1",
      approvedForExternalAi: false,
    }));
    expect(plan.chunks).toContainEqual(expect.objectContaining({
      categoryId: "pig",
      productId: "pig-1",
      approvedForExternalAi: false,
    }));
    const corpus = await collectCanonicalSemanticCorpus(fixture.root);
    expect(corpus.chunks.some((chunk) => chunk.scope.categoryId === "pig")).toBe(false);

    const invalid = { ...fixture.artifact, registryHash: "0".repeat(64) };
    const { artifactHash: _ignored, ...base } = invalid;
    void _ignored;
    await writeFile(
      pigDerivedArtifactPath(fixture.artifact.registry, fixture.root),
      JSON.stringify({ ...base, artifactHash: calculatePigFilingArtifactHash(base) }),
    );
    await expect(loadApprovedPigFilingArtifact("pig", "pig-1", fixture.root)).resolves.toBeNull();
    expect(await auditPigFilingArtifacts(fixture.root)).toEqual([
      expect.objectContaining({ code: "PIG_ARTIFACT_INVALID" }),
    ]);
  });

  test("pig 승인 artifact 집합의 extra 파일은 상품 전체를 fail-closed한다", async () => {
    const fixture = await writeFixture();
    await writeFile(
      path.join(fixture.root, "knowledge", "derived", "pig", "pig-1", "dart-extra.json"),
      "{}",
      "utf8",
    );
    await expect(loadApprovedPigFilingArtifact("pig", "pig-1", fixture.root)).resolves.toBeNull();
    expect(await auditPigFilingArtifacts(fixture.root)).toContainEqual(
      expect.objectContaining({ code: "PIG_ARTIFACT_EXTRA" }),
    );
  });

  test("비활성 후보 RCP artifact는 loader·index·evidence 저장소에서 공개하지 않는다", async () => {
    const inactiveRegistry = PigFilingRegistrySchema.parse({
      ...registry(),
      rcpNo: "20260107000209",
      entry: { ...registry().entry, name: "20260107000209.xml" },
      source: {
        ...registry().source,
        exactPublicUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260107000209",
      },
    });
    const inactive = buildPigFilingDerivedArtifact({
      registry: inactiveRegistry,
      xml: XML_BYTES,
      sourceFileMtime: "2026-08-31T00:00:00.000Z",
    });
    const fixture = await writeFixture(inactive);
    await expect(loadApprovedPigFilingArtifact("pig", "pig-1", fixture.root)).resolves.toBeNull();
    await expect(createFileProductKnowledgeRepository(fixture.root).findExact({
      categoryId: "pig",
      productId: "pig-1",
      dataNature: "observed",
    })).resolves.toEqual({ documents: [], chunks: [] });
    await expect(auditPigFilingArtifacts(fixture.root)).resolves.toEqual([
      expect.objectContaining({ code: "PIG_ARTIFACT_INVALID" }),
    ]);
    const offering = offeringRowSchema.parse({
      offerSlug: "pig-1",
      categoryId: "pig",
      provenance: "manual_verified",
      titlePublic: "가축투자계약증권 제1호",
      amountWon: 216_240_000,
      opensOn: "2026-01-29",
      closesOn: "2026-02-11",
      detail: { unitPriceWon: 20_000 },
      sourceMeta: { sourceUrl: "", license: "green", method: "discovery_only", retrievedAt: "", sha256: "a".repeat(64) },
    });
    const search = await searchOffers(
      { q: "한돈 단가", limit: 10 },
      fixture.root,
      {
        offerings: {
          mode: "file",
          async findBySlug() { return offering; },
          async listByCategory() { return [offering]; },
        },
        rag: { mode: "file", async search() { return { hits: [], degraded: true }; } },
      },
    );
    expect(search.results.some((item) => item.categoryId === "pig")).toBe(false);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await runKnowledgeIndex(fixture.root)).toBe(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("PIG_ARTIFACT_INVALID"));
  });

  test("canonical pig-1의 갱신된 청약·배정 및 납입 절차 label/hash를 검증한다", async () => {
    await expect(auditPigFilingArtifacts()).resolves.toEqual([]);
    const current = await loadApprovedPigFilingArtifact("pig", "pig-1");
    const cattle = await loadApprovedCattleFilingArtifact("cattle", "livestock-9");
    expect(cattle).not.toBeNull();
    const section = current?.sections.find((item) => item.factId === "subscription-payment-schedule");
    const chunk = current?.chunks.find((item) => item.chunkId.endsWith("subscription-payment-schedule"));
    expect(section).toMatchObject({
      title: "청약·배정 및 납입 절차",
      normalizedExcerptHash: "1ffb9022935a1e3dc858f0daf49770b8cb8deb57b5390297a5a8617a08cb137e",
      sectionHash: "aa5e5b358aa46fff33f859dbee315bb37c2f8f14f7d489d5a9a85195e273e86f",
    });
    expect(chunk?.chunkHash).toBe("30b7a7b9d54693da9ce1878bca30261a3fcf6f4adc5b50c9ea232ac7a86737a7");
    const plan = await buildKnowledgeIngestPlan();
    const cattleDocuments = plan.documents.filter((item) => item.documentId === cattle?.document.documentId);
    const cattleChunks = plan.chunks.filter((item) =>
      item.documentNaturalKey === cattleDocuments[0]?.naturalKey
    );
    const pigDocuments = plan.documents.filter((item) => item.documentId === current?.document.documentId);
    const pigChunks = plan.chunks.filter((item) => item.documentNaturalKey === pigDocuments[0]?.naturalKey);
    expect(cattleDocuments).toHaveLength(1);
    expect(cattleChunks).toHaveLength(6);
    expect(cattleDocuments[0]).toMatchObject({
      documentId: cattle?.document.documentId,
      sourceHash: cattle?.document.sourceHash,
      title: cattle?.document.title,
      approvedForExternalAi: false,
    });
    expect(cattleChunks.map((item) => [item.chunkId, item.sourceHash])).toEqual(
      cattle?.chunks
        .map((item) => [item.chunkId, item.sourceHash])
        .sort(([left], [right]) => left!.localeCompare(right!)),
    );
    expect(cattleChunks.every((item) => item.approvedForExternalAi === false)).toBe(true);
    expect(pigDocuments).toHaveLength(1);
    expect(pigDocuments[0]).toMatchObject({
      documentId: current?.document.documentId,
      sourceHash: current?.document.sourceHash,
      title: current?.document.title,
    });
    expect(pigChunks).toHaveLength(5);
    expect(pigChunks.every((item) => item.approvedForExternalAi === false)).toBe(true);
    expect(plan.documents.filter((item) => item.categoryId === "cattle" && item.sourceKind === "official-document" && !item.documentId.includes("-dart-full-"))).toHaveLength(9);
    expect(plan.documents.filter((item) => item.categoryId === "pig" && item.sourceKind === "official-document" && !item.documentId.includes("-dart-full-"))).toHaveLength(3);
    expect(plan.documents.filter((item) => item.documentId.includes("-dart-full-"))).toHaveLength(36);
    expect(plan.documents.filter((item) =>
      (item.categoryId === "cattle" || item.categoryId === "pig") && !item.approvedForExternalAi
    )).toHaveLength(plan.documents.filter((item) => item.categoryId === "cattle" || item.categoryId === "pig").length);
    expect(plan.documents.some((item) =>
      item.categoryId === "pig" && item.productId === "livestock-9"
    )).toBe(false);
    expect(pigChunks.map((item) => item.chunkId)).toContain("pig-pig-1-dart-20251215000259-subscription-payment-schedule");
  });

  test("pig raw loader는 symlink와 XML 크기 상한을 거부한다", async () => {
    const rootSymlinkRoot = await mkdtemp(path.join(os.tmpdir(), "pig-raw-root-symlink-"));
    roots.push(rootSymlinkRoot);
    const outsideRaw = path.join(rootSymlinkRoot, "outside-raw");
    const outsideRcp = path.join(outsideRaw, registry().rcpNo);
    await mkdir(outsideRcp, { recursive: true });
    await writeFile(path.join(outsideRcp, registry().entry.name), XML_BYTES);
    await symlink(outsideRaw, path.join(rootSymlinkRoot, "raw"));
    await expect(buildAndWritePigFilingDerivedArtifact(registry(), rootSymlinkRoot)).rejects.toThrow("디렉터리");

    const symlinkRoot = await mkdtemp(path.join(os.tmpdir(), "pig-raw-symlink-"));
    roots.push(symlinkRoot);
    const symlinkDir = path.join(symlinkRoot, "raw", registry().rcpNo);
    const outside = path.join(symlinkRoot, "outside.xml");
    await mkdir(symlinkDir, { recursive: true });
    await writeFile(outside, XML_BYTES);
    await symlink(outside, path.join(symlinkDir, registry().entry.name));
    await expect(buildAndWritePigFilingDerivedArtifact(registry(), symlinkRoot)).rejects.toThrow("경계");

    const oversizedRoot = await mkdtemp(path.join(os.tmpdir(), "pig-raw-oversized-"));
    roots.push(oversizedRoot);
    const oversizedDir = path.join(oversizedRoot, "raw", registry().rcpNo);
    const oversized = path.join(oversizedDir, registry().entry.name);
    await mkdir(oversizedDir, { recursive: true });
    await writeFile(oversized, "");
    await truncate(oversized, MAX_PIG_XML_BYTES + 1);
    await expect(buildAndWritePigFilingDerivedArtifact(registry(), oversizedRoot)).rejects.toThrow("크기 상한");
  });

  test("file/DB ProductKnowledge는 exact artifact 내용과 승인 상태가 같을 때만 일치한다", async () => {
    const fixture = await writeFixture();
    const file = await createFileProductKnowledgeRepository(fixture.root).findExact({
      categoryId: "pig",
      productId: "pig-1",
      dataNature: "observed",
    });
    expect(matchesPigFilingKnowledge(fixture.artifact, file)).toBe(true);
    expect(file.documents[0]).toMatchObject({ approvedForExternalAi: false, piiReviewStatus: "passed" });

    const expected = pigFilingKnowledge(fixture.artifact);
    const document = expected.documents[0]!;
    const chunk = expected.chunks[0]!;
    const db = await createDbProductKnowledgeRepository(async () => [{
      source_id: `product:pig:pig-1::observed:official-document:${document.documentId}`,
      document_id: document.documentId,
      chunk_id: chunk.chunkId,
      title: document.title,
      category_id: "pig",
      product_id: "pig-1",
      scenario_id: null,
      data_nature: "observed",
      source_kind: "official-document",
      source_url: document.sourceUrl,
      as_of: document.asOf,
      source_hash: document.sourceHash,
      document_status: "ready",
      document_approved_for_public: true,
      document_limitations: ["내부 문구"],
      page: chunk.page,
      text: chunk.text,
      canonical_text: chunk.canonicalText,
      chunk_hash: chunk.chunkHash,
      chunk_status: "ready",
      chunk_approved_for_public: true,
      chunk_limitations: ["내부 문구"],
      approved_for_external_ai: true,
      pii_review_status: "passed",
    }]).findExact({ categoryId: "pig", productId: "pig-1", dataNature: "observed" });
    expect(matchesPigFilingKnowledge(fixture.artifact, db)).toBe(true);
    expect(db.chunks[0]?.approvedForExternalAi).toBe(false);
    expect(matchesPigFilingKnowledge(fixture.artifact, {
      ...db,
      chunks: [{ ...db.chunks[0]!, text: "변조" }],
    })).toBe(false);
  });

  test("홈은 pig 질의에서만 lazy-load하고 exact product route를 반환한다", async () => {
    const smoke = await searchOffers({ q: "돼지 1호 공시", limit: 10 });
    expect(smoke.results).toContainEqual(expect.objectContaining({
      id: "pig-1",
      categoryId: "pig",
      title: "공모 좌수·단가·총액",
      status: "evidence-ready",
      phase: "evidence-only",
      namespace: "published-offer",
      href: "/pig/products/round-1",
    }));
    expect(smoke.results.find((item) => item.id === "pig-1")).not.toHaveProperty("minimumInvestmentWon");
    expect((await searchOffers({ q: "pig-1", phase: "evidence-only", limit: 10 })).results)
      .toContainEqual(expect.objectContaining({ id: "pig-1", phase: "evidence-only" }));
    for (const phase of ["subscription-open", "closed", "listed-trading"] as const) {
      expect((await searchOffers({ q: "pig-1", phase, limit: 10 })).results)
        .not.toContainEqual(expect.objectContaining({ id: "pig-1" }));
    }

    const built = await loadApprovedPigFilingArtifact("pig", "pig-1");
    expect(built).not.toBeNull();
    if (!built) return;
    const offering = offeringRowSchema.parse({
      offerSlug: "pig-1",
      categoryId: "pig",
      provenance: "manual_verified",
      titlePublic: "가축투자계약증권 제1호",
      amountWon: 216_240_000,
      opensOn: "2026-01-29",
      closesOn: "2026-02-11",
      detail: { unitPriceWon: 20_000 },
      sourceMeta: { sourceUrl: "", license: "green", method: "discovery_only", retrievedAt: "", sha256: "a".repeat(64) },
    });
    const repositories = {
      offerings: {
        mode: "file" as const,
        async findBySlug(id: string) { return id === "pig-1" ? offering : null; },
        async listByCategory(categoryId: string) { return categoryId === "pig" ? [offering] : []; },
      },
      rag: { mode: "file" as const, async search() { return { hits: [], degraded: true }; } },
    };
    const [scenarios, commonProducts] = await Promise.all([
      loadApprovedScenarios(),
      loadApprovedCommonProducts(),
    ]);
    const stableLoaders = {
      loadScenarios: async () => scenarios,
      loadCommonProducts: async () => commonProducts,
    };
    let pigCalls = 0;
    const loadPigFilings = async () => { pigCalls += 1; return [built]; };
    const quiet = await searchOffers(
      { q: "부동산 10만원 이하", categoryId: "real-estate", limit: 10 },
      undefined,
      repositories,
      { ...stableLoaders, minimumInvestmentWonMax: 100_000, loadPigFilings },
    );
    expect(quiet.results.every((item) => item.categoryId !== "pig")).toBe(true);
    expect(pigCalls).toBe(0);

    await searchOffers(
      { q: "한돈 사육환경", limit: 10 },
      undefined,
      repositories,
      { ...stableLoaders, loadPigFilings },
    );
    await searchOffers(
      { q: "한우 수수료", categoryId: "cattle", limit: 10 },
      undefined,
      repositories,
      { ...stableLoaders, loadPigFilings, loadCattleFilings: async () => [] },
    );
    expect(pigCalls).toBe(0);

    await searchOffers(
      { q: "사육환경", categoryId: "pig", limit: 10 },
      undefined,
      repositories,
      { ...stableLoaders, loadPigFilings },
    );
    expect(pigCalls).toBe(1);

    for (const q of [
      "돼지 1호 공시",
      "한돈 공모가",
      "한돈 수수료",
      "한돈 위험",
      "한돈 원금 미보장",
      "한돈 투자자 보호기금",
      "한돈 공모 총액",
      "한돈 좌수",
      "한돈 단가",
    ] as const) {
      const result = await searchOffers(
        { q, limit: 10 },
        undefined,
        repositories,
        { ...stableLoaders, loadPigFilings },
      );
      expect(result.results).toContainEqual(expect.objectContaining({
        id: "pig-1",
        categoryId: "pig",
        namespace: "published-offer",
        href: "/pig/products/round-1",
      }));
    }
    expect(pigCalls).toBe(10);

    const mutatedOffering = offeringRowSchema.parse({
      ...offering,
      titlePublic: "승인되지 않은 변조 제목",
      amountWon: 999_999_999,
      opensOn: "2099-01-01",
      closesOn: "2099-12-31",
      detail: { unitPriceWon: 777_777 },
    });
    const mutatedRepositories = {
      ...repositories,
      offerings: {
        ...repositories.offerings,
        async findBySlug(id: string) { return id === "pig-1" ? mutatedOffering : null; },
        async listByCategory(categoryId: string) { return categoryId === "pig" ? [mutatedOffering] : []; },
      },
    };
    const approvedProjection = await searchOffers(
      { q: "한돈 공모가", limit: 10 },
      undefined,
      repositories,
      { ...stableLoaders, loadPigFilings },
    );
    const mutatedProjection = await searchOffers(
      { q: "한돈 공모가", limit: 10 },
      undefined,
      mutatedRepositories,
      { ...stableLoaders, loadPigFilings },
    );
    expect(mutatedProjection.results).toEqual(approvedProjection.results);
  }, 15_000);

  test("승인 원자 문단은 evidence-only이고 실재·이력 질문과 external AI는 보류한다", async () => {
    const knowledge = pigFilingKnowledge(artifact());
    let embeddingCalls = 0;
    let liveCalls = 0;
    const options = { liveAnswer: async () => { liveCalls += 1; return null; } };
    const retrieved = await retrieveExactProductEvidence({
      scope: { categoryId: "pig", productId: "pig-1", dataNature: "observed" },
      namespace: "common",
      query: "공모가액",
      limit: 5,
      enabled: true,
      apiKey: "fake",
      fallbackChunks: knowledge.chunks,
      runtimeAiAllowed: true,
      embedder: {
        async embedDocuments() { throw new Error("not used"); },
        async embedQuery() { embeddingCalls += 1; return []; },
      },
    });
    await expect(answerFromProductKnowledge(
      { categoryId: "pig", productId: "pig-1", dataNature: "observed" },
      "공모가액",
      knowledge,
      { ...options, evidence: retrieved.evidence },
    )).resolves.toMatchObject({
      outcome: "evidence_only",
      answerSource: "none",
      evidence: [expect.objectContaining({ productId: "pig-1", sourceKind: "official-document" })],
      evidenceGroups: [expect.objectContaining({ groupKind: "issuer-claim" })],
    });
    await expect(answerFromProductKnowledge(
      { categoryId: "pig", productId: "pig-1", dataNature: "observed" },
      "개체 실재와 축산물이력을 확인해줘",
      knowledge,
      options,
    )).resolves.toMatchObject({
      outcome: "abstain",
      responseKind: "scope-guidance",
      evidence: [],
    });
    expect(embeddingCalls).toBe(0);
    expect(liveCalls).toBe(0);
  });
});
