import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { OFFERS, type OfferEntry } from "@/components/site/offers";

import { createFakeBuildingRegisterAdapter } from "../adapters/building-register-fake";
import {
  createFakeRtmsTradeAdapter,
  resolveRtmsTradeAdapter,
} from "../adapters/rtms-trade-fake";
import {
  buildRealEstateClaims,
  loadRealEstateOffer,
  parseRealEstateOffer,
  type RealEstateOffer,
} from "../claims/real-estate";
import { judgeRealEstate } from "../judge/real-estate";
import { runRealEstateVerification } from "../pipeline";
import { maskAddressToDong } from "../report/mask";
import { toPublicReport } from "../report/public-report";
import { parseReportSnapshot, type ReportSnapshot } from "../report/snapshot";
import { buildOfferCard } from "../report/view-model/offer-card";
import { toDemoView } from "../report/view-model";

const OFFER_ID = "real-estate-a";
const PUBLIC_DIR = `data/public/${OFFER_ID}`;
const SOU_PUBLIC_DIR = "data/public/real-estate-sou-daejeon-startup";
const INTERNAL_REPORT_OFFER: OfferEntry = {
  id: OFFER_ID,
  title: "부동산 A",
  assetLabel: "부동산",
  assetKind: "real-estate",
  assetLifecycle: "sold",
  isExitVerified: true,
  realEstateListingKind: "development-sample",
  subscription: {
    opensAt: "2021-07-07T00:00:00+09:00",
    closesAt: "2021-07-15T23:59:00+09:00",
    precision: "day",
  },
};

const loadOffer = (): Promise<RealEstateOffer> => loadRealEstateOffer(OFFER_ID);

const unsoldOffer = (): RealEstateOffer =>
  parseRealEstateOffer(
    {
      schemaVersion: 2,
      offerId: "real-estate-upcoming",
      subject: "테스트 오피스 3층",
      publicAlias: "부동산 테스트",
      assetKind: "real-estate",
      subscriptionStatus: "open",
      assetLifecycle: "acquisition-pending",
      tradabilityStatus: "available",
      asset: {
        address: "서울특별시 서초구 서초동 100-1",
        lawdCd: "11650",
        sigunguName: "서울 서초구",
        dong: "서초동",
        buildingUse: "상업업무용(사무소)",
        detail: "3층 1개 호실",
      },
      offer: {
        amountWon: 3_000_000_000,
        opensOn: "2021-07-07",
        closesOn: "2021-07-15",
        listedOn: "2021-07-26",
        unitCount: 600_000,
        unitPriceWon: 5_000,
        section: "공모 공고",
        table: "공모 개요",
      },
      sources: [
        {
          sourceKind: "official-document",
          label: "테스트 공모 공고",
          url: "https://example.com/offers/real-estate-upcoming",
          asOf: "2021-07-06",
          collectedAt: "2026-08-23T10:00:00+09:00",
          method: "manual",
          status: "테스트 입력",
          limitations: ["실제 상품 자료가 아닌 스키마 테스트입니다."],
        },
      ],
      limits: ["실제 상품 자료가 아닌 스키마 테스트입니다."],
    },
    "(v2 미매각 테스트)",
  );

const runFake = async (offer?: RealEstateOffer) =>
  runRealEstateVerification({
    offer: offer ?? (await loadOffer()),
    trades: createFakeRtmsTradeAdapter(),
    generatedAt: "2026-08-14T00:00:00.000Z",
  });

const publicSnapshotOf = async (): Promise<ReportSnapshot> =>
  toPublicReport(parseReportSnapshot(JSON.parse(JSON.stringify(await runFake()))));

