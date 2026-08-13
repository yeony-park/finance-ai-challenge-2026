import { describe, expect, test } from "vitest";

import { authorizeCronRequest } from "../amend/cron-auth";
import {
  createBlobEventStore,
  eventPathname,
  MISSING_TOKEN_REASON,
  type BlobPut,
} from "../amend/event-store";
import type { VersionReportLike } from "../amend/diff";
import { runAmendmentMonitor, type MonitorRun } from "../amend/monitor";
import type { AmendmentLineage } from "../dart/amendment-lineage";
import { DART_LIST_SOURCE_NAME } from "../dart/list-filings";
import type { Claim, DocumentRef, Verdict } from "../types";

const OFFER_ID = "livestock-9";
const RCP_NO = "20260806000159";
const AMENDED_RCP_NO = "20260820000010";
const NOW = new Date("2026-08-14T00:00:00.000Z");

const lineage = (amendments: readonly { rcpNo: string }[]): AmendmentLineage => ({
  baseRcpNo: RCP_NO,
  baseReportName: "증권신고서(투자계약증권)",
  baseReceivedOn: "20260806",
  checkedThrough: "20260814",
  amendments: amendments.map((item) => ({
    rcpNo: item.rcpNo,
    receivedOn: item.rcpNo.slice(0, 8),
    reportName: "[기재정정]증권신고서(투자계약증권)",
  })),
  sourceName: DART_LIST_SOURCE_NAME,
  notes: [],
});

const document = (rcpNo: string, submittedOn: string): DocumentRef => ({
  offerId: OFFER_ID,
  rcpNo,
  submittedOn,
});

const claim = (doc: DocumentRef, value: string): Claim => ({
  id: "custody_location:개체 24호",
  kind: "custody_location",
  subject: "개체 24호",
  field: "보관장소",
  value,
  document: doc,
  location: { section: "8", table: "개체 명세표", row: 24 },
  verifiability: "verifiable",
});

const snapshot = (
  doc: DocumentRef,
  value: string,
  verdict: Verdict,
): VersionReportLike => ({
  document: doc,
  judgements: [{ verdict, claim: claim(doc, value) }],
  unjudged: [],
});

describe("크론 인증", () => {
  test("CRON_SECRET 미설정이면 503으로 정직하게 거절한다", () => {
    const decision = authorizeCronRequest("Bearer anything", undefined);

    expect(decision).toMatchObject({ ok: false, code: "not_configured", status: 503 });
    expect(decision.message).toContain("CRON_SECRET");
  });

  test("헤더가 없거나 값이 다르면 401이다", () => {
    expect(authorizeCronRequest(null, "s3cret")).toMatchObject({
      ok: false,
      status: 401,
    });
    expect(authorizeCronRequest("Bearer wrong", "s3cret")).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  test("일치하는 Bearer 토큰만 통과시킨다", () => {
    expect(authorizeCronRequest("Bearer s3cret", "s3cret")).toMatchObject({
      ok: true,
      code: "ok",
    });
  });
});

describe("정정 감시 실행", () => {
  test("정정 0건은 정상 산출로 다룬다", async () => {
    const run = await runAmendmentMonitor({
      targets: [{ offerId: OFFER_ID, rcpNo: RCP_NO }],
      fetchLineage: async () => lineage([]),
      now: () => NOW,
    });

    expect(run.checkedAt).toBe(NOW.toISOString());
    expect(run.events).toHaveLength(1);
    expect(run.events[0]).toMatchObject({
      offerId: OFFER_ID,
      kind: "no_amendment",
      amendments: [],
    });
    expect(run.events[0]?.facts[0]).toContain("0건");
  });

  test("정정 감지 시 변경 항목과 판정 유지·변동을 이벤트에 담는다", async () => {
    const run = await runAmendmentMonitor({
      targets: [{ offerId: OFFER_ID, rcpNo: RCP_NO }],
      fetchLineage: async () => lineage([{ rcpNo: AMENDED_RCP_NO }]),
      loadReport: async () =>
        snapshot(document(RCP_NO, "2026-08-06"), "강원 ○○군", "match"),
      reverify: async (rcpNo) =>
        snapshot(document(rcpNo, "2026-08-20"), "충북 ○○군", "mismatch"),
      now: () => NOW,
    });

    const event = run.events[0];
    expect(event?.kind).toBe("amendment_detected");
    expect(event?.diff?.changedClaims).toHaveLength(1);
    expect(event?.diff?.summary.verdictChanged).toBe(1);
    expect(event?.facts.join("\n")).toContain("판정 유지 0건 · 변동 1건");
    expect(event?.facts.join("\n")).not.toMatch(/[A-D]류|중대|경미|위험도/);
  });

  test("재대조 수단이 없으면 감지 사실만 남기고 한계를 밝힌다", async () => {
    const run = await runAmendmentMonitor({
      targets: [{ offerId: OFFER_ID, rcpNo: RCP_NO }],
      fetchLineage: async () => lineage([{ rcpNo: AMENDED_RCP_NO }]),
      now: () => NOW,
    });

    const event = run.events[0];
    expect(event?.kind).toBe("amendment_detected");
    expect(event?.diff).toBeUndefined();
    expect(event?.notes.join(" ")).toContain("재대조가 실행되지 않아");
  });

  test("조회 실패와 접수번호 미매핑은 감지 실패로 정직하게 남는다", async () => {
    const run = await runAmendmentMonitor({
      targets: [
        { offerId: OFFER_ID, rcpNo: RCP_NO },
        { offerId: "real-estate-1" },
      ],
      fetchLineage: async () => {
        throw new Error("DART 공시검색 HTTP 500");
      },
      now: () => NOW,
    });

    expect(run.events.map((event) => event.kind)).toEqual([
      "detection_failed",
      "detection_failed",
    ]);
    expect(run.events[0]?.notes[0]).toContain("DART 공시검색 HTTP 500");
    expect(run.events[1]?.notes[0]).toContain("접수번호 매핑이 없어");
  });
});

const RUN: MonitorRun = {
  checkedAt: NOW.toISOString(),
  source: DART_LIST_SOURCE_NAME,
  events: [],
};

describe("이벤트 적재", () => {
  test("Blob 토큰이 없으면 저장하지 않고 이유를 밝힌다", async () => {
    const store = createBlobEventStore(undefined, async () => {
      throw new Error("호출되면 안 된다");
    });

    expect(await store(RUN)).toEqual({
      stored: false,
      reason: MISSING_TOKEN_REASON,
    });
  });

  test("토큰이 있으면 확인 시각 기준 경로로 적재한다", async () => {
    const calls: string[] = [];
    const put: BlobPut = async (pathname) => {
      calls.push(pathname);
      return { pathname, url: `https://blob.test/${pathname}` };
    };

    const result = await createBlobEventStore("blob-token", put)(RUN);

    expect(calls).toEqual([eventPathname(RUN.checkedAt)]);
    expect(result.stored).toBe(true);
    expect(result.url).toContain("amend-events");
  });

  test("적재 실패는 삼키지 않고 응답으로 되돌린다", async () => {
    const store = createBlobEventStore("blob-token", async () => {
      throw new Error("store suspended");
    });

    const result = await store(RUN);

    expect(result.stored).toBe(false);
    expect(result.reason).toContain("store suspended");
  });
});
