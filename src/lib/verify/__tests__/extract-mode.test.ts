import { describe, expect, test } from "vitest";
import { runExtraction } from "../claims/extract";
import type { ClaimExtractionClient } from "../claims/llm-client";
import { runVerification } from "../pipeline";
import type {
  LivestockTraceAdapter,
  LivestockTraceRecord,
} from "../adapters/livestock-trace";
import type { DocumentRef } from "../types";

const RCP_NO = "20260806000159";
const DOCUMENT: DocumentRef = {
  offerId: "livestock-9",
  rcpNo: RCP_NO,
  submittedOn: "2026-08-06",
};

const XML = `<?xml version="1.0" encoding="utf-8"?>
<DOCUMENT>
<PART><TITLE>제1부 모집 또는 매출에 관한 사항</TITLE>
<SECTION-1><TITLE>II. 증권의 주요 권리내용</TITLE>
<P USERMARK="B">8. 기초자산 취득에 관한 사항</P>
<TABLE><TBODY>
<TR><TD>구분</TD><TD>고유명칭</TD><TD>이력번호</TD><TD>취득시기</TD><TD>취득원가(원)</TD><TD>보관장소</TD></TR>
<TR><TD>검증 1호</TD><TD>한우 송아지(숫소)</TD><TD>212786152</TD><TD>2026-07-14</TD><TD>4,574,865</TD><TD>강원도 검증군 가상읍</TD></TR>
</TBODY></TABLE>
</SECTION-1></PART>
</DOCUMENT>`;

const traceRecord: LivestockTraceRecord = {
  traceNo9: "212786152",
  traceNo12: "002212786152",
  exists: true,
  cattleNo: "410002212786152",
  birthYmd: "20251211",
  breedName: "한우",
  sexName: "수",
  currentFarmNo: "485464",
  farmHistory: [
    {
      regYmd: "20260730",
      regType: "양수",
      farmNo: "485464",
      farmerName: "김검증",
      farmAddress: "강원특별자치도 검증군 가상읍 가상로90번길",
    },
  ],
  currentFarm: {
    regYmd: "20260730",
    regType: "양수",
    farmNo: "485464",
    farmerName: "김검증",
    farmAddress: "강원특별자치도 검증군 가상읍 가상로90번길",
  },
  slaughtered: false,
  vaccinationCount: 1,
  observedAt: "2026-08-10T01:40:38.382Z",
};

const traceAdapter: LivestockTraceAdapter = {
  name: "fake",
  sourceId: "livestock-trace",
  sourceName: "축산물이력제 (테스트 스텁)",
  url: "http://example.test/trace",
  async lookup() {
    return traceRecord;
  },
};

/** 취득원가만 다른 값을 말하는 모델 — 교차검증이 어디까지 번지는지 보는 스텁 */
const conflictingExtractor: ClaimExtractionClient = {
  name: "stub-conflict",
  async extract() {
    return {
      claims: [
        {
          row: 1,
          subject: "검증 1호",
          kind: "acquisition_price" as const,
          value: "9,999,999",
        },
      ],
    };
  },
};

describe("추출 모드 스위치", () => {
  test("기본값은 cross-check다", async () => {
    const run = await runExtraction(XML, DOCUMENT);

    expect(run.mode).toBe("cross-check");
    expect(run.extractorName).toBe("fake");
  });

  test("rules-only 모드는 LLM을 아예 호출하지 않는다", async () => {
    // Arrange — 호출되면 실패하는 스텁
    let called = false;
    const spy: ClaimExtractionClient = {
      name: "spy",
      async extract() {
        called = true;
        return { claims: [] };
      },
    };

    // Act
    const run = await runExtraction(XML, DOCUMENT, {
      mode: "rules-only",
      extractor: spy,
    });

    // Assert
    expect(called).toBe(false);
    expect(run.crossCheck).toBeUndefined();
    expect(run.notes.join(" ")).toContain("rules-only");
  });

  test("개체 명세표가 없으면 두 모드 모두 사유만 남기고 멈추지 않는다", async () => {
    for (const mode of ["rules-only", "cross-check"] as const) {
      const run = await runExtraction("<DOCUMENT><P>표 없음</P></DOCUMENT>", DOCUMENT, {
        mode,
      });

      expect(run.claims).toEqual([]);
      expect(run.notes.join(" ")).toContain("개체 명세표");
    }
  });
});

describe("파이프라인 — 교차검증 불일치의 파급 범위", () => {
  test("불일치 필드는 판정이 아니라 미판정으로 남는다", async () => {
    // Act
    const report = await runVerification({
      rcpNo: RCP_NO,
      xml: XML,
      trace: traceAdapter,
      extractor: conflictingExtractor,
      generatedAt: "2026-08-13T00:00:00.000Z",
    });

    // Assert — 취득원가는 애초에 대조 어댑터가 없어 미판정이지만, 사유가 교차검증 강등으로 바뀐다
    const price = report.unjudged.find(
      (item) => item.claim.kind === "acquisition_price",
    );
    expect(price?.claim.verifiability).toBe("cross_check_conflict");
    expect(price?.reason).toContain("규칙 추출과 LLM 추출이 갈려");
    expect(
      report.judgements.some((j) => j.claim.kind === "acquisition_price"),
    ).toBe(false);
  });

  test("불일치는 같은 개체의 다른 필드 판정을 무너뜨리지 않는다", async () => {
    const report = await runVerification({
      rcpNo: RCP_NO,
      xml: XML,
      trace: traceAdapter,
      extractor: conflictingExtractor,
      generatedAt: "2026-08-13T00:00:00.000Z",
    });

    expect(report.summary.match).toBeGreaterThan(0);
    expect(report.bySubject).toHaveLength(1);
    expect(report.bySubject[0].subject).toBe("검증 1호");
  });

  test("근거 0건 판정은 어떤 모드에서도 만들어지지 않는다", async () => {
    for (const extractionMode of ["rules-only", "cross-check"] as const) {
      const report = await runVerification({
        rcpNo: RCP_NO,
        xml: XML,
        trace: traceAdapter,
        extractionMode,
        generatedAt: "2026-08-13T00:00:00.000Z",
      });

      expect(report.judgements.length).toBeGreaterThan(0);
      expect(report.judgements.every((j) => j.evidence.length >= 1)).toBe(true);
    }
  });

  test("리포트 note에 추출 모드와 교차검증 집계가 남는다", async () => {
    const report = await runVerification({
      rcpNo: RCP_NO,
      xml: XML,
      trace: traceAdapter,
      generatedAt: "2026-08-13T00:00:00.000Z",
    });

    expect(report.notes[0]).toBe("추출 모드: cross-check");
    expect(report.notes.join(" ")).toContain("교차검증");
    expect(report.offerId).toBe("livestock-9");
  });
});