describe("공모 기초자료 — 공개 자료를 옮겨 적은 파일", () => {
  test("커밋된 기초자료가 스키마를 통과하고 출처가 붙어 있다", async () => {
    const offer = await loadOffer();

    expect(offer.assetKind).toBe("real-estate");
    expect(offer.schemaVersion).toBe(1);
    expect(offer.subscriptionStatus).toBe("closed");
    expect(offer.assetLifecycle).toBe("sold");
    expect(offer.tradabilityStatus).toBe("ended");
    expect(offer.sources[0]?.sourceKind).toBe("external-observation");
    expect(offer.sources[0]?.method).toBe("manual");
    expect(offer.sources.length).toBeGreaterThan(0);
    expect(offer.limits.length).toBeGreaterThan(0);
  });

  test("v2는 청약·자산 생애주기·거래 가능 상태를 분리하고 매각 없이 통과한다", () => {
    const offer = unsoldOffer();

    expect(offer.subscriptionStatus).toBe("open");
    expect(offer.assetLifecycle).toBe("acquisition-pending");
    expect(offer.tradabilityStatus).toBe("available");
    expect(offer.sale).toBeUndefined();
    expect(offer.sources[0]).toMatchObject({
      sourceKind: "official-document",
      method: "manual",
      asOf: "2021-07-06",
    });
  });

  test("v2 상태 근거는 기존 provenance URL만 참조한다", () => {
    const offer = unsoldOffer();
    const sourceUrl = offer.sources[0]?.url;
    if (!sourceUrl) throw new Error("테스트 provenance URL이 없습니다");

    const referenced = parseRealEstateOffer(
      {
        ...offer,
        statusSources: {
          assetLifecycle: sourceUrl,
          tradabilityStatus: sourceUrl,
        },
      },
      "(상태 근거 참조 테스트)",
    );
    if (referenced.schemaVersion !== 2) throw new Error("v2 파싱에 실패했습니다");
    expect(referenced.statusSources).toEqual({
      assetLifecycle: sourceUrl,
      tradabilityStatus: sourceUrl,
    });
    expect(() =>
      parseRealEstateOffer(
        {
          ...offer,
          statusSources: {
            assetLifecycle: "https://example.com/not-in-sources",
            tradabilityStatus: sourceUrl,
          },
        },
        "(상태 근거 불일치 테스트)",
      ),
    ).toThrow(/provenance를 참조/);
  });

  test("source URL은 http와 https만 허용한다", () => {
    const offer = unsoldOffer();

    expect(() =>
      parseRealEstateOffer(
        {
          ...offer,
          sources: [{ ...offer.sources[0], url: "ftp://example.com/source" }],
        },
        "(source URL 테스트)",
      ),
    ).toThrow(/sources\.0\.url/);
  });

  test("source URL은 userinfo와 인증 query key를 대소문자 없이 거부한다", () => {
    const offer = unsoldOffer();
    for (const url of [
      "https://user:password@example.com/source",
      "https://example.com/source?SERVICEKEY=secret",
      "https://example.com/source?api_key=secret",
      "https://example.com/source?Authorization=secret",
      "https://example.com/source?X-Amz-Signature=secret",
    ]) {
      expect(() =>
        parseRealEstateOffer(
          { ...offer, sources: [{ ...offer.sources[0], url }] },
          "(source 인증정보 테스트)",
        ),
      ).toThrow(/sources\.0\.url/);
    }

    expect(
      parseRealEstateOffer(
        {
          ...offer,
          sources: [
            { ...offer.sources[0], url: "https://example.com/source?page=1" },
          ],
        },
        "(source 일반 query 테스트)",
      ).sources[0]?.url,
    ).toBe("https://example.com/source?page=1");
  });

  test("v2는 생애주기와 매각 정보가 모순되면 거부한다", () => {
    const unsold = unsoldOffer();
    const sale = {
      amountWon: 3_300_000_000,
      dealOn: "2026-08-20",
      section: "매각 공시",
      table: "처분 개요",
    } as const;

    expect(() =>
      parseRealEstateOffer(
        { ...unsold, assetLifecycle: "sold" },
        "(매각 누락 테스트)",
      ),
    ).toThrow(/매각 정보가 필요합니다/);
    expect(() =>
      parseRealEstateOffer(
        { ...unsold, assetLifecycle: "settled" },
        "(정산 상품 매각 누락 테스트)",
      ),
    ).toThrow(/매각 정보가 필요합니다/);
    expect(() =>
      parseRealEstateOffer(
        {
          ...unsold,
          assetLifecycle: "operating",
          sale,
        },
        "(생애주기 모순 테스트)",
      ),
    ).toThrow(/매각 정보를 기록할 수 없습니다/);
    expect(
      parseRealEstateOffer(
        { ...unsold, assetLifecycle: "sale-in-progress", sale },
        "(매각 진행 테스트)",
      ).sale,
    ).toEqual(sale);
  });

  test("소재지가 지번까지 없으면 기초자료가 통과하지 않는다", () => {
    expect(() =>
      parseRealEstateOffer({ schemaVersion: 2 }, "(테스트)"),
    ).toThrow(/올바르지 않습니다/);
  });

  test("v1 출처 수집일은 ISO date가 아니면 정규화하지 않는다", () => {
    const raw = JSON.parse(
      readFileSync(`data/offers/${OFFER_ID}.json`, "utf8"),
    ) as { sources: Array<Record<string, unknown>> };

    expect(() =>
      parseRealEstateOffer(
        {
          ...raw,
          sources: [
            { ...raw.sources[0], retrievedOn: "2026년 8월 8일" },
            ...raw.sources.slice(1),
          ],
        },
        "(v1 출처 날짜 테스트)",
      ),
    ).toThrow(/retrievedOn/);
  });
});

