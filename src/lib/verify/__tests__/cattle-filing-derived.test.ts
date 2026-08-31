import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { parseFilingFacts } from "../report/filing-facts";
import { DartFilingRegistrySchema, isExactDartPublicUrl, requireExactRcpNo, sha256, type DartFilingRegistry } from "../dart/filing-registry";
import {
  buildCattleFilingDerivedArtifact,
  calculateCattleFilingArtifactHash,
  readRegisteredXmlFromZip,
  verifyCattleFilingDerivedArtifact,
} from "../dart/filing-derived";

const xml = "<ROOT><PART><TITLE>제1부 모집 또는 매출에 관한 사항</TITLE><SECTION-1><TITLE>1. 공모개요</TITLE><P>26개월</P></SECTION-1></PART></ROOT>";
const xmlBytes = new TextEncoder().encode(xml);

const registry = (): DartFilingRegistry => ({
  schemaVersion: 1,
  registryVersion: "dart-filing-registry-v1",
  categoryId: "cattle",
  offerId: "livestock-9",
  rcpNo: "20260814003572",
  submittedOn: "2026-08-14",
  entry: { name: "20260814003572.xml", sha256: sha256(xmlBytes) },
  source: {
    landingUrl: "https://dart.fss.or.kr/dsaf001/main.do",
    exactPublicUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814003572",
    collectedAtSource: "local raw XML file mtime",
    method: "exact registry test",
  },
  relationship: {
    type: "issuer_context",
    mappingStatus: "confirmed",
    mappingEvidence: "test confirms exact local relationship",
    limitations: ["primary relationship is not inferred"],
  },
  approval: {
    policyId: "test-policy",
    scope: "product-specific",
    externalAiApproved: false,
    piiReviewStatus: "passed",
  },
  sectionLocators: [{
    factId: "operation-period",
    anchor: "26개월",
    sectionPath: ["제1부 모집 또는 매출에 관한 사항", "1. 공모개요"],
    occurrence: 1,
    evidenceTokens: ["26"],
    normalizedExcerptHash: sha256("26개월"),
  }],
  maskedObservation: {
    reportPath: "public/livestock-9/report.json",
    sha256: sha256("masked-report"),
    allowedFields: ["품종"],
  },
});

const filingFacts = (value = "26개월입니다.") => parseFilingFacts({
  schemaVersion: 1,
  offerId: "livestock-9",
  rcpNo: "20260814003572",
  submittedOn: "20260814",
  facts: [{ id: "operation-period", label: "예상 사업기간", value, section: "1. 공모개요" }],
});

const report = new TextEncoder().encode(JSON.stringify({
  offerId: "livestock-9",
  generatedAt: "2026-08-15T15:52:44.480Z",
  judgements: [{ verdict: "match", claim: { field: "품종" } }],
}));

