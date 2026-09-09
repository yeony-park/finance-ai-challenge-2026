import { describe, expect, test } from "vitest";

import type { LedgerMonitorEvent } from "@/lib/db/ledger/monitor-read";

import {
  UNCONFIRMED_REPORT_NAME,
  mergeWatchState,
  receivedOnFromRcpNo,
} from "../amend/watch-merge";
import type { WatchState } from "../amend/watch-state";

const OFFER_ID = "livestock-9";
const BASE_RCP_NO = "20260814003572";
const SOURCE = "OpenDART 공시검색 (금융감독원 · opendart.fss.or.kr)";

const FILE: WatchState = {
  offerId: OFFER_ID,
  checkedAt: "2026-09-06T17:12:09.111Z",
  baseRcpNo: BASE_RCP_NO,
  checkedThrough: "20260907",
  amendmentCount: 1,
  amendments: [
    {
      rcpNo: "20260902000022",
      receivedOn: "20260902",
      reportName: "[기재정정]증권신고서(투자계약증권)",
    },
  ],
  sourceName: SOURCE,
  detectionFailed: false,
  notes: ["정정본 재대조가 실행되지 않아 변경 항목·판정 유지/변동을 아직 계산하지 못했습니다."],
};

const ledgerEvent = (
  overrides: Partial<LedgerMonitorEvent> = {},
): LedgerMonitorEvent => ({
  checkedAt: "2026-09-07T00:11:00.000Z",
  source: SOURCE,
  kind: "amendment_detected",
  baseRcpNo: BASE_RCP_NO,
  checkedThrough: "20260907",
  amendmentRcpNos: ["20260902000022"],
  ...overrides,
});

describe("mergeWatchState — 파일 기록과 cron 원장 기록 합치기", () => {
  test("원장 기록이 없으면 파일 기록을 그대로 돌려준다", () => {
    expect(mergeWatchState({ offerId: OFFER_ID, file: FILE, ledger: [] })).toBe(FILE);
  });

  test("파일이 더 최근이면 파일 기록을 유지한다", () => {
    const older = ledgerEvent({ checkedAt: "2026-09-03T00:50:00.000Z" });

    expect(mergeWatchState({ offerId: OFFER_ID, file: FILE, ledger: [older] })).toBe(FILE);
  });

  test("원장이 더 최근이면 확인 시각을 원장 기준으로 바꾸고 알려진 서류명은 재사용한다", () => {
    const merged = mergeWatchState({ offerId: OFFER_ID, file: FILE, ledger: [ledgerEvent()] });

    expect(merged).toMatchObject({
      offerId: OFFER_ID,
      checkedAt: "2026-09-07T00:11:00.000Z",
      baseRcpNo: BASE_RCP_NO,
      checkedThrough: "20260907",
      amendmentCount: 1,
      sourceName: SOURCE,
      detectionFailed: false,
    });
    expect(merged?.amendments).toEqual(FILE.amendments);
    expect(merged?.notes.join(" ")).not.toContain("서류명은 다음 감시 파일 갱신");
  });

  test("파일에 없는 새 접수번호는 접수일을 접수번호에서 뽑고 서류명은 확인 전으로 둔다", () => {
    const merged = mergeWatchState({
      offerId: OFFER_ID,
      file: FILE,
      ledger: [
        ledgerEvent({
          checkedAt: "2026-09-10T00:09:00.000Z",
          checkedThrough: "20260910",
          amendmentRcpNos: ["20260902000022", "20260909000777"],
        }),
      ],
    });

    expect(merged?.amendmentCount).toBe(2);
    expect(merged?.amendments.at(-1)).toEqual({
      rcpNo: "20260909000777",
      receivedOn: "20260909",
      reportName: UNCONFIRMED_REPORT_NAME,
    });
    expect(merged?.amendments[0]).toEqual(FILE.amendments[0]);
    expect(merged?.notes.some((note) => note.includes("20260909000777"))).toBe(true);
  });

  test("파일이 없어도 원장 기록만으로 상태를 만든다", () => {
    const merged = mergeWatchState({ offerId: OFFER_ID, file: undefined, ledger: [ledgerEvent()] });

    expect(merged?.amendments).toEqual([
      { rcpNo: "20260902000022", receivedOn: "20260902", reportName: UNCONFIRMED_REPORT_NAME },
    ]);
  });

  test("정정 0건 기록은 접수 없음으로 옮긴다", () => {
    const merged = mergeWatchState({
      offerId: OFFER_ID,
      file: { ...FILE, amendmentCount: 0, amendments: [], notes: [] },
      ledger: [ledgerEvent({ kind: "no_amendment", amendmentRcpNos: [] })],
    });

    expect(merged).toMatchObject({ amendmentCount: 0, amendments: [], notes: [] });
  });

  test("최신 자동 조회가 실패했으면 그 전 성공 기록을 보여주고 실패 사실을 남긴다", () => {
    const merged = mergeWatchState({
      offerId: OFFER_ID,
      file: FILE,
      ledger: [
        ledgerEvent({ checkedAt: "2026-09-10T00:09:00.000Z", kind: "detection_failed", amendmentRcpNos: [] }),
        ledgerEvent(),
      ],
    });

    expect(merged).toMatchObject({
      checkedAt: "2026-09-07T00:11:00.000Z",
      amendmentCount: 1,
      detectionFailed: false,
    });
    expect(merged?.notes.at(-1)).toContain("2026. 9. 10. 09:09 자동 조회는 실패");
  });

  test("실패 앞의 성공 기록이 파일보다 오래되면 파일 기록에 실패 사실만 덧붙인다", () => {
    const merged = mergeWatchState({
      offerId: OFFER_ID,
      file: FILE,
      ledger: [
        ledgerEvent({ checkedAt: "2026-09-10T00:09:00.000Z", kind: "detection_failed", amendmentRcpNos: [] }),
        ledgerEvent({ checkedAt: "2026-09-03T00:50:00.000Z" }),
      ],
    });

    expect(merged?.checkedAt).toBe(FILE.checkedAt);
    expect(merged?.amendments).toEqual(FILE.amendments);
    expect(merged?.notes).toHaveLength(FILE.notes.length + 1);
  });

  test("파일도 성공 기록도 없으면 실패 상태를 그대로 드러낸다", () => {
    const merged = mergeWatchState({
      offerId: OFFER_ID,
      file: undefined,
      ledger: [ledgerEvent({ kind: "detection_failed", amendmentRcpNos: [] })],
    });

    expect(merged).toMatchObject({ detectionFailed: true, amendmentCount: 0 });
  });
});

describe("receivedOnFromRcpNo", () => {
  test("DART 접수번호 14자리에서 앞 8자리를 접수일로 쓴다", () => {
    expect(receivedOnFromRcpNo("20260902000022")).toBe("20260902");
  });

  test("형식이 다르면 빈 문자열을 돌려준다", () => {
    expect(receivedOnFromRcpNo("abc")).toBe("");
  });
});