describe("부동산 claim 추출 — 문서 좌표와 게이트", () => {
  test("소재지·공모금액·매각금액·매각일 4종이 문서 좌표와 함께 나온다", async () => {
    const { claims } = buildRealEstateClaims(await loadOffer());

    expect(claims.map((claim) => claim.kind)).toEqual([
      "real_estate_address",
      "offer_amount",
      "sale_amount",
      "sale_date",
    ]);
    for (const claim of claims) {
      expect(claim.location.section.length).toBeGreaterThan(0);
      expect(claim.location.table.length).toBeGreaterThan(0);
      expect(claim.location.row).toBeGreaterThan(0);
    }
  });

  test("exact parcel 요청 누락은 추출 단계에서 사유와 함께 기록된다", async () => {
    const { claims } = buildRealEstateClaims(unsoldOffer());
    const address = claims.find((claim) => claim.kind === "real_estate_address");

    expect(address?.verifiability).toBe("structurally_impossible");
    expect(address?.demotionReason).toMatch(/exact parcel 조회 조건이 없어/);
  });

  test("소재지는 검증 가능으로 추출된다 (표제부 대조 축 개통)", async () => {
    const { claims } = buildRealEstateClaims(await loadOffer());
    const address = claims.find((claim) => claim.kind === "real_estate_address");

    expect(address?.verifiability).toBe("verifiable");
    expect(address?.demotionReason).toBeUndefined();
  });

  test("금액은 숫자로 읽히고 원 단위가 붙는다", async () => {
    const { claims } = buildRealEstateClaims(await loadOffer());
    const sale = claims.find((claim) => claim.kind === "sale_amount");

    expect(sale?.numericValue).toBe(4_550_000_000);
    expect(sale?.unit).toBe("원");
  });

  test("스키마를 통과하지 못한 소재지는 판정 대상이 아니라 대조 불가로 강등된다", async () => {
    const offer = await loadOffer();
    const broken: RealEstateOffer = {
      ...offer,
      asset: { ...offer.asset, address: "서울특별시 서초구" },
    };

    const address = buildRealEstateClaims(broken).claims.find(
      (claim) => claim.kind === "real_estate_address",
    );

    expect(address?.verifiability).toBe("unparsed");
  });

  test("미매각 v2에는 매각 claim을 만들지 않는다", () => {
    const kinds = buildRealEstateClaims(unsoldOffer()).claims.map(
      (claim) => claim.kind,
    );

    expect(kinds).toEqual(["real_estate_address", "offer_amount"]);
    expect(kinds).not.toContain("sale_amount");
    expect(kinds).not.toContain("sale_date");
  });
});

