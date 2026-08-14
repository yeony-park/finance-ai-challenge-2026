import { describe, expect, test } from "vitest";
import {
  createAuctionPriceAdapter,
  normalizeAuctionResponse,
  parseAuctionMonthCache,
  toAuctionEntry,
  type AuctionMonthCache,
} from "../adapters/auction-price";
import { createFakeAuctionPriceAdapter } from "../adapters/auction-price-fake";
import {
  monthRange,
  monthsBetween,
  auctionCacheFile,
} from "../reference/auction-collect";
import { judgeClaims } from "../judge/engine";
import type { LivestockTraceAdapter, LivestockTraceRecord } from "../adapters/livestock-trace";
import type { Claim, ClaimKind, DocumentRef } from "../types";

const XML = `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header><body><items>
<item><CTotAmt>25721</CTotAmt><CTotCnt>9193</CTotCnt><gradeCd>0</gradeCd><gradeNm>1++</gradeNm><judgeBreedCd>024001</judgeBreedCd><judgeBreedNm>한우</judgeBreedNm><judgeSexCd>025003</judgeSexCd><judgeSexNm>거세</judgeSexNm></item>
<item><CTotAmt>23606</CTotAmt><CTotCnt>19470</CTotCnt><gradeCd>029049</gradeCd><gradeNm>평균</gradeNm><judgeBreedCd>024001</judgeBreedCd><judgeBreedNm>한우</judgeBreedNm><judgeSexCd>025003</judgeSexCd><judgeSexNm>거세</judgeSexNm></item>
<item><gradeCd>4</gradeCd><gradeNm>3</gradeNm><judgeBreedCd>024001</judgeBreedCd><judgeBreedNm>한우</judgeBreedNm><judgeSexCd>025003</judgeSexCd><judgeSexNm>거세</judgeSexNm></item>
</items></body></response>`;

describe("경락가 응답 정규화", () => {
  test("전국 평균가·두수가 있는 등급 행만 남는다 (표본 없는 등급은 태그 자체가 없다)", () => {
    const rows = normalizeAuctionResponse(XML);

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.gradeName)).toEqual(["1++", "평균"]);
    expect(rows[0].pricePerKg).toBe(25721);
    expect(rows[0].sexName).toBe("거세");
  });

  test("평균 행에서 모수·평균가를, 육질등급 행에서 분포를 뽑는다", () => {
    const entry = toAuctionEntry(normalizeAuctionResponse(XML), {
      sexCd: "025003",
      sexName: "거세",
    });

    expect(entry.status).toBe("ok");
    expect(entry.averagePricePerKg).toBe(23606);
    expect(entry.sampleSize).toBe(19470);
    expect(entry.grades?.map((grade) => grade.gradeName)).toEqual(["1++"]);
  });

  test("평균 행이 없으면 0원이 아니라 표본 없음으로 남는다", () => {
    const entry = toAuctionEntry([], { sexCd: "025002", sexName: "수" });

    expect(entry.status).toBe("empty");
    expect(entry.averagePricePerKg).toBeUndefined();
    expect(entry.reason).toMatch(/표본/);
  });

  test("장애 응답(HTML 등)은 표본 없음으로 둔갑하지 않고 실패한다", () => {
    expect(() => normalizeAuctionResponse("<html>service down</html>")).toThrow(
      /인식할 수 없습니다/,
    );
  });
});

