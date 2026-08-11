import { describe, expect, test } from "vitest";
import { judgeClaims, locationTokens } from "../judge/engine";
import type {
  LivestockTraceAdapter,
  LivestockTraceRecord,
} from "../adapters/livestock-trace";
import type { Claim, ClaimKind, DocumentRef } from "../types";

const DOC: DocumentRef = {
  offerId: "bankcow-9",
  rcpNo: "20260806000159",
  submittedOn: "2026-08-06",
};

const claim = (
  kind: ClaimKind,
  value: string,
  over: Partial<Claim> = {},
): Claim => ({
  id: `${kind}:학산 1호`,
  kind,
  subject: "학산 1호",
  field: kind,
  value,
  document: DOC,
  location: { section: "8", table: "개체 명세표", row: 1 },
  verifiability: "verifiable",
  ...over,
});

const record = (over: Partial<LivestockTraceRecord> = {}): LivestockTraceRecord => ({
  traceNo9: "212786152",
  traceNo12: "002212786152",
  exists: true,
  cattleNo: "410002212786152",
  birthYmd: "20251211",
  breedName: "한우",
  sexName: "수",
  currentFarmNo: "485464",
  farmHistory: [
    {
      regYmd: "20260730",
      regType: "양수",
      farmNo: "485464",
      farmerName: "[비식별화]",
      farmAddress: "[비식별화]",
    },
  ],
  currentFarm: {
    regYmd: "20260730",
    regType: "양수",
    farmNo: "485464",
    farmerName: "[비식별화]",
    farmAddress: "[비식별화]",
  },
  slaughtered: false,
  vaccinationCount: 1,
  observedAt: "2026-08-10T01:40:38.382Z",
  ...over,
});

const stubAdapter = (
  result: LivestockTraceRecord,
): LivestockTraceAdapter => ({
  name: "fake",
  sourceId: "livestock-trace",
  sourceName: "축산물이력제(stub)",
  url: "http://example.test/trace",
  lookup: async () => result,
});

describe("판정 엔진", () => {
  test("모든 판정에 근거가 최소 1건 붙는다", async () => {
    // Arrange
    const claims = [
      claim("livestock_trace_no", "212786152"),
      claim("livestock_breed", "한우"),
      claim("livestock_sex", "수"),
      claim("custody_location", "강원도 횡성군횡성읍"),
      claim("acquisition_date", "2026-07-14"),
    ];

    // Act
    const outcome = await judgeClaims(claims, {
      trace: stubAdapter(record()),
    });

    // Assert
    expect(outcome.judgements).toHaveLength(5);
    expect(
      outcome.judgements.every((j) => j.evidence.length > 0),
    ).toBe(true);
    expect(outcome.judgements.map((j) => j.verdict)).toEqual([
      "match",
      "match",
      "match",
      "match",
      "match",
    ]);
  });

  test("품종이 다르면 mismatch로 판정한다", async () => {
    const outcome = await judgeClaims([claim("livestock_trace_no", "212786152"), claim("livestock_breed", "한우")], {
      trace: stubAdapter(record({ breedName: "육우" })),
    });

    const breed = outcome.judgements.find((j) => j.claim.kind === "livestock_breed");
    expect(breed?.verdict).toBe("mismatch");
    expect(breed?.evidence[0].stance).toBe("contradicts");
  });

  test("원장에 개체가 없으면 mismatch가 아니라 unverifiable이다", async () => {
    const outcome = await judgeClaims([claim("livestock_trace_no", "999999999")], {
      trace: stubAdapter(
        record({ exists: false, farmHistory: [], currentFarm: undefined }),
      ),
    });

    expect(outcome.judgements[0].verdict).toBe("unverifiable");
    expect(outcome.judgements[0].evidence).toHaveLength(1);
  });

  test("보관장소 행정구역이 다르면 mismatch", async () => {
    const outcome = await judgeClaims(
      [claim("livestock_trace_no", "212786152"), claim("custody_location", "강원도 횡성군횡성읍")],
      {
        trace: stubAdapter(
          record({
            currentFarm: {
              regYmd: "20260105",
              regType: "전산등록",
              farmNo: "387221",
              farmerName: "[비식별화]",
              farmAddress: "[비식별화]",
            },
          }),
        ),
      },
    );

    const custody = outcome.judgements.find(
      (j) => j.claim.kind === "custody_location",
    );
    expect(custody?.verdict).toBe("mismatch");
    expect(custody?.rationale).not.toMatch(/허위|명백/);
  });

  test("취득시기는 30일 윈도로 판정하고, 등록 기록이 없으면 확인 불가", async () => {
    const inWindow = await judgeClaims(
      [claim("livestock_trace_no", "212786152"), claim("acquisition_date", "2026-07-14")],
      { trace: stubAdapter(record()) },
    );
    expect(
      inWindow.judgements.find((j) => j.claim.kind === "acquisition_date")
        ?.verdict,
    ).toBe("match");

    const noTransfer = await judgeClaims(
      [claim("livestock_trace_no", "212786152"), claim("acquisition_date", "2026-07-28")],
      {
        trace: stubAdapter(
          record({
            currentFarmNo: "387221",
            farmHistory: [
              {
                regYmd: "20260105",
                regType: "전산등록",
                farmNo: "387221",
                farmerName: "[비식별화]",
                farmAddress: "경상북도 포항시 남구 구룡포읍",
              },
            ],
          }),
        ),
      },
    );
    expect(
      noTransfer.judgements.find((j) => j.claim.kind === "acquisition_date")
        ?.verdict,
    ).toBe("unverifiable");
  });

  test("어댑터가 없는 항목은 근거 0건 판정 대신 미판정으로 분리된다", async () => {
    const outcome = await judgeClaims(
      [
        claim("livestock_trace_no", "212786152"),
        claim("acquisition_price", "4574865"),
      ],
      { trace: stubAdapter(record()) },
    );

    expect(outcome.judgements).toHaveLength(1);
    expect(outcome.unjudged).toHaveLength(1);
    expect(outcome.unjudged[0].reason).toMatch(/어댑터/);
  });

  test("스키마 게이트에서 강등된 claim은 판정하지 않는다", async () => {
    const outcome = await judgeClaims(
      [
        claim("livestock_trace_no", "212786152"),
        claim("livestock_breed", "", {
          verifiability: "unparsed",
          demotionReason: "고유명칭이 비어 있습니다",
        }),
      ],
      { trace: stubAdapter(record()) },
    );

    expect(outcome.judgements).toHaveLength(1);
    expect(outcome.unjudged[0].reason).toMatch(/스키마/);
  });

  test("이력번호를 읽지 못한 개체는 전 항목이 미판정으로 남는다", async () => {
    const outcome = await judgeClaims(
      [
        claim("livestock_trace_no", "12345", {
          verifiability: "unparsed",
          demotionReason: "이력번호는 9자리 숫자여야 합니다",
        }),
        claim("livestock_breed", "한우"),
      ],
      { trace: stubAdapter(record()) },
    );

    expect(outcome.judgements).toHaveLength(0);
    expect(outcome.unjudged).toHaveLength(2);
  });
});

describe("행정구역 토큰 추출", () => {
  test("시·군·구와 읍·면·동만 뽑는다", () => {
    expect(locationTokens("강원도 횡성군횡성읍")).toEqual(["횡성군", "횡성읍"]);
  });
});
