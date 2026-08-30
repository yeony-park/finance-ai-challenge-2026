import { describe, expect, test } from "vitest";
import {
  buildOfferSchedule,
  formatScheduleTime,
  OFFERS,
  PUBLISHED_OFFER_IDS,
  TOTAL_2026_OFFER_COUNT,
  type OfferEntry,
} from "@/components/site/offers";

import type { WatchState } from "../amend/watch-state";
import { loadLatestReport } from "../report/load";
import { buildOfferCard } from "../report/view-model/offer-card";

const WATCH: WatchState = {
  offerId: "livestock-9",
  checkedAt: "2026-08-14T09:00:00.000Z",
  baseRcpNo: "20260806000159",
  checkedThrough: "20260814",
  amendmentCount: 1,
  amendments: [
    {
      rcpNo: "20260814003572",
      receivedOn: "20260814",
      reportName: "[기재정정]증권신고서(투자계약증권)",
    },
  ],
  sourceName: "OpenDART 공시검색 (금융감독원 · opendart.fss.or.kr)",
  detectionFailed: false,
  notes: [],
};

const ENTRY: OfferEntry = {
  id: "livestock-9",
  title: "한우 9호",
  assetLabel: "한우",
  assetKind: "livestock",
  subscription: {
    opensAt: "2026-08-27T10:00:00+09:00",
    closesAt: "2026-09-10T16:00:00+09:00",
  },
};

const kst = (value: string): Date => new Date(`${value}+09:00`);

describe("buildOfferSchedule — D-day는 기준 시각의 함수다", () => {
  test("청약 개시 전에는 개시까지 남은 날수를 센다", () => {

    const now = kst("2026-08-13T09:00:00");

    const schedule = buildOfferSchedule(ENTRY, now);

    expect(schedule.phase).toBe("upcoming");
    expect(schedule.dday).toBe(14);
    expect(schedule.badge).toBe("D-14");
  });

  test("같은 날 자정 직전에도 달력일 기준이라 날수가 흔들리지 않는다", () => {
    const schedule = buildOfferSchedule(ENTRY, kst("2026-08-13T23:59:00"));

    expect(schedule.dday).toBe(14);
  });

  test("청약 개시 전은 upcoming 단계로 구분한다", () => {
    const schedule = buildOfferSchedule(ENTRY, kst("2026-08-20T09:00:00"));

    expect(schedule.phase).toBe("upcoming");
  });

  test("청약 개시 당일 개시 시각 전에는 D-DAY로 적는다", () => {
    const schedule = buildOfferSchedule(ENTRY, kst("2026-08-27T09:00:00"));

    expect(schedule.badge).toBe("D-DAY");
  });

  test("청약 중에는 마감까지 남은 날수를 센다", () => {
    const schedule = buildOfferSchedule(ENTRY, kst("2026-09-07T12:00:00"));

    expect(schedule.phase).toBe("open");
    expect(schedule.dday).toBe(3);
    expect(schedule.badge).toBe("마감 D-3");
  });

  test("청약 종료 후에는 남은 날수를 세지 않고 종료 사실만 적는다", () => {
    const schedule = buildOfferSchedule(ENTRY, kst("2026-09-10T16:00:01"));

    expect(schedule.phase).toBe("closed");
    expect(schedule.dday).toBeNull();
    expect(schedule.badge).toBe("청약 종료");
  });

  test("일정 문자열은 KST 시:분까지 적는다", () => {
    const schedule = buildOfferSchedule(ENTRY, kst("2026-08-13T09:00:00"));

    expect(schedule.label).toBe("8/27 10:00 ~ 9/10 16:00");
    expect(formatScheduleTime("2026-09-10T16:00:00+09:00")).toBe("9/10 16:00");
  });
});

describe("레지스트리 — 목록의 원천은 한 곳뿐이다", () => {
  test("공개 허용목록은 레지스트리에서 파생된다", () => {
    expect(PUBLISHED_OFFER_IDS).toEqual(OFFERS.map((offer) => offer.id));
  });

  test("커버리지 분자(2026 코호트)는 분모를 넘지 않는다", () => {
    const cohort2026 = OFFERS.filter(
      (offer) => new Date(offer.subscription.closesAt).getFullYear() === 2026,
    );
    expect(OFFERS.length).toBeGreaterThan(0);
    expect(cohort2026.length).toBeGreaterThan(0);
    expect(cohort2026.length).toBeLessThanOrEqual(TOTAL_2026_OFFER_COUNT);
  });
});

describe("buildOfferCard — 카드 값은 레지스트리와 리포트에서만 나온다", () => {
  const buildCard = async () =>
    buildOfferCard({
      offer: ENTRY,
      now: kst("2026-08-13T09:00:00"),
      ...(await loadLatestReport(ENTRY.id)),
      watch: WATCH,
      hasFilingFacts: true,
    });

  test("4블록이 모두 채워진다", async () => {
    const card = await buildCard();

    expect(card.title).toBe("한우 9호");
    expect(card.href).toBe("/offers/livestock-9");
    expect(card.schedule.label).toContain("~");
    expect(card.schedule.badge).toContain("D-");
    expect(card.verdictLine.length).toBeGreaterThan(0);
    expect(card.tallies).toHaveLength(3);
    expect(card.lastVerifiedAt).toContain("최근 재대조");
    expect(card.amendment).toBe(
      "정정신고서 1건 접수 (최근 2026. 8. 14.)",
    );
    expect(card.amendmentIsAlert).toBe(true);
    expect(card.hasFilingFacts).toBe(true);
  });

  test("판정 요약의 주어는 공모이고 개체 수가 분모다", async () => {
    const card = await buildCard();

    expect(card.verdictLine.startsWith("이 공모의 개체 ")).toBe(true);
    expect(card.verdictLine).toContain("두");
  });

  test("3값 집계 라벨은 화면 판정 명칭 3종뿐이다", async () => {
    const card = await buildCard();

    expect(card.tallies.map((tally) => tally.label)).toEqual([
      "일치",
      "원장 불일치",
      "대조 불가",
    ]);
  });

  test("카드 문장에 화면 금지 용어(불일치)가 들어가지 않는다", async () => {
    const card = await buildCard();
    const text = [card.verdictLine, card.lastVerifiedAt].join(" ");

    expect(text).not.toContain("불일치");
  });
});

describe("buildOfferCard — 정정 감시 상태를 사실대로 표시한다", () => {
  const buildCard = async (watch: WatchState | null) =>
    buildOfferCard({
      offer: ENTRY,
      now: kst("2026-08-14T09:00:00"),
      ...(await loadLatestReport(ENTRY.id)),
      watch,
    });

  test("감시 기록이 없으면 기록 없음으로 표시한다", async () => {
    const card = await buildCard(null);

    expect(card.amendment).toBe("감시 기록 없음");
    expect(card.amendmentIsAlert).toBe(false);
  });

  test("감시 조회 실패를 정정 0건으로 바꾸지 않는다", async () => {
    const card = await buildCard({ ...WATCH, detectionFailed: true });

    expect(card.amendment).toBe(
      "이번 주기 감시 확인 실패 — 다음 주기에 다시 확인합니다",
    );
    expect(card.amendmentIsAlert).toBe(true);
  });
});
