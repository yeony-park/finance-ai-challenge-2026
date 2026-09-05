import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import {
  createRtmsTradeAdapter,
  monthsBefore,
  normalizeRtmsResponse,
  parseRtmsMonthCache,
  RTMS_EXTERNAL_MESSAGE_MAX_LENGTH,
  rtmsFaultOf,
  type RtmsMonthCache,
} from "../adapters/rtms-trade";
import {
  createFakeRtmsTradeAdapter,
  resolveRtmsTradeAdapter,
} from "../adapters/rtms-trade-fake";
import {
  dealYmdOf,
  rtmsCacheFile,
  rtmsMonthsBetween,
} from "../reference/rtms-collect";

const XML = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header><body><items>
<item><dealAmount> 455,000 </dealAmount><dealYear>2026</dealYear><dealMonth>3</dealMonth><dealDay>11</dealDay><umdNm>서초동</umdNm><buildingType>상업업무용</buildingType><buildingUse>사무소</buildingUse><buildingAr>418.9</buildingAr><plottageAr>210.5</plottageAr><floor>12</floor><buildYear>2008</buildYear></item>
<item><dealAmount>12,000</dealAmount><dealYear>2026</dealYear><dealMonth>3</dealMonth><dealDay>2</dealDay><umdNm>잠원동</umdNm><buildingType>상업업무용</buildingType><buildingUse>근린생활시설</buildingUse><cdealType>O</cdealType><cdealDay>26.03.20</cdealDay></item>
<item><dealYear>2026</dealYear><dealMonth>3</dealMonth><dealDay>5</dealDay><umdNm>서초동</umdNm></item>
</items><totalCount>3</totalCount></body></response>`;

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

const tempDirs: string[] = [];

const cacheDataDir = async (
  caches: readonly RtmsMonthCache[],
): Promise<string> => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "rtms-resolver-"));
  tempDirs.push(dataDir);
  const dir = path.join(dataDir, "reference", "rtms");
  await mkdir(dir, { recursive: true });
  await Promise.all(
    caches.map((cache, index) =>
      writeFile(
        path.join(dir, `${index}.json`),
        `${JSON.stringify(cache)}\n`,
        "utf8",
      ),
    ),
  );
  return dataDir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true })));
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
    const { trades, cancelledCount, totalCount, collectedCount } = normalizeRtmsResponse(XML);

    expect(cancelledCount).toBe(1);
    expect(totalCount).toBe(3);
    expect(collectedCount).toBe(3);
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

  test("성공 코드가 아니거나 응답 헤더가 없으면 실패한다", () => {
    expect(() =>
      normalizeRtmsResponse(XML.replace("<resultCode>000</resultCode>", "<resultCode>01</resultCode>")),
    ).toThrow(/resultCode/);
    expect(() =>
      normalizeRtmsResponse(XML.replace("<resultMsg>OK</resultMsg>", "")),
    ).toThrow(/응답 헤더/);
  });

  test("정상 응답에서는 거부 사유가 잡히지 않는다", () => {
    expect(rtmsFaultOf({ response: { body: {} } })).toBeUndefined();
  });

  test("외부 인증 오류는 제어문자·인증값·과도한 길이를 남기지 않는다", () => {
    const reason = rtmsFaultOf({
      OpenAPI_ServiceResponse: {
        cmmMsgHeader: {
          errMsg: `거부\nserviceKey=super-secret ${"x".repeat(300)}`,
          returnAuthMsg: "Authorization=Bearer Bearer-secret\u0000",
          returnReasonCode: "30",
        },
      },
    });

    expect(reason?.length).toBeLessThanOrEqual(RTMS_EXTERNAL_MESSAGE_MAX_LENGTH);
    expect(reason).not.toMatch(/super-secret|Bearer-secret|[\u0000-\u001f]/);
    expect(reason).toContain("인증정보 제거");
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

  test("기존 failed cache 사유도 읽을 때 인증값과 제어문자를 제거한다", () => {
    const parsed = parseRtmsMonthCache(
      {
        ...cacheOf("2026-03", []),
        status: "failed",
        reason: `HTTP 403\napi_key=cache-secret ${"x".repeat(300)}`,
      },
      "(실패 cache 정제 테스트)",
    );

    expect(parsed.reason?.length).toBeLessThanOrEqual(
      RTMS_EXTERNAL_MESSAGE_MAX_LENGTH,
    );
    expect(parsed.reason).not.toMatch(/cache-secret|[\u0000-\u001f]/);
  });

  test("v2 cache는 완료 상태별 건수 불변식을 검증한다", () => {
    const valid = {
      ...cacheOf("2026-03", [
        {
          dong: "서초동",
          buildingType: "상업업무용",
          buildingUse: "사무소",
          dealOn: "2026-03-11",
          amountWon: 4_550_000_000,
        },
      ]),
      schemaVersion: 2,
      totalCount: 1,
      collectedCount: 1,
    } as const;

    expect(parseRtmsMonthCache(valid, "(v2 cache)").schemaVersion).toBe(2);
    expect(() =>
      parseRtmsMonthCache({ ...valid, totalCount: 2 }, "(부분 v2 cache)"),
    ).toThrow(/올바르지 않습니다/);
    expect(() =>
      parseRtmsMonthCache(
        { ...valid, status: "failed", trades: [], reason: undefined },
        "(실패 v2 cache)",
      ),
    ).toThrow(/올바르지 않습니다/);
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

describe("실거래 어댑터 resolver", () => {
  const resolveSou = (dataDir: string, forceFake = false) =>
    resolveRtmsTradeAdapter({
      dataDir,
      forceFake,
      lawdCd: "30200",
      sigunguName: "대전 유성구",
    });

  test("요청 지역 cache가 없으면 해당 지역의 명시적 대조 보류 adapter를 반환한다", async () => {
    const adapter = await resolveSou(await cacheDataDir([]));
    const window = adapter.window({ months: ["2025-09"], dong: "봉명동" });

    expect(adapter).toMatchObject({
      name: "cache",
      lawdCd: "30200",
      sigunguName: "대전 유성구",
    });
    expect(adapter.sourceName).toContain("캐시 없음");
    expect(adapter.sourceName).not.toContain("픽스처");
    expect(window).toMatchObject({ trades: [], missingMonths: ["2025-09"] });
    expect(JSON.stringify({ adapter, window })).not.toMatch(/서초동|11650/);
  });

  test("다른 지역 cache만 있어도 SOU에 서초 비교군을 붙이지 않는다", async () => {
    const dataDir = await cacheDataDir([
      cacheOf("2025-09", [
        {
          dong: "서초동",
          buildingType: "상업업무용",
          buildingUse: "사무소",
          dealOn: "2025-09-01",
          amountWon: 900_000_000,
        },
      ]),
    ]);
    const adapter = await resolveSou(dataDir);
    const window = adapter.window({ months: ["2025-09"], dong: "봉명동" });

    expect(window.trades).toEqual([]);
    expect(window.missingMonths).toEqual(["2025-09"]);
    expect(JSON.stringify({ adapter, window })).not.toMatch(/서초동|11650/);
  });

  test("forceFake=true일 때만 명시적으로 서초 픽스처를 사용한다", async () => {
    const adapter = await resolveSou(await cacheDataDir([]), true);

    expect(adapter).toMatchObject({ name: "fake", lawdCd: "11650" });
    expect(adapter.sourceName).toContain("픽스처");
    expect(adapter.window({ months: ["2026-03"], dong: "서초동" }).trades.length)
      .toBeGreaterThan(0);
  });

  test("요청 지역 usable cache는 그대로 사용한다", async () => {
    const cache = {
      ...cacheOf("2025-09", [
        {
          dong: "봉명동",
          buildingType: "상업업무용",
          buildingUse: "근린생활시설",
          dealOn: "2025-09-15",
          amountWon: 910_000_000,
        },
      ]),
      lawdCd: "30200",
      sigunguName: "대전 유성구",
    };
    const adapter = await resolveSou(await cacheDataDir([cache]));
    const window = adapter.window({ months: ["2025-09"], dong: "봉명동" });

    expect(adapter).toMatchObject({ name: "cache", lawdCd: "30200" });
    expect(adapter.sourceName).not.toContain("캐시 없음");
    expect(window.missingMonths).toEqual([]);
    expect(window.trades).toHaveLength(1);
  });

  test("empty·failed와 0건 ok cache는 정상 월로 승격하지 않는다", async () => {
    const empty = {
      ...cacheOf("2025-08", []),
      lawdCd: "30200",
      sigunguName: "대전 유성구",
      status: "empty" as const,
    };
    const failed = {
      ...cacheOf("2025-09", []),
      lawdCd: "30200",
      sigunguName: "대전 유성구",
      status: "failed" as const,
      reason: "HTTP 403",
    };
    const zeroOk = {
      ...cacheOf("2025-10", []),
      lawdCd: "30200",
      sigunguName: "대전 유성구",
    };
    const adapter = await resolveSou(
      await cacheDataDir([empty, failed, zeroOk]),
    );
    const window = adapter.window({
      months: ["2025-08", "2025-09", "2025-10"],
      dong: "봉명동",
    });

    expect(adapter.sourceName).toContain("캐시 없음");
    expect(adapter.months()).toEqual([]);
    expect(window.trades).toEqual([]);
    expect(window.missingMonths).toEqual(["2025-08", "2025-09", "2025-10"]);
  });
});

describe("수집 구간 계산", () => {
  test("직전 3개월 창은 기준 월을 포함해 해를 넘어간다", () => {
    expect(monthsBefore("2026-01", 3)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  test("뒤집힌 구간은 조용히 비지 않고 실패한다", () => {
    expect(() => rtmsMonthsBetween("2026-03", "2026-01")).toThrow(/뒤집혔습니다/);
  });

  test("수집 구간은 12개월까지 허용하고 초과하면 호출 계획 전에 실패한다", () => {
    expect(rtmsMonthsBetween("2025-01", "2025-12")).toHaveLength(12);
    expect(() => rtmsMonthsBetween("2025-01", "2026-01")).toThrow(/최대 12개월/);
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