describe("실거래 원장 대조 — 일치 / 원장 불일치 / 대조 불가", () => {
  test("같은 달·같은 금액이어도 지번 없는 RTMS만으로 동일 물건 일치를 확정하지 않는다", async () => {
    const outcome = judgeRealEstate({
      offer: await loadOffer(),
      claims: buildRealEstateClaims(await loadOffer()).claims,
      trades: createFakeRtmsTradeAdapter(),
    });

    expect(outcome.judgements).toHaveLength(0);
    expect(
      outcome.unjudged.filter((item) =>
        ["sale_amount", "sale_date"].includes(item.claim.kind),
      ),
    ).toHaveLength(2);
    expect(outcome.notes.join(" ")).toContain("동일 물건 연결");
    expect(JSON.stringify(outcome)).toContain("동일 물건 식별 근거");
    expect(JSON.stringify(outcome)).not.toContain("exact 동일물건");
  });

  test("금액이 달라도 지번 없는 RTMS만으로 원장 불일치를 확정하지 않는다", async () => {
    const offer = await loadOffer();
    if (!offer.sale) throw new Error("v1 매각 정보가 없습니다");
    const changed: RealEstateOffer = {
      ...offer,
      sale: { ...offer.sale, amountWon: 9_990_000_000 },
    };

    const outcome = judgeRealEstate({
      offer: changed,
      claims: buildRealEstateClaims(changed).claims,
      trades: createFakeRtmsTradeAdapter(),
    });

    expect(outcome.judgements).toEqual([]);
    expect(
      outcome.unjudged
        .filter((item) => ["sale_amount", "sale_date"].includes(item.claim.kind))
        .every((item) => item.reason.includes("지번")),
    ).toBe(true);
  });

  test("수집되지 않은 달은 판정하지 않고 대조 불가로 남는다", async () => {
    const offer = await loadOffer();
    if (!offer.sale) throw new Error("v1 매각 정보가 없습니다");
    const future: RealEstateOffer = {
      ...offer,
      sale: { ...offer.sale, dealOn: "2030-01-15" },
    };

    const outcome = judgeRealEstate({
      offer: future,
      claims: buildRealEstateClaims(future).claims,
      trades: createFakeRtmsTradeAdapter(),
    });

    expect(outcome.judgements).toHaveLength(0);
    expect(
      outcome.unjudged.filter((item) => item.reason.includes("대조 불가")).length,
    ).toBeGreaterThanOrEqual(3);
  });

  test("미매각 v2도 실거래 judge 실행을 완료하고 매각 판정을 만들지 않는다", () => {
    const offer = unsoldOffer();
    const outcome = judgeRealEstate({
      offer,
      claims: buildRealEstateClaims(offer).claims,
      trades: createFakeRtmsTradeAdapter(),
    });

    expect(outcome.judgements).toEqual([]);
    expect(
      outcome.unjudged.some((item) =>
        ["sale_amount", "sale_date"].includes(item.claim.kind),
      ),
    ).toBe(false);
    expect(outcome.placements.map((item) => item.origin)).toEqual(["issuer"]);
  });

  test("SOU 운영사 매각 발표는 30200 RTMS 법정동 비교군으로 match·mismatch 판정하지 않는다", async () => {
    const offer = await loadRealEstateOffer(
      "real-estate-sou-daejeon-startup",
    );
    const trades = await resolveRtmsTradeAdapter({
      lawdCd: offer.asset.lawdCd,
      sigunguName: offer.asset.sigunguName,
    });
    const outcome = judgeRealEstate({
      offer,
      claims: buildRealEstateClaims(offer).claims,
      trades,
    });

    expect(
      outcome.judgements.filter((item) =>
        ["sale_amount", "sale_date"].includes(item.claim.kind),
      ),
    ).toEqual([]);
    expect(
      outcome.unjudged.filter((item) =>
        ["sale_amount", "sale_date"].includes(item.claim.kind),
      ),
    ).toHaveLength(2);
    expect(outcome.placements).toEqual([]);
    expect(outcome.notes.join(" ")).toContain("2025-09~2025-11");
  });
});

