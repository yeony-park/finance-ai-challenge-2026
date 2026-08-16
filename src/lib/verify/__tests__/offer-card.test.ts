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
  checkedAt: "2026-08-13T17:45:24.412Z",
  baseRcpNo: "20260806000159",
  checkedThrough: "20260814",
  amendmentCount: 0,
  amendments: [],
  sourceName: "OpenDART 공시검색 (금융감독원 · opendart.fss.or.kr)",
  detectionFailed: false,
  notes: [],
};

const ENTRY: OfferEntry = {
  id: "livestock-9",
  title: "가축 9호",
  assetLabel: "가축",
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
    expect(schedule.badge).toBe("청약 D-14");
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

    expect(schedule.badge).toBe("청약 D-DAY");
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
    });

  test("4블록이 모두 채워진다", async () => {
    const card = await buildCard();

    expect(card.title).toBe("가축 9호");
    expect(card.href).toBe("/offers/livestock-9");
    expect(card.schedule.label).toContain("~");
    expect(card.schedule.badge).toContain("D-");
    expect(card.verdictLine.length).toBeGreaterThan(0);
    expect(card.tallies).toHaveLength(3);
    expect(card.lastVerifiedAt).toContain("최근 재대조");
    expect(card.amendment).toContain("정정");
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
    const text = [card.verdictLine, card.lastVerifiedAt, card.amendment].join(" ");

    expect(text).not.toContain("불일치");
  });
});

describe("buildOfferCard — 정정 감시 라인은 감시 기록의 함수다", () => {
  const buildCard = async (watch: WatchState | null) =>
    buildOfferCard({
      offer: ENTRY,
      now: kst("2026-08-14T09:00:00"),
      watch,
      ...(await loadLatestReport(ENTRY.id)),
    });

  test("감시 기록이 없으면 미조회 문구를 유지한다", async () => {
    const card = await buildCard(null);

    expect(card.amendment).toContain("정정 접수 감시 미연결");
    expect(card.hasAmendment).toBe(false);
  });

  test("접수 0건이면 건수와 최근 확인 날짜를 적는다", async () => {
    const card = await buildCard(WATCH);

    expect(card.amendment).toBe("정정 0건 · 최근 확인 8. 14.");
    expect(card.hasAmendment).toBe(false);
  });

  test("접수가 있으면 건수를 그대로 적는다", async () => {
    const card = await buildCard({
      ...WATCH,
      amendmentCount: 2,
      amendments: [
        { rcpNo: "20260901000001", receivedOn: "20260901", reportName: "정정신고서" },
        { rcpNo: "20260902000002", receivedOn: "20260902", reportName: "정정신고서" },
      ],
    });

    expect(card.amendment).toBe("정정 2건 접수 · 최근 확인 8. 14.");
    expect(card.hasAmendment).toBe(true);
  });

  test("조회가 실패한 기록은 건수를 지어내지 않는다", async () => {
    const card = await buildCard({ ...WATCH, detectionFailed: true });

    expect(card.amendment).toBe("정정 접수 여부 미확인 · 최근 조회 8. 14.");
    expect(card.hasAmendment).toBe(false);
  });
});
