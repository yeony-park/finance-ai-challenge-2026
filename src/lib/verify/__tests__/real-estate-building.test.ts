import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  BUILDING_HUB_CACHE_SUBDIR,
  loadBuildingHubCache,
  type BuildingHubCacheLookup,
} from "../adapters/building-register";
import { resolveRtmsTradeAdapter } from "../adapters/rtms-trade-fake";
import {
  buildRealEstateClaims,
  loadRealEstateOffer,
} from "../claims/real-estate";
import { judgeRealEstate } from "../judge/real-estate";
import { runRealEstateVerification } from "../pipeline";
import { toPublicReport } from "../report/public-report";
import { parseReportSnapshot } from "../report/snapshot";
import type { ClaimKind } from "../types";

const OFFER_ID = "real-estate-bbric-hiwon";
const BUILDING_KINDS: ReadonlySet<ClaimKind> = new Set([
  "real_estate_address",
  "real_estate_parcel_area",
  "real_estate_building_area",
  "real_estate_total_area",
  "real_estate_use_approved_month",
]);

const loadInputs = async () => {
  const offer = await loadRealEstateOffer(OFFER_ID);
  const request = offer.asset.buildingHubRequest;
  if (!request) throw new Error("희원감천 BuildingHUB 요청이 없습니다");
  const [buildingHub, trades] = await Promise.all([
    loadBuildingHubCache(request),
    resolveRtmsTradeAdapter({
      lawdCd: offer.asset.lawdCd,
      sigunguName: offer.asset.sigunguName,
    }),
  ]);
  return { offer, buildingHub, trades };
};