describe("건축물대장 표제부 대조 — 소재지 실재", () => {
  test("수집본이 없으면 소재지는 판정하지 않고 대조 불가로 남는다", async () => {
    const outcome = judgeRealEstate({
      offer: await loadOffer(),
      claims: buildRealEstateClaims(await loadOffer()).claims,
      trades: createFakeRtmsTradeAdapter(),
    });

    const address = outcome.unjudged.find(
      (item) => item.claim.kind === "real_estate_address",
    );
    expect(address?.reason).toMatch(/표제부 수집본이 없어/);
    expect(address?.reason).toContain("대조 불가");
  });

  test("표제부에 같은 지번이 있으면 소재지가 일치로 남는다", async () => {
    const offer = await loadOffer();
    const fixtureParcel: RealEstateOffer = {
      ...offer,
      asset: { ...offer.asset, address: "서울특별시 서초구 서초동 999-1" },
    };

    const outcome = judgeRealEstate({
      offer: fixtureParcel,
      claims: buildRealEstateClaims(fixtureParcel).claims,
      trades: createFakeRtmsTradeAdapter(),
      register: createFakeBuildingRegisterAdapter(),
    });

    const address = outcome.judgements.find(
      (item) => item.claim.kind === "real_estate_address",
    );
    expect(address?.verdict).toBe("match");
    expect(address?.evidence[0].sourceId).toBe("molit-bldrgst-title");
    expect(address?.evidence[0].observed).toContain("표제부 등재 확인");
    expect(address?.evidence[0].observed).not.toContain("999-1");
  });

  test("수집본에서 지번을 찾지 못하면 판정하지 않고 사유를 남긴다", async () => {
    const outcome = judgeRealEstate({
      offer: await loadOffer(),
      claims: buildRealEstateClaims(await loadOffer()).claims,
      trades: createFakeRtmsTradeAdapter(),
      register: createFakeBuildingRegisterAdapter(),
    });

    const address = outcome.unjudged.find(
      (item) => item.claim.kind === "real_estate_address",
    );
    expect(address?.reason).toMatch(/확인하지 못했습니다/);
    expect(outcome.judgements.map((item) => item.claim.kind)).not.toContain(
      "real_estate_address",
    );
  });

  test("라이브 실거래에 픽스처 표제부를 섞지 않는다", async () => {
    const offer = await loadOffer();
    const liveTrades = {
      ...createFakeRtmsTradeAdapter(),
      name: "cache",
    } as ReturnType<typeof createFakeRtmsTradeAdapter>;

    const report = runRealEstateVerification({
      offer,
      trades: liveTrades,
      register: createFakeBuildingRegisterAdapter(),
      generatedAt: "2026-08-22T00:00:00.000Z",
    });

    expect(report.mode).toBe("live");
    expect(report.sources).toHaveLength(1);
    expect(
      report.unjudged.some((item) =>
        item.reason.includes("표제부 수집본이 없어"),
      ),
    ).toBe(true);
  });

  test("픽스처 표제부로 판정한 fake 실행은 그 사실을 리포트에 적는다", async () => {
    const offer = await loadOffer();
    const report = runRealEstateVerification({
      offer,
      trades: createFakeRtmsTradeAdapter(),
      register: createFakeBuildingRegisterAdapter(),
      generatedAt: "2026-08-22T00:00:00.000Z",
    });

    expect(report.mode).toBe("fake");
    expect(report.sources).toHaveLength(2);
    expect(
      report.notes.some((note) => note.includes("건축물대장 표제부 대조는 픽스처")),
    ).toBe(true);
  });
});

