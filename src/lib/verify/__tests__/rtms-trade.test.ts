import { describe, expect, test } from "vitest";

import {
  createRtmsTradeAdapter,
  monthsBefore,
  normalizeRtmsResponse,
  parseRtmsMonthCache,
  rtmsFaultOf,
  type RtmsMonthCache,
} from "../adapters/rtms-trade";
import { createFakeRtmsTradeAdapter } from "../adapters/rtms-trade-fake";
import {
  dealYmdOf,
  rtmsCacheFile,
  rtmsMonthsBetween,
} from "../reference/rtms-collect";

const XML = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header><body><items>
<item><dealAmount> 455,000 </dealAmount><dealYear>2026</dealYear><dealMonth>3</dealMonth><dealDay>11</dealDay><umdNm>서초동</umdNm><buildingType>상업업무용</buildingType><buildingUse>사무소</buildingUse><buildingAr>418.9</buildingAr><plottageAr>210.5</plottageAr><floor>12</floor><buildYear>2008</buildYear></item>
<item><dealAmount>12,000</dealAmount><dealYear>2026</dealYear><dealMonth>3</dealMonth><dealDay>2</dealDay><umdNm>잠원동</umdNm><buildingType>상업업무용</buildingType><buildingUse>근린생활시설</buildingUse><cdealType>O</cdealType><cdealDay>26.03.20</cdealDay></item>
<item><dealYear>2026</dealYear><dealMonth>3</dealMonth><dealDay>5</dealDay><umdNm>서초동</umdNm></item>
</items></body></response>`;

const FAULT_XML = `<?xml version="1.0" encoding="UTF-8"?><OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</errMsg><returnAuthMsg>등록되지 않은 서비스키</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`;

const cacheOf = (month: string, trades: RtmsMonthCache["trades"]): RtmsMonthCache => ({
  schemaVersion: 1,
  month,
  lawdCd: "11650",
  sigunguName: "서울 서초구",
  status: "ok",
  cancelledCount: 0,
  collectedAt: "2026-08-14T00:00:00.000Z",
  sourceId: "molit-rtms-nrg-trade",
  sourceName: "국토교통부 상업업무용 부동산 매매 신고 자료",
  endpoint: "https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade",
  trades,
});

describe("실거래 응답 정규화", () => {
  test("거래금액은 만원 단위로 오므로 원 단위로 환산한다", () => {
    const { trades } = normalizeRtmsResponse(XML);

    expect(trades).toHaveLength(1);
    expect(trades[0].amountWon).toBe(4_550_000_000);
    expect(trades[0].dealOn).toBe("2026-03-11");
    expect(trades[0].dong).toBe("서초동");
    expect(trades[0].buildingAreaSqm).toBe(418.9);
  });

  test("해제된 거래는 비교군에 넣지 않고 건수만 센다", () => {
    const { trades, cancelledCount } = normalizeRtmsResponse(XML);

    expect(cancelledCount).toBe(1);
    expect(trades.some((trade) => trade.dong === "잠원동")).toBe(false);
  });

  test("금액·계약일이 없는 행은 0원으로 둔갑하지 않고 빠진다", () => {
    const { trades } = normalizeRtmsResponse(XML);

    expect(trades.every((trade) => trade.amountWon > 0)).toBe(true);
  });

  test("활용신청 미승인 응답은 표본 없음이 아니라 실패로 드러난다", () => {
    expect(() => normalizeRtmsResponse(FAULT_XML)).toThrow(
      /SERVICE_KEY_IS_NOT_REGISTERED_ERROR/,
    );
    expect(() => normalizeRtmsResponse(FAULT_XML)).toThrow(/returnReasonCode=30/);
  });

  test("장애 응답(HTML 등)은 표본 없음으로 둔갑하지 않고 실패한다", () => {
    expect(() => normalizeRtmsResponse("<html>service down</html>")).toThrow(
      /인식할 수 없습니다/,
    );
  });

  test("정상 응답에서는 거부 사유가 잡히지 않는다", () => {
    expect(rtmsFaultOf({ response: { body: {} } })).toBeUndefined();
  });
});

describe("실거래 캐시 스키마", () => {
  test("스키마를 벗어난 캐시는 조용히 통과하지 않는다", () => {
    expect(() =>
      parseRtmsMonthCache({ schemaVersion: 1, month: "2026-3" }, "(테스트)"),
    ).toThrow(/올바르지 않습니다/);
  });

  test("수집 실패로 남은 달은 status=failed로 보존된다", () => {
    const parsed = parseRtmsMonthCache(
      {
        ...cacheOf("2026-03", []),
        status: "failed",
        reason: "HTTP 403 · 등록되지 않은 서비스키",
      },
      "(테스트)",
    );

    expect(parsed.status).toBe("failed");
    expect(parsed.reason).toContain("403");
  });
});

describe("실거래 어댑터 — 캐시만 읽는다", () => {
  const adapter = createRtmsTradeAdapter(
    [
      cacheOf("2026-02", [
        {
          dong: "서초동",
          buildingType: "상업업무용",
          buildingUse: "사무소",
          dealOn: "2026-02-11",
          amountWon: 5_120_000_000,
        },
        {
          dong: "반포동",
          buildingType: "상업업무용",
          buildingUse: "사무소",
          dealOn: "2026-02-12",
          amountWon: 3_000_000_000,
        },
      ]),
      { ...cacheOf("2026-03", []), status: "failed", reason: "HTTP 403" },
    ],
    { name: "cache", lawdCd: "11650", sigunguName: "서울 서초구" },
  );

  test("법정동이 다른 신고는 비교군에 들어오지 않는다", () => {
    const window = adapter.window({ months: ["2026-02"], dong: "서초동" });

    expect(window.trades).toHaveLength(1);
    expect(window.trades[0].amountWon).toBe(5_120_000_000);
  });

  test("수집 실패한 달은 비교군이 아니라 결측으로 남는다", () => {
    const window = adapter.window({ months: ["2026-02", "2026-03"], dong: "서초동" });

    expect(window.missingMonths).toEqual(["2026-03"]);
    expect(window.trades).toHaveLength(1);
  });

  test("조회 시각은 실제로 읽은 캐시에서만 나온다", () => {
    expect(adapter.window({ months: ["2026-03"], dong: "서초동" }).collectedAt).toBe(
      "",
    );
  });
});

describe("픽스처 어댑터", () => {
  test("픽스처는 출처 이름에 픽스처임을 적어 둔다", () => {
    expect(createFakeRtmsTradeAdapter().sourceName).toContain("픽스처");
  });

  test("공모·매각 두 구간이 모두 재생된다", () => {
    const adapter = createFakeRtmsTradeAdapter();

    expect(adapter.window({ months: monthsBefore("2021-07", 3), dong: "서초동" }).trades)
      .toHaveLength(7);
    expect(adapter.window({ months: monthsBefore("2026-03", 3), dong: "서초동" }).trades)
      .toHaveLength(13);
  });
});

describe("수집 구간 계산", () => {
  test("직전 3개월 창은 기준 월을 포함해 해를 넘어간다", () => {
    expect(monthsBefore("2026-01", 3)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  test("뒤집힌 구간은 조용히 비지 않고 실패한다", () => {
    expect(() => rtmsMonthsBetween("2026-03", "2026-01")).toThrow(/뒤집혔습니다/);
  });

  test("DEAL_YMD는 하이픈 없는 6자리다", () => {
    expect(dealYmdOf("2026-03")).toBe("202603");
  });

  test("캐시 파일명은 법정동코드와 월로 정해진다", () => {
    expect(rtmsCacheFile({ lawdCd: "11650", month: "2026-03" }, "data")).toMatch(
      /reference\/rtms\/11650-2026-03\.json$/,
    );
  });

  test("법정동코드 형식이 어긋나면 경로를 만들지 않는다", () => {
    expect(() => rtmsCacheFile({ lawdCd: "11650../", month: "2026-03" })).toThrow(
      /법정동코드/,
    );
  });
});
