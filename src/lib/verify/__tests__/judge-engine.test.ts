import { describe, expect, test } from "vitest";
import { judgeClaims, locationTokens } from "../judge/engine";
import type {
  LivestockTraceAdapter,
  LivestockTraceRecord,
} from "../adapters/livestock-trace";
import type { Claim, ClaimKind, DocumentRef } from "../types";

const DOC: DocumentRef = {
  offerId: "livestock-9",
  rcpNo: "20260806000159",
  submittedOn: "2026-08-06",
};

const claim = (
  kind: ClaimKind,
  value: string,
  over: Partial<Claim> = {},
): Claim => ({
  id: `${kind}:검증 1호`,
  kind,
  subject: "검증 1호",
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
      farmerName: "김검증",
      farmAddress: "강원특별자치도 검증군 가상읍 가상로90번길",
    },
  ],
  currentFarm: {
    regYmd: "20260730",
    regType: "양수",
    farmNo: "485464",
    farmerName: "김검증",
    farmAddress: "강원특별자치도 검증군 가상읍 가상로90번길",
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
    const claims = [
      claim("livestock_trace_no", "212786152"),
      claim("livestock_breed", "한우"),
      claim("livestock_sex", "수"),
      claim("custody_location", "강원도 검증군가상읍"),
      claim("acquisition_date", "2026-07-14"),
    ];

    const outcome = await judgeClaims(claims, {
      trace: stubAdapter(record()),
    });

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

  test("성별 수→거세는 예상된 상태 전이라 match로 판정한다", async () => {
    const outcome = await judgeClaims(
      [claim("livestock_trace_no", "212786152"), claim("livestock_sex", "수")],
      { trace: stubAdapter(record({ sexName: "거세" })) },
    );

    const sex = outcome.judgements.find((j) => j.claim.kind === "livestock_sex");
    expect(sex?.verdict).toBe("match");
    expect(sex?.evidence[0].stance).toBe("supports");
    expect(sex?.evidence[0].note).toContain("거세");
    expect(sex?.rationale).toContain("거세");
  });

  test("성별 암→거세 같은 불가능 전이는 mismatch를 유지한다", async () => {
    const outcome = await judgeClaims(
      [claim("livestock_trace_no", "212786152"), claim("livestock_sex", "암")],
      { trace: stubAdapter(record({ sexName: "거세" })) },
    );

    const sex = outcome.judgements.find((j) => j.claim.kind === "livestock_sex");
    expect(sex?.verdict).toBe("mismatch");
    expect(sex?.evidence[0].stance).toBe("contradicts");
  });

  test("성별 거세→수 역방향 전이는 mismatch를 유지한다", async () => {
    const outcome = await judgeClaims(
      [claim("livestock_trace_no", "212786152"), claim("livestock_sex", "거세")],
      { trace: stubAdapter(record({ sexName: "수" })) },
    );

    const sex = outcome.judgements.find((j) => j.claim.kind === "livestock_sex");
    expect(sex?.verdict).toBe("mismatch");
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
      [claim("livestock_trace_no", "212786152"), claim("custody_location", "강원도 검증군가상읍")],
      {
        trace: stubAdapter(
          record({
            currentFarm: {
              regYmd: "20260105",
              regType: "전산등록",
              farmNo: "387221",
              farmerName: "박합성",
              farmAddress: "경상북도 검증시 남구 가상읍 가상로4391번길",
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
                farmerName: "박합성",
                farmAddress: "경상북도 검증시 남구 가상읍",
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

  test("경락가 참조가 없으면 취득원가는 근거 0건 판정 대신 사유 있는 대조 불가로 남는다", async () => {
    const outcome = await judgeClaims(
      [
        claim("livestock_trace_no", "212786152"),
        claim("acquisition_price", "4574865"),
      ],
      { trace: stubAdapter(record()) },
    );

    expect(outcome.judgements).toHaveLength(1);
    expect(outcome.unjudged).toHaveLength(1);
    expect(outcome.unjudged[0].claim.kind).toBe("acquisition_price");
    expect(outcome.unjudged[0].reason).toMatch(
      /경락가 참조 데이터가 연결되지 않아/,
    );
    expect(outcome.pricePlacements).toHaveLength(0);
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
    expect(locationTokens("강원도 검증군가상읍")).toEqual(["검증군", "가상읍"]);
  });
});

describe("원장 조회 동시성", () => {
  const traceClaims = (count: number): readonly Claim[] =>
    Array.from({ length: count }, (_, index) =>
      claim("livestock_trace_no", `21278615${index % 10}`, {
        id: `livestock_trace_no:검증 ${index + 1}호`,
        subject: `검증 ${index + 1}호`,
      }),
    );

  const countingAdapter = (
    state: { inFlight: number; peak: number; order: string[] },
  ): LivestockTraceAdapter => ({
    name: "fake",
    sourceId: "livestock-trace",
    sourceName: "축산물이력제(stub)",
    url: "http://example.test/trace",
    lookup: async (traceNo: string) => {
      state.inFlight += 1;
      state.peak = Math.max(state.peak, state.inFlight);
      state.order.push(traceNo);
      await new Promise((resolve) => setTimeout(resolve, 1));
      state.inFlight -= 1;
      return record();
    },
  });

  test("동시 호출 수가 상한(4)을 넘지 않는다", async () => {
    const state = { inFlight: 0, peak: 0, order: [] as string[] };

    await judgeClaims(traceClaims(12), { trace: countingAdapter(state) });

    expect(state.order).toHaveLength(12);
    expect(state.peak).toBeGreaterThan(1);
    expect(state.peak).toBeLessThanOrEqual(4);
  });

  test("동시 조회를 해도 판정 순서는 입력 순서를 따른다 (결정성)", async () => {
    const state = { inFlight: 0, peak: 0, order: [] as string[] };
    const outcome = await judgeClaims(traceClaims(8), {
      trace: countingAdapter(state),
    });

    expect(outcome.judgements.map((j) => j.claim.subject)).toEqual(
      Array.from({ length: 8 }, (_, index) => `검증 ${index + 1}호`),
    );
  });
});
