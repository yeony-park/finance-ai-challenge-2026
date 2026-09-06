import { describe, expect, test } from "vitest";

import type { OfferEntry } from "@/components/site/offers";
import {
  WATCH_NO_AMENDMENTS,
  WATCH_NO_RECORD,
} from "@/lib/content/watch-band";
import type { WatchState } from "@/lib/verify/amend/watch-state";

import { buildWatchSummaryEntry, loadWatchSummaries } from "./watch-summary";

const OFFER: OfferEntry = {
  id: "livestock-9",
  title: "가축 9호",
  assetLabel: "가축",
  assetKind: "livestock",
  subscription: {
    opensAt: "2026-09-08T10:00:00+09:00",
    closesAt: "2026-09-22T16:00:00+09:00",
  },
};

const REAL_ESTATE_OFFER: OfferEntry = {
  id: "real-estate-a",
  title: "부동산 A",
  assetLabel: "부동산",
  assetKind: "real-estate",
  subscription: {
    opensAt: "2025-09-08T10:00:00+09:00",
    closesAt: "2025-09-22T16:00:00+09:00",
  },
};

const WATCH: WatchState = {
  offerId: OFFER.id,
  checkedAt: "2026-08-16T00:52:00+09:00",
  baseRcpNo: "20260806000159",
  checkedThrough: "20260816",
  amendmentCount: 0,
  amendments: [],
  sourceName: "OpenDART 공시검색",
  detectionFailed: false,
  notes: [],
};

describe("관심 공모 정정 감시 요약", () => {
  test("한돈 공시와 미술품·부동산 검토 자료를 저장 목록에서 다시 열 수 있다", async () => {
    const entries = await loadWatchSummaries([]);
    expect(entries.filter((entry) => entry.isScenario)).toHaveLength(13);
    expect(entries).toContainEqual(expect.objectContaining({
      id: "art-synthetic-offering-01",
      reportHref: "/art/products/synthetic-offering-01",
      isSynthetic: true,
      amendmentLine: "합성 데이터 · 실제 공시 감시 대상이 아닙니다.",
    }));
    expect(entries.some((entry) =>
      entry.id.startsWith("art-historical-offering-") && entry.isSynthetic,
    )).toBe(true);
    for (const round of [1, 2, 3]) {
      expect(entries).toContainEqual(expect.objectContaining({
        id: `pig-${round}`,
        reportHref: `/pig/products/round-${round}`,
        title: `한돈 ${round}호`,
      }));
    }
    expect(entries).toContainEqual(expect.objectContaining({
      id: "re-offer-01",
      reportHref: "/real-estate/products/re-offer-01",
      isScenario: true,
      amendmentLine: "검토용 시나리오 · 실제 공시 감시 대상이 아닙니다.",
    }));
  });
  test("감시 기록이 없으면 기록 없음으로 구분한다", () => {
    const summary = buildWatchSummaryEntry(OFFER, null);

    expect(summary.amendmentLine).toBe(WATCH_NO_RECORD);
    expect(summary.reportHref).toBe("/cattle/products/livestock-9");
    expect(summary.checkedLine).toBeNull();
    expect(summary.isDetectionFailed).toBe(false);
  });

  test("부동산 관심 공모는 부동산 상품 상세 경로를 사용한다", () => {
    const summary = buildWatchSummaryEntry(REAL_ESTATE_OFFER, null);

    expect(summary.reportHref).toBe(
      "/real-estate/products/real-estate-a",
    );
  });

  test("정정 0건과 최근 감시 시각을 표시한다", () => {
    const summary = buildWatchSummaryEntry(OFFER, WATCH);

    expect(summary.amendmentLine).toBe(WATCH_NO_AMENDMENTS);
    expect(summary.checkedLine).toContain("최근 감시");
  });

  test("정정 접수 건수와 최근 접수일을 표시한다", () => {
    const summary = buildWatchSummaryEntry(OFFER, {
      ...WATCH,
      amendmentCount: 2,
      amendments: [
        { rcpNo: "20260814000001", receivedOn: "20260814", reportName: "정정신고서" },
        { rcpNo: "20260815000002", receivedOn: "20260815", reportName: "정정신고서" },
      ],
    });

    expect(summary.amendmentLine).toContain("2건");
    expect(summary.amendmentLine).toContain("2026. 8. 15.");
  });

  test("감시 실패 기록은 별도 오류 상태로 전달한다", () => {
    const summary = buildWatchSummaryEntry(OFFER, {
      ...WATCH,
      detectionFailed: true,
    });

    expect(summary.isDetectionFailed).toBe(true);
  });
});
