import { describe, expect, test } from "vitest";

import { collectRtmsMonth } from "../rtms-collect";

const header = (resultCode = "000") =>
  `<header><resultCode>${resultCode}</resultCode><resultMsg>OK</resultMsg></header>`;

const row =
  "<item><dealAmount>455,000</dealAmount><dealYear>2026</dealYear><dealMonth>3</dealMonth><dealDay>11</dealDay><umdNm>서초동</umdNm><buildingType>상업업무용</buildingType><buildingUse>사무소</buildingUse></item>";

const xmlOf = (totalCount: number, items = row, resultCode = "000") =>
  `<?xml version="1.0"?><response>${header(resultCode)}<body><items>${items}</items><totalCount>${totalCount}</totalCount></body></response>`;

const options = (serviceKey: string, fetchImpl: typeof fetch) => ({
  serviceKey,
  lawdCd: "11650",
  sigunguName: "서울 서초구",
  fetchImpl,
  now: () => new Date("2026-08-23T00:00:00.000Z"),
});

describe("RTMS 월 수집 완전성", () => {
  test("1000건 미만의 완전한 정상 응답을 v2 ok cache로 기록한다", async () => {
    const result = await collectRtmsMonth(
      "2026-03",
      options("secret-key", async () => new Response(xmlOf(1))),
    );

    expect(result.cache).toMatchObject({
      schemaVersion: 2,
      status: "ok",
      totalCount: 1,
      collectedCount: 1,
    });
  });

  test("totalCount=0은 empty cache로 기록한다", async () => {
    const result = await collectRtmsMonth(
      "2026-03",
      options("secret-key", async () => new Response(xmlOf(0, ""))),
    );

    expect(result.cache).toMatchObject({
      status: "empty",
      totalCount: 0,
      collectedCount: 0,
      trades: [],
    });
  });

  test("첫 페이지가 전부가 아니면 부분 거래를 저장하지 않는다", async () => {
    const result = await collectRtmsMonth(
      "2026-03",
      options("secret-key", async () => new Response(xmlOf(2))),
    );

    expect(result.cache).toMatchObject({
      status: "failed",
      totalCount: 2,
      collectedCount: 1,
      trades: [],
    });
    expect(result.cache.reason).toContain("첫 페이지 한도 초과");
  });

  test("실패 header와 필드 파싱 실패는 failed cache로 기록한다", async () => {
    const failedHeader = await collectRtmsMonth(
      "2026-03",
      options("secret-key", async () => new Response(xmlOf(1, row, "01"))),
    );
    const failedParse = await collectRtmsMonth(
      "2026-03",
      options(
        "secret-key",
        async () =>
          new Response(
            xmlOf(
              1,
              "<item><dealYear>2026</dealYear><dealMonth>3</dealMonth><dealDay>11</dealDay></item>",
            ),
          ),
      ),
    );

    expect(failedHeader.cache).toMatchObject({ status: "failed", trades: [] });
    expect(failedParse.cache).toMatchObject({
      status: "failed",
      totalCount: 1,
      collectedCount: 1,
      trades: [],
    });
  });

  test("외부 인증 오류는 failed cache에 인증값·제어문자 없이 제한 길이로 남는다", async () => {
    const fault = `<?xml version="1.0"?><OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>거부&#10;token=collector-secret ${"x".repeat(300)}</errMsg><returnAuthMsg>Authorization=auth-secret</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`;
    const result = await collectRtmsMonth(
      "2026-03",
      options("secret-key", async () => new Response(fault)),
    );

    expect(result.cache.status).toBe("failed");
    expect(result.cache.reason?.length).toBeLessThanOrEqual(200);
    expect(result.cache.reason).not.toMatch(/collector-secret|auth-secret|[\u0000-\u001f]/);
  });

  test("인코딩·디코딩 서비스 키는 같은 값으로 전달되고 cache에 남지 않는다", async () => {
    const captured: string[] = [];
    const fetchImpl: typeof fetch = async (url) => {
      captured.push(new URL(String(url)).searchParams.get("serviceKey") ?? "");
      return new Response(xmlOf(0, ""));
    };
    const [decoded, encoded] = await Promise.all([
      collectRtmsMonth("2026-03", options("a+b/c=", fetchImpl)),
      collectRtmsMonth("2026-03", options("a%2Bb%2Fc%3D", fetchImpl)),
    ]);

    expect(captured).toEqual(["a+b/c=", "a+b/c="]);
    expect(JSON.stringify([decoded.cache, encoded.cache])).not.toContain("a+b/c=");
    expect(JSON.stringify([decoded.cache, encoded.cache])).not.toContain("a%2Bb%2Fc%3D");
  });
});
