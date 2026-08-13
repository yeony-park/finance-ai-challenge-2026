import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { hasLocalFile, rawXmlPath, SNAPSHOT_PATH, skipReason } from "./local-data";
import { createFakeTraceAdapter } from "../adapters/livestock-trace-fake";
import { runVerification } from "../pipeline";
import { buildReport, reportFileName } from "../report/build";
import type { VerifyReport } from "../types";

const RCP_NO = "20260806000159";
const GENERATED_AT = "2026-08-12T00:00:00.000Z";

/** 실측 회귀는 원문 XML과 이력제 스냅샷(둘 다 로컬 전용) 위에서만 성립한다 */
const RAW_XML_PATH = rawXmlPath(RCP_NO);
const hasLocalData = hasLocalFile(RAW_XML_PATH) && hasLocalFile(SNAPSHOT_PATH);
const localDataNote = hasLocalData
  ? ""
  : skipReason(`${RAW_XML_PATH} / ${SNAPSHOT_PATH}`);

const runFakePipeline = async (): Promise<VerifyReport> => {
  const xml = readFileSync(RAW_XML_PATH, "utf8");
  const trace = await createFakeTraceAdapter();
  return runVerification({
    rcpNo: RCP_NO,
    xml,
    trace,
    generatedAt: GENERATED_AT,
  });
};

describe.skipIf(!hasLocalData)(
  `가축투자계약증권 9호 완주 — 2026-08-10 실측 스냅샷 회귀 ${localDataNote}`,
  () => {
  test("37두 중 36두 일치 · 학산 24호 1두 불일치 · 확인 불가 0두", async () => {
    // Act
    const report = await runFakePipeline();
    const heads = report.bySubject;

    // Assert
    expect(heads).toHaveLength(37);
    expect(heads.filter((h) => h.verdict === "match")).toHaveLength(36);

    const mismatched = heads.filter((h) => h.verdict === "mismatch");
    expect(mismatched.map((h) => h.subject)).toEqual(["학산 24호"]);
    expect(heads.filter((h) => h.verdict === "unverifiable")).toHaveLength(0);
  });

  test("학산 24호 불일치 근거는 사육지 미확인이다", async () => {
    const report = await runFakePipeline();
    const mismatches = report.judgements.filter(
      (j) => j.verdict === "mismatch",
    );

    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].claim.subject).toBe("학산 24호");
    expect(mismatches[0].claim.kind).toBe("custody_location");
    // 실측 지명은 테스트에 박지 않는다 — 기재 광역(강원)과 다른 광역이면 된다
    expect(mismatches[0].evidence[0].observed).not.toMatch(/^강원/);
    expect(mismatches[0].evidence[0].stance).toBe("contradicts");
  });

  test("판정 근거 부착률 100% — 근거 0건 판정이 하나도 없다", async () => {
    const report = await runFakePipeline();

    expect(report.judgements.length).toBeGreaterThan(0);
    expect(report.judgements.every((j) => j.evidence.length >= 1)).toBe(true);
    expect(
      report.judgements.every((j) => j.evidence[0].sourceId.length > 0),
    ).toBe(true);
  });

  test("취득원가는 대조 어댑터가 없어 판정하지 않고 미판정으로 남는다", async () => {
    const report = await runFakePipeline();
    const prices = report.unjudged.filter(
      (u) => u.claim.kind === "acquisition_price",
    );

    expect(prices).toHaveLength(37);
    expect(report.summary.mismatch).toBe(1);
  });

  test("취득시기 판정은 30일 윈도 — 36두 일치, 24호만 확인 불가", async () => {
    const report = await runFakePipeline();
    const dates = report.judgements.filter(
      (j) => j.claim.kind === "acquisition_date",
    );

    expect(dates.filter((j) => j.verdict === "match")).toHaveLength(36);
    const unverifiable = dates.filter((j) => j.verdict === "unverifiable");
    expect(unverifiable.map((j) => j.claim.subject)).toEqual(["학산 24호"]);
  });

  test("리포트는 fake 모드·문서 버전 축·출처를 기록한다", async () => {
    const report = await runFakePipeline();

    expect(report.mode).toBe("fake");
    expect(report.offerId).toBe("livestock-9");
    expect(report.document.rcpNo).toBe(RCP_NO);
    expect(report.document.submittedOn).toBe("2026-08-06");
    expect(report.sources[0]).toContain("축산물이력제");
  });

  test("동일 입력 재실행은 멱등이다 (생성 시각만 다름)", async () => {
    const first = await runFakePipeline();
    const second = await runFakePipeline();

    expect(JSON.stringify(second.bySubject)).toBe(
      JSON.stringify(first.bySubject),
    );
    expect(JSON.stringify(second.summary)).toBe(JSON.stringify(first.summary));
    });
  },
);

describe("리포트 조립", () => {
  test("판정 없이도 리포트는 만들어지고 집계는 0이다", () => {
    const report = buildReport({
      document: {
        offerId: "livestock-9",
        rcpNo: RCP_NO,
        submittedOn: "2026-08-06",
      },
      generatedAt: GENERATED_AT,
      mode: "fake",
      sources: [],
      judgements: [],
      unjudged: [],
      notes: [],
    });

    expect(report.summary).toEqual({
      total: 0,
      match: 0,
      mismatch: 0,
      unverifiable: 0,
    });
  });

  test("리포트 파일명은 ISO 시각을 파일시스템 안전 문자로 바꾼다", () => {
    expect(reportFileName(GENERATED_AT)).toBe(
      "report-2026-08-12T00-00-00-000Z.json",
    );
  });
});
