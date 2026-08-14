import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  buildOfferSchedule,
  OFFERS,
  TOTAL_2026_OFFER_COUNT,
} from "@/components/site/offers";

import { selectHeadRows, selectHeadTable } from "../claims/extract-rules";
import { POST_CLOSE_NOTE, scheduleNotes } from "../offer-notes";
import { resolveDocumentProfile } from "../parse/profiles";
import { rcpNoForOffer, resolveOfferId } from "../pipeline";
import { loadLatestReport } from "../report/load";
import { toDemoView } from "../report/view-model";
import { hasLocalFile, rawXmlPath, skipReason } from "./local-data";

const BASE_RCP_NO = "20260326001272";
const AMENDMENT_RCP_NO = "20260414002068";

const kst = (value: string): Date => new Date(`${value}+09:00`);

const is2026Cohort = (closesAt: string): boolean =>
  new Date(closesAt).getFullYear() === 2026;

describe("2026 코호트 — 커버리지 분모와 분자가 갈리는 지점", () => {
  test("분모는 전수 8건으로 고정돼 있다", () => {
    expect(TOTAL_2026_OFFER_COUNT).toBe(8);
  });

  test("분자는 개체 원장 대조가 가능한 공모만 센다", () => {
    const cohort = OFFERS.filter((offer) => is2026Cohort(offer.subscription.closesAt));

    expect(cohort.map((offer) => offer.id)).toEqual([
      "livestock-7",
      "livestock-8",
      "livestock-9",
    ]);
    expect(cohort.every((offer) => offer.assetKind === "livestock")).toBe(true);
    expect(cohort.length).toBeLessThanOrEqual(TOTAL_2026_OFFER_COUNT);
  });
});

describe("가축 8호 — 레지스트리 매핑", () => {
  test("원 신고서와 정정신고서가 같은 공모로 모인다", () => {
    expect(resolveOfferId(BASE_RCP_NO)).toBe("livestock-8");
    expect(resolveOfferId(AMENDMENT_RCP_NO)).toBe("livestock-8");
  });

  test("정정 계보 조회의 기준은 정정본이 아니라 원 신고서다", () => {
    expect(rcpNoForOffer("livestock-8")).toBe(BASE_RCP_NO);
  });

  test("발행사 프로필이 등록돼 폴백 경고 없이 해석된다", () => {
    const resolved = resolveDocumentProfile("livestock-8");

    expect(resolved.matched).toBe(true);
    expect(resolved.profile.tableName).toBe("기초자산 개체 명세표");
  });
});

describe("가축 8호 — 청약 일정과 사후 대조 표기", () => {
  const entry = OFFERS.find((offer) => offer.id === "livestock-8");

  test("일정은 1차 개시부터 2차 마감까지를 한 줄로 적는다", () => {
    expect(entry).toBeDefined();
    expect(buildOfferSchedule(entry!, kst("2026-05-01T09:00:00")).label).toBe(
      "4/17 10:00 ~ 6/10 16:00",
    );
  });

  test("마감 이후 실행분에는 사후 대조 노트가 붙는다", () => {
    expect(scheduleNotes(BASE_RCP_NO, kst("2026-08-14T09:00:00"))).toEqual([
      POST_CLOSE_NOTE,
    ]);
  });

  test("청약 중 실행분에는 사후 대조 노트를 붙이지 않는다", () => {
    expect(scheduleNotes(BASE_RCP_NO, kst("2026-05-01T09:00:00"))).toEqual([]);
  });
});

describe("리포트 제목 — 공모가 늘어도 서로 구분된다", () => {
  const titleOf = async (offerId: string): Promise<string> =>
    toDemoView(await loadLatestReport(offerId)).verdict.title;

  test("가축 공모 세 건의 제목이 겹치지 않는다", async () => {
    const titles = await Promise.all(
      ["livestock-7", "livestock-8", "livestock-9"].map(titleOf),
    );

    expect(new Set(titles).size).toBe(3);
    expect(titles[1]).toContain("가축 8호");
  });

  test("제목에 발행사명·브랜드가 들어가지 않는다", async () => {
    const title = await titleOf("livestock-8");

    for (const forbidden of ["스탁키퍼", "뱅카우", "충만", "학산"]) {
      expect(title).not.toContain(forbidden);
    }
  });
});

const RAW_XML_PATH = rawXmlPath(AMENDMENT_RCP_NO);
const hasRawXml = hasLocalFile(RAW_XML_PATH);

describe.skipIf(!hasRawXml)(
  `가축 8호 원문 — 확장한 프로필이 개체 명세표를 그대로 집는다 ${hasRawXml ? "" : skipReason(RAW_XML_PATH)}`,
  () => {
    const document = {
      offerId: "livestock-8",
      rcpNo: AMENDMENT_RCP_NO,
      submittedOn: "2026-04-14",
    } as const;

    test("1차 명세표 66개체를 뽑고, 2차 표가 남아 있다는 사실을 기록한다", () => {
      const selection = selectHeadTable(readFileSync(RAW_XML_PATH, "utf8"), document);

      expect(selection).toBeDefined();
      expect(selection!.source.section).toBe("8. 기초자산 취득에 관한 사항");
      expect(selectHeadRows(selection!)).toHaveLength(66);
      expect(selection!.notes.join(" ")).toContain("첫 번째 표만 사용");
    });

    test("이력번호 칸은 9자리 개체 식별자로 채워져 있다", () => {
      const selection = selectHeadTable(readFileSync(RAW_XML_PATH, "utf8"), document);
      const traceNos = selectHeadRows(selection!).map((head) => head.traceNoRaw);

      expect(traceNos.every((traceNo) => /^\d{9}$/.test(traceNo))).toBe(true);
      expect(new Set(traceNos).size).toBe(traceNos.length);
    });
  },
);