describe("가격 위치 제시 — 비교군 n은 항상, 백분위는 조건부", () => {
  test("비교군이 충분하면 백분위와 순위가 함께 나온다", async () => {
    const outcome = judgeRealEstate({
      offer: await loadOffer(),
      claims: buildRealEstateClaims(await loadOffer()).claims,
      trades: createFakeRtmsTradeAdapter(),
    });
    const actual = outcome.placements.find((item) => item.origin === "market");

    expect(actual?.comparableCount).toBe(13);
    expect(actual?.rankFromTop).toBe(3);
    expect(actual?.topPercent).toBe(23);
    expect(actual?.statement).toContain("적정성 판단이 아닙니다");
  });

  test("비교군이 얇으면 백분위를 내지 않고 건수만 적는다", async () => {
    const outcome = judgeRealEstate({
      offer: await loadOffer(),
      claims: buildRealEstateClaims(await loadOffer()).claims,
      trades: createFakeRtmsTradeAdapter(),
    });
    const expected = outcome.placements.find((item) => item.origin === "issuer");

    expect(expected?.comparableCount).toBe(7);
    expect(expected?.thinSample).toBe(true);
    expect(expected?.topPercent).toBeUndefined();
    expect(expected?.medianAmountWon).toBeUndefined();
    expect(expected?.statement).toContain("백분위를 내지 않고");
  });

  test("발행사 제시값과 매각 자료 기재값이 분리돼 기록된다", async () => {
    const report = await runFake();
    const origins = report.realEstatePlacements.map((item) => item.origin);

    expect(origins).toEqual(["issuer", "market"]);
    expect(report.realEstatePlacements[0].originLabel).toContain("예상값");
    expect(report.realEstatePlacements[1].originLabel).toBe("매각 자료 기재값");
  });

  test("근거 0건 위치 제시는 만들어지지 않는다", async () => {
    const report = await runFake();

    expect(
      report.realEstatePlacements.every((item) => item.evidence.length >= 1),
    ).toBe(true);
  });
});

describe("리포트 조립 — 픽스처는 픽스처라고 적는다", () => {
  test("실호출이 거부된 실행은 fake 모드로 남고 사유가 리포트에 적힌다", async () => {
    const report = await runFake();

    expect(report.mode).toBe("fake");
    expect(report.assetKind).toBe("real-estate");
    expect(report.sources[0]).toContain("픽스처");
    expect(report.notes[0]).toContain("returnReasonCode=30");
  });

  test("축산 전용 가격 층위는 비어 있고 부동산 층위만 채워진다", async () => {
    const report = await runFake();

    expect(report.pricePlacements).toEqual([]);
    expect(report.realEstatePlacements).toHaveLength(2);
  });

  test("v1도 정규화된 부동산 상태 메타데이터를 리포트에 남긴다", async () => {
    const report = await runFake();

    expect(report.realEstate).toMatchObject({
      publicAlias: "부동산 A",
      subscriptionStatus: "closed",
      assetLifecycle: "sold",
      tradabilityStatus: "ended",
    });
    expect(report.realEstate?.statusEvidence).toBeUndefined();
  });
});