describe("수집 구간", () => {
  test("월 목록은 양끝을 포함하고 연도를 넘어간다", () => {
    expect(monthsBetween("2026-05", "2026-08")).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
    expect(monthsBetween("2025-12", "2026-02")).toEqual([
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  test("끝난 달은 말일까지, 진행 중인 달은 오늘까지 담고 partial로 표시한다", () => {
    const now = new Date("2026-08-14T00:00:00Z");

    expect(monthRange("2026-07", now)).toEqual({
      startYmd: "20260701",
      endYmd: "20260731",
      partial: false,
    });
    expect(monthRange("2026-08", now)).toEqual({
      startYmd: "20260801",
      endYmd: "20260814",
      partial: true,
    });
  });

  test("호출 수는 월 × 성별이다 — 일자 순회가 아니다", () => {
    const months = monthsBetween("2026-05", "2026-08");

    expect(months.length * 3).toBe(12);
  });

  test("캐시 파일 경로는 품종 코드·월로만 조립된다", () => {
    const file = auctionCacheFile({ breedCd: "024001", month: "2026-07" }, "data");

    expect(file.endsWith("data/reference/auction-price/024001-2026-07.json")).toBe(
      true,
    );
    expect(() =>
      auctionCacheFile({ breedCd: "../../etc", month: "2026-07" }),
    ).toThrow(/품종 코드/);
  });
});

const cache = (over: Partial<AuctionMonthCache> = {}): AuctionMonthCache => ({
  schemaVersion: 1,
  month: "2026-07",
  startYmd: "20260701",
  endYmd: "20260731",
  partial: false,
  breedCd: "024001",
  breedName: "한우",
  qgradeYn: "Y",
  defectIncludeYn: "N",
  collectedAt: "2026-08-13T16:00:50.811Z",
  sourceId: "ekape-auction-price",
  sourceName: "축산물등급판정정보(테스트)",
  endpoint: "http://example.test/auct",
  entries: [
    {
      sexCd: "025002",
      sexName: "수",
      status: "ok",
      averagePricePerKg: 13946,
      sampleSize: 148,
      grades: [{ gradeCd: "4", gradeName: "3", pricePerKg: 13624, headCount: 121 }],
    },
  ],
  ...over,
});

describe("경락가 캐시 어댑터", () => {
  test("월·품종·성별이 맞으면 참조값을 돌려준다", () => {
    const adapter = createAuctionPriceAdapter([cache()], { name: "cache" });

    const lookup = adapter.lookup({
      month: "2026-07",
      breedName: "한우",
      sexName: "수",
    });

    expect(lookup.kind).toBe("found");
    if (lookup.kind !== "found") return;
    expect(lookup.reference.averagePricePerKg).toBe(13946);
    expect(lookup.reference.sampleSize).toBe(148);
  });

  test("없는 달·실패한 칸은 숫자를 지어내지 않고 사유를 돌려준다", () => {
    const adapter = createAuctionPriceAdapter(
      [
        cache(),
        cache({
          month: "2026-06",
          entries: [
            {
              sexCd: "025002",
              sexName: "수",
              status: "failed",
              reason: "HTTP 500",
            },
          ],
        }),
      ],
      { name: "cache" },
    );

    const missingMonth = adapter.lookup({
      month: "2026-04",
      breedName: "한우",
      sexName: "수",
    });
    const failedCell = adapter.lookup({
      month: "2026-06",
      breedName: "한우",
      sexName: "수",
    });

    expect(missingMonth.kind).toBe("missing");
    expect(failedCell.kind).toBe("missing");
    if (failedCell.kind !== "missing") return;
    expect(failedCell.reason).toMatch(/수집이 실패/);
    expect(failedCell.reason).toMatch(/HTTP 500/);
  });

  test("months()는 성공한 달만 오름차순으로 돌려준다", () => {
    const adapter = createAuctionPriceAdapter(
      [
        cache({ month: "2026-07" }),
        cache({
          month: "2026-06",
          entries: [{ sexCd: "025002", sexName: "수", status: "empty" }],
        }),
      ],
      { name: "cache" },
    );

    expect(adapter.months("한우", "수")).toEqual(["2026-07"]);
  });

  test("캐시 파일 형식이 어긋나면 즉시 실패한다", () => {
    expect(() => parseAuctionMonthCache({ month: "2026-7" }, "테스트")).toThrow(
      /캐시 형식/,
    );
  });

  test("fake 어댑터는 실수집 월 집계를 결정적으로 재생한다", () => {
    const adapter = createFakeAuctionPriceAdapter();

    const first = adapter.lookup({
      month: "2026-07",
      breedName: "한우",
      sexName: "거세",
    });
    const second = adapter.lookup({
      month: "2026-07",
      breedName: "한우",
      sexName: "거세",
    });

    expect(first).toEqual(second);
    expect(first.kind).toBe("found");
    if (first.kind !== "found") return;

    expect(first.reference.averagePricePerKg).toBe(23606);
    expect(first.reference.sampleSize).toBe(19470);
  });
});

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

const traceRecord = (
  over: Partial<LivestockTraceRecord> = {},
): LivestockTraceRecord => ({
  traceNo9: "212786152",
  traceNo12: "002212786152",
  exists: true,
  breedName: "한우",
  sexName: "수",
  currentFarmNo: "485464",
  farmHistory: [
    {
      regYmd: "20260730",
      regType: "양수",
      farmNo: "485464",
      farmerName: "김검증",
      farmAddress: "강원특별자치도 검증군 가상읍",
    },
  ],
  slaughtered: false,
  vaccinationCount: 1,
  observedAt: "2026-08-10T01:40:38.382Z",
  ...over,
});

const traceStub = (result: LivestockTraceRecord): LivestockTraceAdapter => ({
  name: "fake",
  sourceId: "livestock-trace",
  sourceName: "축산물이력제(stub)",
  url: "http://example.test/trace",
  lookup: async () => result,
});

const priceClaims = [
  claim("livestock_trace_no", "212786152"),
  claim("livestock_breed", "한우"),
  claim("livestock_sex", "수"),
  claim("acquisition_date", "2026-07-14"),
  claim("acquisition_price", "4574865", { numericValue: 4574865, unit: "원" }),
];

describe("② 가격 층위 — 판정이 아니라 위치", () => {
  test("취득시기가 원장으로 확인된 개체는 그 달의 경락가 위에 놓인다", async () => {
    const outcome = await judgeClaims(priceClaims, {
      trace: traceStub(traceRecord()),
      auction: createFakeAuctionPriceAdapter(),
    });

    expect(outcome.pricePlacements).toHaveLength(1);
    const placement = outcome.pricePlacements[0];
    expect(placement.referenceMonth).toBe("2026-07");
    expect(placement.sexName).toBe("수");
    expect(placement.averagePricePerKg).toBe(13946);
    expect(placement.sampleSize).toBe(148);
    expect(placement.claimedPerHead).toBe(4574865);

    expect(placement.evidence[0].sourceId).toBe("ekape-auction-price");
    expect(placement.evidence[0].stance).toBe("context");

    expect(placement.statement).toMatch(/위치이며 적정성 판단이 아닙니다/);
    expect(placement.statement).not.toMatch(/적정하다|비싸다|저렴/);
  });

  test("얇은 모수는 숨기지 않고 표시한다", async () => {
    const outcome = await judgeClaims(priceClaims, {
      trace: traceStub(traceRecord()),
      auction: createFakeAuctionPriceAdapter(),
    });

    expect(outcome.pricePlacements[0].thinSample).toBe(true);
    expect(outcome.pricePlacements[0].statement).toMatch(/얇/);
  });

  test("취득시기가 대조 불가면(학산 24호 케이스) 가격도 대조 불가로 남는다", async () => {

    const outcome = await judgeClaims(priceClaims, {
      trace: traceStub(
        traceRecord({
          farmHistory: [
            {
              regYmd: "20260105",
              regType: "전산등록",
              farmNo: "387221",
              farmerName: "양검증",
              farmAddress: "경상북도 포항시 남구 구룡포읍",
            },
          ],
        }),
      ),
      auction: createFakeAuctionPriceAdapter(),
    });

    expect(outcome.pricePlacements).toHaveLength(0);
    const unplaced = outcome.unjudged.filter(
      (item) => item.claim.kind === "acquisition_price",
    );
    expect(unplaced).toHaveLength(1);
    expect(unplaced[0].reason).toMatch(/취득시기\(2026-07-14\)/);
    expect(unplaced[0].reason).toMatch(/대조 불가/);
  });

  test("기준 월 데이터가 없으면 사유가 붙은 대조 불가가 된다", async () => {
    const outcome = await judgeClaims(
      priceClaims.map((item) =>
        item.kind === "acquisition_date"
          ? claim("acquisition_date", "2026-01-14")
          : item,
      ),
      {
        trace: traceStub(
          traceRecord({
            farmHistory: [
              {
                regYmd: "20260120",
                regType: "양수",
                farmNo: "485464",
                farmerName: "김검증",
                farmAddress: "강원특별자치도 검증군 가상읍",
              },
            ],
          }),
        ),
        auction: createFakeAuctionPriceAdapter(),
      },
    );

    const unplaced = outcome.unjudged.filter(
      (item) => item.claim.kind === "acquisition_price",
    );
    expect(outcome.pricePlacements).toHaveLength(0);
    expect(unplaced[0].reason).toMatch(/2026-01 한우 수 경락가 집계가 수집되지 않았습니다/);
  });

  test("가격 위치는 3값 판정 집계에 절대 섞이지 않는다", async () => {
    const outcome = await judgeClaims(priceClaims, {
      trace: traceStub(traceRecord()),
      auction: createFakeAuctionPriceAdapter(),
    });

    expect(
      outcome.judgements.some((j) => j.claim.kind === "acquisition_price"),
    ).toBe(false);
  });
});