describe("cattle filing derived artifact", () => {
  it("DART exact URL은 credential/hash/추가 query 없이 14자리 rcpNo 하나만 허용한다", () => {
    const rcpNo = "20260814003572";
    expect(isExactDartPublicUrl(`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rcpNo}`, rcpNo)).toBe(true);
    for (const url of [
      `https://user:password@dart.fss.or.kr/dsaf001/main.do?rcpNo=${rcpNo}`,
      `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rcpNo}#section`,
      `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rcpNo}&page=1`,
      `https://dart.fss.or.kr/dsaf001/main.do?rcpno=${rcpNo}`,
      `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=123`,
    ]) {
      expect(isExactDartPublicUrl(url, rcpNo), url).toBe(false);
      expect(DartFilingRegistrySchema.safeParse({
        ...registry(),
        source: { ...registry().source, exactPublicUrl: url },
      }).success, url).toBe(false);
    }
  });

  it("exact ZIP entry와 hash가 맞을 때만 XML을 읽는다", () => {
    const input = registry();
    expect(readRegisteredXmlFromZip(zipSync({ [input.entry.name]: xmlBytes }), input)).toBe(xml);
    expect(() => readRegisteredXmlFromZip(zipSync({ "other.xml": xmlBytes }), input)).toThrow("exact entry");
    expect(() => requireExactRcpNo(input, "20260814003573")).toThrow("없는 rcpNo");
  });

  it("승인된 product-specific section만 stable common records로 만든다", () => {
    const input = registry();
    input.maskedObservation = { ...input.maskedObservation, sha256: sha256(report) };
    const params = { registry: input, xml, filingFacts: filingFacts(), maskedObservationRaw: report, sourceFileMtime: "2026-08-31T01:02:03.000Z" };
    const first = buildCattleFilingDerivedArtifact(params);
    const second = buildCattleFilingDerivedArtifact(params);
    expect(verifyCattleFilingDerivedArtifact(first)).toEqual(first);
    expect(second.artifactHash).toBe(first.artifactHash);
    expect(first.chunks).toHaveLength(1);
    expect(first.chunks[0]?.chunkId).toBe("cattle-livestock-9-dart-20260814003572-operation-period");
    expect(first.chunks[0]?.text).toBe("26개월");
    expect(JSON.stringify(first)).not.toMatch(/traceNo|cattleNo|farmNo|currentFarmNo|farmer|address|farmHistory/i);
  });

  it("exact registry가 있으면 livestock-N scope와 masked report 경로를 일반화한다", () => {
    const genericReport = new TextEncoder().encode(JSON.stringify({
      offerId: "livestock-8",
      generatedAt: "2026-08-15T15:52:44.480Z",
      judgements: [{ verdict: "match", claim: { field: "품종" } }],
    }));
    const generic = DartFilingRegistrySchema.parse({
      ...registry(),
      offerId: "livestock-8",
      rcpNo: "20260414002068",
      submittedOn: "2026-04-14",
      entry: { name: "20260414002068.xml", sha256: sha256(xml) },
      source: {
        ...registry().source,
        exactPublicUrl: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260414002068",
      },
      maskedObservation: {
        ...registry().maskedObservation,
        reportPath: "public/livestock-8/report.json",
        sha256: sha256(genericReport),
      },
    });
    const artifact = buildCattleFilingDerivedArtifact({
      registry: generic,
      xml,
      filingFacts: parseFilingFacts({
        schemaVersion: 1,
        offerId: "livestock-8",
        rcpNo: "20260414002068",
        submittedOn: "20260414",
        facts: [{ id: "operation-period", label: "예상 사업기간", value: "26개월입니다.", section: "1. 공모개요" }],
      }),
      maskedObservationRaw: genericReport,
      sourceFileMtime: "2026-08-31T01:02:03.000Z",
    });
    expect(artifact.document.productId).toBe("livestock-8");
    expect(artifact.externalObservations).toHaveLength(1);
    expect(DartFilingRegistrySchema.safeParse({
      ...generic,
      maskedObservation: { ...generic.maskedObservation, reportPath: "public/livestock-9/report.json" },
    }).success).toBe(false);
  });

  it("민감 식별 필드가 승인 section에 섞이면 fail-closed한다", () => {
    const input = registry();
    const piiXml = xml.replace("26개월", "26개월 농장주소");
    input.entry = { ...input.entry, sha256: sha256(piiXml) };
    input.sectionLocators = [{ ...input.sectionLocators[0]!, normalizedExcerptHash: sha256("26개월 농장주소") }];
    input.maskedObservation = { ...input.maskedObservation, sha256: sha256(report) };
    expect(() => buildCattleFilingDerivedArtifact({
      registry: input,
      xml: piiXml,
      filingFacts: filingFacts(),
      maskedObservationRaw: report,
      sourceFileMtime: "2026-08-31T01:02:03.000Z",
    })).toThrow("PII");
  });

  it("registry hash와 mapping 상태 tamper를 fail-closed한다", () => {
    const input = registry();
    input.maskedObservation = { ...input.maskedObservation, sha256: sha256(report) };
    const artifact = buildCattleFilingDerivedArtifact({ registry: input, xml, filingFacts: filingFacts(), maskedObservationRaw: report, sourceFileMtime: "2026-08-31T01:02:03.000Z" });
    const tampered = { ...artifact, registryHash: "0".repeat(64) };
    const { artifactHash: _ignored, ...tamperedBase } = tampered;
    void _ignored;
    expect(() => verifyCattleFilingDerivedArtifact({ ...tamperedBase, artifactHash: calculateCattleFilingArtifactHash(tamperedBase) })).toThrow("registryHash");
    expect(() => buildCattleFilingDerivedArtifact({
      registry: { ...input, relationship: { ...input.relationship, mappingStatus: "needs-review" } },
      xml,
      filingFacts: filingFacts(),
      maskedObservationRaw: report,
      sourceFileMtime: "2026-08-31T01:02:03.000Z",
    })).toThrow("needs-review");
    expect(() => buildCattleFilingDerivedArtifact({
      registry: { ...input, sectionLocators: [...input.sectionLocators, input.sectionLocators[0]!] },
      xml,
      filingFacts: filingFacts(),
      maskedObservationRaw: report,
      sourceFileMtime: "2026-08-31T01:02:03.000Z",
    })).toThrow("factId");
  });

  it("빈 token과 subject·condition·quantity 핵심 token 누락을 거부한다", () => {
    const input = registry();
    expect(DartFilingRegistrySchema.safeParse({
      ...input,
      sectionLocators: [{ ...input.sectionLocators[0]!, evidenceTokens: [] }],
    }).success).toBe(false);
    for (const missing of ["발행인", "미달", "10"]) {
      const tokenInput = registry();
      tokenInput.maskedObservation = { ...tokenInput.maskedObservation, sha256: sha256(report) };
      tokenInput.sectionLocators = [{ ...tokenInput.sectionLocators[0]!, evidenceTokens: ["26", missing] }];
      expect(() => buildCattleFilingDerivedArtifact({
        registry: tokenInput,
        xml,
        filingFacts: filingFacts(`26개월 발행인 미달 10`),
        maskedObservationRaw: report,
        sourceFileMtime: "2026-08-31T01:02:03.000Z",
      })).toThrow("핵심값");
    }
  });

  it("서로 다른 문단에 흩어진 단어를 material claim으로 승인하지 않는다", () => {
    const scatteredXml = "<ROOT><PART><TITLE>제1부 모집 또는 매출에 관한 사항</TITLE><SECTION-1><TITLE>1. 공모개요</TITLE><P>미달</P><P>발행인 취득</P></SECTION-1></PART></ROOT>";
    const input = registry();
    input.entry = { ...input.entry, sha256: sha256(scatteredXml) };
    input.sectionLocators = [{
      factId: "operation-period",
      anchor: "미달",
      sectionPath: ["제1부 모집 또는 매출에 관한 사항", "1. 공모개요"],
      occurrence: 1,
      evidenceTokens: ["미달", "발행인", "취득"],
      normalizedExcerptHash: sha256("미달"),
    }];
    input.maskedObservation = { ...input.maskedObservation, sha256: sha256(report) };
    expect(() => buildCattleFilingDerivedArtifact({
      registry: input,
      xml: scatteredXml,
      filingFacts: filingFacts("미달 발행인 취득"),
      maskedObservationRaw: report,
      sourceFileMtime: "2026-08-31T01:02:03.000Z",
    })).toThrow("핵심값");
  });
});
