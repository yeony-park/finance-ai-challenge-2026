import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { OFFERS } from "@/components/site/offers";

import { createFakeBuildingRegisterAdapter } from "../adapters/building-register-fake";
import { createFakeRtmsTradeAdapter } from "../adapters/rtms-trade-fake";
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

const loadOffer = (): Promise<RealEstateOffer> => loadRealEstateOffer(OFFER_ID);

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
    expect(offer.sources.length).toBeGreaterThan(0);
    expect(offer.limits.length).toBeGreaterThan(0);
  });

  test("소재지가 지번까지 없으면 기초자료가 통과하지 않는다", () => {
    expect(() =>
      parseRealEstateOffer({ schemaVersion: 2 }, "(테스트)"),
    ).toThrow(/올바르지 않습니다/);
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
});

describe("실거래 원장 대조 — 일치 / 원장 불일치 / 대조 불가", () => {
  test("같은 달·같은 금액의 신고가 있으면 매각 내역이 일치로 남는다", async () => {
    const outcome = judgeRealEstate({
      offer: await loadOffer(),
      claims: buildRealEstateClaims(await loadOffer()).claims,
      trades: createFakeRtmsTradeAdapter(),
    });

    expect(outcome.judgements).toHaveLength(2);
    expect(outcome.judgements.every((item) => item.verdict === "match")).toBe(true);
    expect(outcome.judgements.every((item) => item.evidence.length >= 1)).toBe(true);
  });

  test("금액이 다르면 일치로 넘어가지 않고 원장 불일치으로 남는다", async () => {
    const offer = await loadOffer();
    const changed: RealEstateOffer = {
      ...offer,
      sale: { ...offer.sale, amountWon: 9_990_000_000 },
    };

    const outcome = judgeRealEstate({
      offer: changed,
      claims: buildRealEstateClaims(changed).claims,
      trades: createFakeRtmsTradeAdapter(),
    });

    expect(outcome.judgements.map((item) => item.verdict)).toEqual([
      "mismatch",
      "mismatch",
    ]);
  });

  test("수집되지 않은 달은 판정하지 않고 대조 불가로 남는다", async () => {
    const offer = await loadOffer();
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

  test("예상값(발행사 제시)과 실제값(실거래 확정)이 분리돼 기록된다", async () => {
    const report = await runFake();
    const origins = report.realEstatePlacements.map((item) => item.origin);

    expect(origins).toEqual(["issuer", "market"]);
    expect(report.realEstatePlacements[0].originLabel).toContain("예상값");
    expect(report.realEstatePlacements[1].originLabel).toContain("실제값");
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
});

describe("공개 리포트 익명화", () => {
  test("건물명은 중립 표기로, 지번은 법정동 아래가 지워진다", async () => {
    const snapshot = await publicSnapshotOf();
    const raw = JSON.stringify(snapshot);

    expect(snapshot.bySubject[0].subject).toBe("부동산 A");
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
      expect(parsed.assetKind).toBe("real-estate");
      expect(parsed.bySubject[0]?.subject).toBe("부동산 A");
      expect(parsed.judgements.every((item) => item.evidence.length >= 1)).toBe(true);
    }
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
    expect(view.verdict.tallies.map((tally) => tally.value)).toEqual([2, 0, 1]);
  });

  test("가격 층위는 비교군 건수를 항상 노출한다", async () => {
    const view = await viewOf();
    const titles = view.price.items.map((item) => item.title).join(" | ");

    expect(titles).toContain("비교군 7건");
    expect(titles).toContain("비교군 13건");
    expect(view.price.note).toContain("적정성 판단이 아닙니다");
  });

  test("목록 카드 문장의 주어는 공모이고 비교군 수가 함께 나온다", async () => {
    const offer = OFFERS.find((item) => item.id === OFFER_ID);
    if (!offer) throw new Error("레지스트리에 부동산 공모가 없습니다");

    const card = buildOfferCard({
      offer,
      now: new Date("2026-08-14T00:00:00+09:00"),
      report: await publicSnapshotOf(),
      versionCount: 1,
    });

    expect(card.verdictLine.startsWith("이 공모의 ")).toBe(true);
    expect(card.verdictLine).toContain("비교군 13건");
    expect(card.schedule.phase).toBe("closed");
    expect(card.href).toBe(`/offers/${OFFER_ID}`);
  });
});