describe("희원감천 BuildingHUB·RTMS 대조", () => {
  test("v2 자산은 상세 문자열과 별도로 면적·승인월·exact parcel 요청을 보존한다", async () => {
    const { offer } = await loadInputs();

    expect(offer.asset).toMatchObject({
      parcelAreaSqm: 384,
      buildingAreaSqm: 211.87,
      totalAreaSqm: 1723.48,
      structure: "철근콘크리트조·조적조",
      useApprovedYearMonth: "2000-10",
      buildingHubRequest: {
        sigunguCd: "26380",
        bjdongCd: "10800",
        platGbCd: "0",
        bun: "0651",
        ji: "0001",
      },
    });
    expect(
      buildRealEstateClaims(offer).claims
        .filter((claim) => BUILDING_KINDS.has(claim.kind))
        .map((claim) => claim.kind),
    ).toEqual([
      "real_estate_address",
      "real_estate_parcel_area",
      "real_estate_building_area",
      "real_estate_total_area",
      "real_estate_use_approved_month",
    ]);
  });

  test("v2 유효 주소에 exact parcel 요청이 없으면 조회 조건 누락 사유를 남긴다", async () => {
    const { offer } = await loadInputs();
    const address = buildRealEstateClaims({
      ...offer,
      asset: { ...offer.asset, buildingHubRequest: undefined },
    }).claims.find((claim) => claim.kind === "real_estate_address");

    expect(address?.verifiability).toBe("structurally_impossible");
    expect(address?.demotionReason).toMatch(/exact parcel 조회 조건이 없어/);
  });

  test("실제 cache에서 4건 일치·건축면적 1건 불일치와 공모가 위치 1건을 만든다", async () => {
    const { offer, buildingHub, trades } = await loadInputs();
    const report = runRealEstateVerification({ offer, buildingHub, trades });
    const verdicts = Object.fromEntries(
      report.judgements.map((item) => [item.claim.kind, item.verdict]),
    );

    expect(report.mode).toBe("live");
    expect(report.realEstate).toEqual({
      publicAlias: "희원감천",
      subscriptionStatus: "closed",
      assetLifecycle: "operating",
      tradabilityStatus: "unknown",
      statusEvidence: {
        assetLifecycle: {
          sourceKind: "platform-claim",
          label:
            "BBRIC 공개 공지 목록 — 하나대체투자부산특구부동산투자신탁1호 배당금 지급 안내",
          url: "https://bbric.com/notice.php",
          asOf: "2026-05-27",
        },
        tradabilityStatus: {
          sourceKind: "platform-claim",
          label: "BBRIC 공개 빌딩 목록 — 희원감천빌딩 상장 표기",
          url: "https://www.bbric.com/building.php",
          asOf: "2026-08-23",
        },
      },
    });
    expect(report.summary).toEqual({
      total: 5,
      match: 4,
      mismatch: 1,
      unverifiable: 0,
    });
    expect(verdicts).toMatchObject({
      real_estate_address: "match",
      real_estate_parcel_area: "match",
      real_estate_building_area: "mismatch",
      real_estate_total_area: "match",
      real_estate_use_approved_month: "match",
    });
    expect(report.judgements.find(
      (item) => item.claim.kind === "real_estate_address",
    )?.rationale).toMatch(/^소재지가 /);
    expect(report.judgements.find(
      (item) => item.claim.kind === "real_estate_building_area",
    )?.evidence[0]?.observed).toBe("221.87㎡");
    expect(
      report.judgements.every(
        (item) =>
          item.evidence[0]?.url.includes("serviceKey") === false &&
          item.evidence[1]?.url.includes("bbric.com/building.php") === true,
      ),
    ).toBe(true);
    expect(report.realEstatePlacements).toHaveLength(1);
    expect(report.realEstatePlacements[0]).toMatchObject({
      origin: "issuer",
      comparableCount: 3,
    });
    expect(report.realEstatePlacements[0]?.topPercent).toBeUndefined();
    expect(report.realEstatePlacements[0]?.evidence[0]?.note).toContain(
      "동일 자산 후보 거래 1건 · 45억원 · 지번 미공개로 동일 물건 확정 불가",
    );
  });

  test("missing·empty·failed cache는 BuildingHUB 대상 5건을 모두 판정 보류한다", async () => {
    const { offer, buildingHub, trades } = await loadInputs();
    const cache = buildingHub.cache;
    if (!cache) throw new Error("희원감천 BuildingHUB cache가 없습니다");
    const lookups: readonly BuildingHubCacheLookup[] = [
      { reason: "캐시 없음" },
      {
        cache: {
          ...cache,
          status: "empty",
          reason: "표제부 없음",
          totalCount: 0,
          records: [],
        },
      },
      {
        cache: {
          ...cache,
          status: "failed",
          reason: "수집 실패",
          totalCount: 0,
          records: [],
        },
      },
    ];

    for (const lookup of lookups) {
      const claims = buildRealEstateClaims(offer).claims;
      const outcome = judgeRealEstate({ offer, claims, trades, buildingHub: lookup });
      expect(
        outcome.judgements.filter((item) => BUILDING_KINDS.has(item.claim.kind)),
      ).toEqual([]);
      expect(
        outcome.unjudged.filter((item) => BUILDING_KINDS.has(item.claim.kind)),
      ).toHaveLength(5);
    }
  });

  test("부분 표제부에서 없는 필드만 판정 보류한다", async () => {
    const { offer, buildingHub, trades } = await loadInputs();
    const cache = buildingHub.cache;
    const record = cache?.records[0];
    if (!cache || !record) throw new Error("희원감천 BuildingHUB record가 없습니다");
    const claims = buildRealEstateClaims(offer).claims;
    const outcome = judgeRealEstate({
      offer,
      claims,
      trades,
      buildingHub: {
        cache: { ...cache, records: [{ ...record, totalAreaSqm: undefined }] },
      },
    });

    expect(
      outcome.unjudged.find(
        (item) => item.claim.kind === "real_estate_total_area",
      )?.reason,
    ).toContain("값이 없어");
    expect(
      outcome.judgements.filter((item) => BUILDING_KINDS.has(item.claim.kind)),
    ).toHaveLength(4);
  });

  test("loader는 missing·형식 오류 cache를 throw하지 않고 사유로 반환한다", async () => {
    const { offer } = await loadInputs();
    const request = offer.asset.buildingHubRequest;
    if (!request) throw new Error("희원감천 BuildingHUB 요청이 없습니다");
    const dataDir = await mkdtemp(path.join(tmpdir(), "hiwon-building-"));
    try {
      const missing = await loadBuildingHubCache(request, dataDir);
      const dir = path.join(dataDir, BUILDING_HUB_CACHE_SUBDIR);
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "26380-10800-0-0651-0001.json"),
        "{not-json",
        "utf8",
      );
      const malformed = await loadBuildingHubCache(request, dataDir);

      expect(missing).toEqual({
        reason: "건축물대장 exact parcel 캐시를 찾거나 읽지 못했습니다.",
      });
      expect(malformed).toEqual({
        reason: "건축물대장 exact parcel 캐시 형식이 올바르지 않습니다.",
      });
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  test("공개 리포트는 정확 지번·exact query·비밀키를 제거한다", async () => {
    const { offer, buildingHub, trades } = await loadInputs();
    const report = runRealEstateVerification({ offer, buildingHub, trades });
    const publicReport = toPublicReport(
      parseReportSnapshot(JSON.parse(JSON.stringify(report))),
    );
    const raw = JSON.stringify(publicReport);
    const address = publicReport.judgements.find(
      (item) => item.claim.kind === "real_estate_address",
    );

    expect(() => parseReportSnapshot(publicReport)).not.toThrow();
    expect(address?.evidence[0]?.url).toBe(
      "https://www.data.go.kr/data/15134735/openapi.do",
    );
    expect(address?.evidence[1]?.url).toContain("bbric.com/building.php");
    expect(publicReport.realEstatePlacements[0]?.evidence[0]?.url).toBe(
      "https://www.data.go.kr/data/15126463/openapi.do",
    );
    expect(publicReport.realEstate).toMatchObject({
      publicAlias: "희원감천",
      assetLifecycle: "operating",
      tradabilityStatus: "unknown",
      statusEvidence: {
        assetLifecycle: {
          sourceKind: "platform-claim",
          url: "https://bbric.com/notice.php",
          asOf: "2026-05-27",
        },
        tradabilityStatus: {
          sourceKind: "platform-claim",
          url: "https://www.bbric.com/building.php",
          asOf: "2026-08-23",
        },
      },
    });
    expect(
      publicReport.realEstate?.statusEvidence?.assetLifecycle?.label,
    ).toContain("BBRIC 공개 공지 목록 — 희원감천");
    expect(raw).toContain("https://bbric.com/notice.php");
    expect(raw).toContain("https://www.bbric.com/building.php");
    expect(raw).not.toContain("651-1");
    expect(raw).not.toContain("bun=0651");
    expect(raw).not.toContain("ji=0001");
    expect(raw).not.toContain("serviceKey");
    expect(raw).not.toContain("RTMSDataSvcNrgTrade");
    expect(raw).not.toContain("감천동 651-1");
    expect(raw).not.toContain("하나대체투자부산특구부동산투자신탁1호");
    expect(raw).not.toContain("희원감천빌딩");
  });
});
