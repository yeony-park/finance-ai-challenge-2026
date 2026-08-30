import { afterAll, beforeAll, describe, expect, test } from "vitest";

import type { VerifyReport } from "@/lib/verify/types";

import type { LivestockTraceRecord } from "@/lib/verify/adapters/livestock-trace";

import {
  buildLedgerObservation,
  buildLedgerObservationFromTrace,
  buildVerificationRunRecord,
  verificationRunKey,
} from "../ledger/build";
import { ledgerFieldsSchema } from "../ledger/records";
import type { LivestockTraceAdapter } from "@/lib/verify/adapters/livestock-trace";

import { withLedgerObservationRecording } from "../ledger/observe-trace";
import {
  recordLedgerObservations,
  recordVerificationRun,
} from "../ledger/record";

const fakeReport = {
  offerId: "livestock-9",
  generatedAt: "2026-08-14T04:53:03.242Z",
  mode: "fake",
  summary: { match: 3, mismatch: 1, unverifiable: 2 },
} as unknown as VerifyReport;

describe("R-STO-19 verification_runs 매퍼 — 건수 집계만", () => {
  test("run_key는 {offer_slug}:{generated_at} 멱등 형식이다", () => {
    expect(verificationRunKey("livestock-9", "2026-08-14T04:53:03.242Z")).toBe(
      "livestock-9:2026-08-14T04:53:03.242Z",
    );
  });

  test("verdict_counts는 건수(숫자)만 담고 자유문장이 없다", () => {
    const record = buildVerificationRunRecord(fakeReport, {
      trigger: "cli",
      sourceIds: ["livestock-trace"],
    });
    expect(record.verdictCounts).toEqual({ match: 3, mismatch: 1, unverifiable: 2 });
    for (const value of Object.values(record.verdictCounts)) {
      expect(typeof value).toBe("number");
    }
    expect(record.trigger).toBe("cli");
    expect(record.mode).toBe("fake");
  });
});

describe("R-STO-20 ledger_observations — 구조화 화이트리스트·마스킹", () => {
  test("farmerNm·farmAddr 등 금지 필드명은 fields에서 거부된다", () => {
    expect(ledgerFieldsSchema.safeParse({ farmerNm: "홍길동" }).success).toBe(false);
    expect(ledgerFieldsSchema.safeParse({ farmAddr: "강원 ..." }).success).toBe(false);
    expect(
      ledgerFieldsSchema.safeParse({ birthYmd: "20240101", breed: "한우" })
        .success,
    ).toBe(true);
  });

  test("subject_key는 원문 이력번호가 아니라 마스킹 식별자다", () => {
    const observation = buildLedgerObservation({
      categoryId: "cattle",
      traceNo: "002123456789",
      sourceId: "livestock-trace",
      observedAt: "2026-08-14T00:00:00.000Z",
      subjectExists: true,
      fields: { breed: "한우", sex: "거세" },
    });
    expect(observation.subjectKey).not.toBe("002123456789");
    expect(observation.subjectKey).toContain("●");
    expect(JSON.stringify(observation)).not.toContain("002123456789");
  });

  test("cattle 트레이스 매퍼는 farmerName·farmAddress(PII)를 제외한다 (R-STO-20)", () => {
    const traceRecord = {
      traceNo: "002123456789",
      exists: true,
      birthYmd: "20240101",
      breedName: "한우",
      sexName: "거세",
      currentFarmNo: "12345678",
      currentFarm: {
        farmNo: "12345678",
        farmerName: "홍길동",
        farmAddress: "강원특별자치도 검증군 가상읍",
      },
      observedAt: "2026-08-14T00:00:00.000Z",
    } as unknown as LivestockTraceRecord;

    const observation = buildLedgerObservationFromTrace(traceRecord, {
      traceNo: "002123456789",
      sourceId: "livestock-trace",
    });
    const serialized = JSON.stringify(observation);
    expect(serialized).not.toContain("홍길동");
    expect(serialized).not.toContain("가상읍");
    expect(serialized).not.toContain("farmerName");
    expect(serialized).not.toContain("farmAddress");
    expect(observation.fields).toEqual({
      birthYmd: "20240101",
      breed: "한우",
      sex: "거세",
      currentFarmNo: "12345678",
    });
  });
});

describe("R-STO-19 best-effort 기록 — file 모드 no-op", () => {
  const saved = {
    url: process.env.DATABASE_URL,
    direct: process.env.DATABASE_URL_DIRECT,
  };
  beforeAll(() => {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_URL_DIRECT;
  });
  afterAll(() => {
    if (saved.url !== undefined) process.env.DATABASE_URL = saved.url;
    if (saved.direct !== undefined) process.env.DATABASE_URL_DIRECT = saved.direct;
  });

  test("DB 미설정이면 기록 호출이 예외 없이 생략된다", async () => {
    const record = buildVerificationRunRecord(fakeReport, { trigger: "api" });
    await expect(
      recordVerificationRun(record, { connection: "runtime" }),
    ).resolves.toBeUndefined();
    await expect(recordLedgerObservations([])).resolves.toBeUndefined();
  });

  test("withLedgerObservationRecording 데코레이터는 lookup 결과를 그대로 통과시킨다", async () => {
    let calls = 0;
    const traceRecord = {
      traceNo: "002123456789",
      exists: true,
      breedName: "한우",
      currentFarm: { farmNo: "1", farmerName: "홍길동", farmAddress: "강원 ..." },
      observedAt: "2026-08-14T00:00:00.000Z",
    } as unknown as Awaited<ReturnType<LivestockTraceAdapter["lookup"]>>;
    const base = {
      name: "fake",
      sourceId: "livestock-trace",
      sourceName: "test",
      url: "test",
      lookup: async () => {
        calls += 1;
        return traceRecord;
      },
    } as unknown as LivestockTraceAdapter;

    const wrapped = withLedgerObservationRecording(base);
    const result = await wrapped.lookup("002123456789");
    expect(result).toBe(traceRecord);
    expect(calls).toBe(1);
  });
});