describe("공개 리포트 익명화", () => {
  test("건물명은 중립 표기로, 지번은 법정동 아래가 지워진다", async () => {
    const snapshot = await publicSnapshotOf();
    const raw = JSON.stringify(snapshot);

    expect(snapshot.unjudged.every((item) => item.claim.subject === "부동산 A")).toBe(
      true,
    );
    expect(raw).not.toContain("지웰");
    expect(raw).not.toContain("1678");
    expect(raw).not.toContain("서초동");
  });

  test("소재지는 시군구까지만 남고 읍면동은 가려진다", () => {
    expect(maskAddressToDong("서울특별시 서초구 서초동 1678-4")).toBe(
      "서울 서초구 ○○동",
    );
  });

  test("화면 금지 용어(불일치)가 산출물에 들어가지 않는다", async () => {
    const snapshot = await publicSnapshotOf();

    expect(JSON.stringify(snapshot)).not.toContain("불일치");
  });

  test("커밋된 공개 리포트가 최소 1건 있고 엔진 계약을 만족한다", () => {
    const files = readdirSync(PUBLIC_DIR).filter((name) =>
      /^report-.*\.json$/.test(name),
    );

    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const parsed = parseReportSnapshot(
        JSON.parse(readFileSync(`${PUBLIC_DIR}/${name}`, "utf8")),
      );
      const raw = JSON.stringify(parsed);
      expect(parsed.assetKind).toBe("real-estate");
      if (parsed.judgements.length === 0) {
        expect(parsed.bySubject).toEqual([]);
        expect(parsed.unjudged.length).toBeGreaterThan(0);
      } else {
        expect(parsed.bySubject.map((item) => item.subject)).toEqual([
          "부동산 A",
        ]);
      }
      expect(parsed.judgements.every((item) => item.evidence.length >= 1)).toBe(true);
      expect(raw).not.toContain("RTMSDataSvcNrgTrade");
      expect(
        parsed.realEstatePlacements.every((placement) =>
          placement.evidence.every(
            (evidence) =>
              evidence.sourceId !== "molit-rtms-nrg-trade" ||
              evidence.url ===
                "https://www.data.go.kr/data/15126463/openapi.do",
          ),
        ),
      ).toBe(true);
    }
  });

  test("SOU 최신 공개 리포트는 매각 판정을 보류하고 exact 식별자를 숨긴다", () => {
    const name = readdirSync(SOU_PUBLIC_DIR)
      .filter((file) => /^report-.*\.json$/.test(file))
      .sort()
      .at(-1);
    expect(name).toBeDefined();
    const raw = readFileSync(`${SOU_PUBLIC_DIR}/${name}`, "utf8");
    const snapshot = parseReportSnapshot(JSON.parse(raw));

    expect(snapshot.offerId).toBe("real-estate-sou-daejeon-startup");
    expect(snapshot.judgements).toEqual([]);
    expect(
      snapshot.unjudged.filter((item) =>
        ["sale_amount", "sale_date"].includes(item.claim.kind),
      ),
    ).toHaveLength(2);
    expect(raw).not.toMatch(
      /어은동|30200|serviceKey|api[_-]?key|LAWD_CD|DEAL_YMD|RTMSDataSvcNrgTrade/i,
    );
  });
});

describe("화면 뷰모델 — 축산 문구가 부동산에 새지 않는다", () => {
  const viewOf = async () =>
    toDemoView({ report: await publicSnapshotOf(), versionCount: 1 });

  test("개체·두수 표현이 부동산 리포트에 나오지 않는다", async () => {
    const view = await viewOf();
    const text = JSON.stringify(view);

    expect(text).not.toContain("개체");
    expect(text).not.toContain("두 전수");
    expect(text).not.toContain("경락");
    expect(view.reality.countUnit).toBe("건");
    expect(view.reality.comparisonDescription).toContain("자산 단위");
  });

  test("판정 집계는 항목 단위로 세고 대조 불가를 숨기지 않는다", async () => {
    const view = await viewOf();

    expect(view.verdict.tallies.map((tally) => tally.label)).toEqual([
      "일치",
      "원장 불일치",
      "대조 불가",
    ]);
    expect(view.verdict.tallies.map((tally) => tally.value)).toEqual([0, 0, 3]);
  });

  test("가격 층위는 비교군 건수를 항상 노출한다", async () => {
    const view = await viewOf();
    const titles = view.price.items.map((item) => item.title).join(" | ");

    expect(titles).toContain("비교군 7건");
    expect(titles).toContain("비교군 13건");
    expect(view.price.note).toContain("적정성 판단이 아닙니다");
  });

  test("목록 카드 문장의 주어는 공모이고 비교군 수가 함께 나온다", async () => {
    const card = buildOfferCard({
      offer: INTERNAL_REPORT_OFFER,
      now: new Date("2026-08-14T00:00:00+09:00"),
      report: await publicSnapshotOf(),
      versionCount: 1,
    });

    expect(card.verdictLine.startsWith("이 공모의 ")).toBe(true);
    expect(card.verdictLine).toContain("비교군 13건");
    expect(card.schedule.phase).toBe("closed");
    expect(card.href).toBe(`/offers/${OFFER_ID}`);
  });

  test("real-estate-a 공개 registry와 내부 리포트 fixture가 함께 유지된다", () => {
    expect(OFFERS.some((entry) => entry.id === OFFER_ID)).toBe(true);
    expect(INTERNAL_REPORT_OFFER.isExitVerified).toBe(true);
    expect(INTERNAL_REPORT_OFFER.assetLifecycle).toBe("sold");
  });
});
