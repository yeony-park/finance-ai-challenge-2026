import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import type { LivestockTraceAdapter } from "../adapters/livestock-trace";
import { createFakeTraceAdapter } from "../adapters/livestock-trace-fake";
import { judgeClaims } from "../judge/engine";
import {
  createLiveVerifyGate,
  LIVE_VERIFY_BURST_MAX,
  LIVE_VERIFY_BURST_WINDOW_MS,
  LIVE_VERIFY_DAILY_MAX,
  TRACE_CALLS_PER_REVALIDATION,
  TRACE_DAILY_CALL_QUOTA,
  TRACE_QUOTA_BUDGET_RATIO,
} from "../live/policy";
import {
  revalidateOffer,
  type LiveVerifyDeps,
  type LiveVerifyError,
} from "../live/revalidate";
import type { LiveVerifyBody } from "../live/response";
import type { ReportSnapshot } from "../report/snapshot";
import { isPublicVerificationScopeAllowed } from "../dart/onboarding-catalog";
import type { Claim, ClaimKind, DocumentRef } from "../types";
import { hasLocalFile, rawXmlPath, SNAPSHOT_PATH, skipReason } from "./local-data";

const OFFER_ID = "livestock-9";
const RCP_NO = "20260806000159";
const NOW = new Date("2026-08-14T00:00:00.000Z");

const DOCUMENT: DocumentRef = {
  offerId: OFFER_ID,
  rcpNo: RCP_NO,
  submittedOn: "2026-08-06",
};

const SECRETS = {
  traceNo: "002212786152",
  farmer: "김검증",
  address: "가상로90번길",
  farmNo: "485464",
} as const;

const INTERNAL_REPORT: ReportSnapshot = {
  offerId: OFFER_ID,
  assetKind: "livestock",
  document: DOCUMENT,
  generatedAt: "2026-08-13T14:58:05.788Z",
  mode: "fake",
  sources: ["축산물이력제 개체정보"],
  summary: { total: 1, match: 0, mismatch: 1, unverifiable: 0 },
  bySubject: [{ subject: "학산 24호", verdict: "mismatch", judgementCount: 1 }],
  judgements: [
    {
      verdict: "mismatch",
      claim: {
        id: "custody_location:학산 24호",
        kind: "custody_location",
        subject: "학산 24호",
        field: "보관장소",
        value: "강원특별자치도 검증군 가상읍",
        document: DOCUMENT,
        location: { section: "8", table: "개체 명세표", row: 24 },
        verifiability: "verifiable",
      },
      evidence: [
        {
          sourceId: "livestock-trace",
          sourceName: "축산물이력제",
          url: `http://example.test/trace?traceNo=${SECRETS.traceNo}`,
          observedAt: "2026-08-10T01:40:38.382Z",
          field: "보관장소",
          claimed: "강원특별자치도 검증군 가상읍",
          observed: `경상북도 가상시 남구 ${SECRETS.address} (양수 20260730, 농장번호 ${SECRETS.farmNo}) ${SECRETS.farmer}`,
          stance: "contradicts",
        },
      ],
      rationale:
        "공적 원장의 최종 사육지에서 신고서 보관장소(검증군 가상읍)가 확인되지 않습니다.",
    },
  ],
  unjudged: [
    {
      claim: {
        id: "livestock_trace_no:학산 25호",
        kind: "livestock_trace_no",
        subject: "학산 25호",
        field: "이력번호",
        value: SECRETS.traceNo,
        document: DOCUMENT,
        location: { section: "8", table: "개체 명세표", row: 25 },
        verifiability: "verifiable",
      },
      reason: `학산 25호의 이력번호를 공적 원장에서 조회하지 못했습니다: 축산물이력제 조회 실패 (HTTP 503) traceNo=${SECRETS.traceNo}`,
    },
  ],
  pricePlacements: [],
  realEstatePlacements: [],
  notes: ["추출 모드: rules-only"],
};

const failingFetch = async (): Promise<string> => {
  throw new Error("축산물이력제 조회 실패 (HTTP 503)");
};

const unusedAdapter = (): LivestockTraceAdapter => {
  throw new Error("이 경로에서는 어댑터를 만들면 안 됩니다");
};

const baseDeps = (over: Partial<LiveVerifyDeps> = {}): LiveVerifyDeps => ({
  isPublished: (offerId) => offerId === OFFER_ID,
  rcpNoForOffer: (offerId) => (offerId === OFFER_ID ? RCP_NO : undefined),
  dartApiKey: undefined,
  traceServiceKey: undefined,
  fetchDocumentXml: failingFetch,
  createTraceAdapter: unusedAdapter,
  loadSnapshot: async () => INTERNAL_REPORT,
  checkRateLimit: () => ({
    allowed: true,
    retryAfterSeconds: 0,
    scope: "none",
  }),
  now: () => NOW,
  ...over,
});

const asBody = (body: LiveVerifyBody | LiveVerifyError): LiveVerifyBody =>
  body as LiveVerifyBody;
const asError = (body: LiveVerifyBody | LiveVerifyError): LiveVerifyError =>
  body as LiveVerifyError;

describe("라이브 재검증 — 허용목록·에러 계약", () => {
  test("pending cattle은 snapshot fallback도 읽지 않는다", async () => {
    let snapshots = 0;
    const result = await revalidateOffer(
      { offerId: "livestock-1", clientKey: "1.1.1.1" },
      baseDeps({
        isPublished: isPublicVerificationScopeAllowed,
        loadSnapshot: async () => {
          snapshots += 1;
          return INTERNAL_REPORT;
        },
      }),
    );

    expect(result.status).toBe(404);
    expect(snapshots).toBe(0);
  });

  test("공개 목록에 없는 공모는 404이고 원문을 받아 보지도 않는다", async () => {
    let fetched = 0;
    const deps = baseDeps({
      dartApiKey: "dart",
      traceServiceKey: "data-go-kr",
      fetchDocumentXml: async () => {
        fetched += 1;
        return "<DOCUMENT/>";
      },
    });

    const result = await revalidateOffer(
      { offerId: "not-published", clientKey: "1.1.1.1" },
      deps,
    );

    expect(result.status).toBe(404);
    expect(asError(result.body).error).toBe("not_found");
    expect(asError(result.body).message).toContain("공모");
    expect(fetched).toBe(0);
  });

  test("레이트리밋에 걸리면 429와 Retry-After 초를 돌려주고 대조를 시작하지 않는다", async () => {
    let fetched = 0;
    const deps = baseDeps({
      dartApiKey: "dart",
      traceServiceKey: "data-go-kr",
      fetchDocumentXml: async () => {
        fetched += 1;
        return "<DOCUMENT/>";
      },
      checkRateLimit: () => ({
        allowed: false,
        retryAfterSeconds: 42,
        scope: "client",
      }),
    });

    const result = await revalidateOffer(
      { offerId: OFFER_ID, clientKey: "1.1.1.1" },
      deps,
    );

    expect(result.status).toBe(429);
    expect(result.retryAfterSeconds).toBe(42);
    expect(asError(result.body).error).toBe("rate_limited");
    expect(fetched).toBe(0);
  });

  test("키가 없으면 스냅샷으로 물러서고 사유를 note에 적는다", async () => {
    const result = await revalidateOffer(
      { offerId: OFFER_ID, clientKey: "1.1.1.1" },
      baseDeps(),
    );
    const body = asBody(result.body);

    expect(result.status).toBe(200);
    expect(body.mode).toBe("snapshot");
    expect(body.note).toContain("DART_API_KEY");
    expect(body.note).toContain("DATA_GO_KR_API_KEY");
    expect(body.verifiedAt).toBe(INTERNAL_REPORT.generatedAt);
  });

  test("키가 없고 저장된 리포트도 없으면 503", async () => {
    const result = await revalidateOffer(
      { offerId: OFFER_ID, clientKey: "1.1.1.1" },
      baseDeps({ loadSnapshot: async () => undefined }),
    );

    expect(result.status).toBe(503);
    expect(asError(result.body).error).toBe("not_configured");
  });

  test("외부 API가 실패하면 스냅샷으로 물러서고 사유를 note에 적는다", async () => {
    const result = await revalidateOffer(
      { offerId: OFFER_ID, clientKey: "1.1.1.1" },
      baseDeps({ dartApiKey: "dart", traceServiceKey: "data-go-kr" }),
    );
    const body = asBody(result.body);

    expect(result.status).toBe(200);
    expect(body.mode).toBe("snapshot");
    expect(body.note).toContain("HTTP 503");
  });

  test("외부 API가 실패하고 저장된 리포트도 없으면 502", async () => {
    const result = await revalidateOffer(
      { offerId: OFFER_ID, clientKey: "1.1.1.1" },
      baseDeps({
        dartApiKey: "dart",
        traceServiceKey: "data-go-kr",
        loadSnapshot: async () => undefined,
      }),
    );

    expect(result.status).toBe(502);
    expect(asError(result.body).error).toBe("upstream_failed");
  });
});

describe("라이브 재검증 — 마스킹 강제", () => {
  test("평문 이력번호(002+9자리)가 응답에 실리지 않는다", async () => {
    const result = await revalidateOffer(
      { offerId: OFFER_ID, clientKey: "1.1.1.1" },
      baseDeps(),
    );
    const serialized = JSON.stringify(result.body);

    expect(serialized).not.toMatch(/002\d{9}/);
    const longDigits = new Set(serialized.match(/\d{9,}/g) ?? []);
    expect([...longDigits].filter((digits) => digits !== RCP_NO)).toEqual([]);
  });

  test("농장주 실명·상세주소·농장번호가 응답에 남지 않는다", async () => {
    const result = await revalidateOffer(
      { offerId: OFFER_ID, clientKey: "1.1.1.1" },
      baseDeps(),
    );
    const serialized = JSON.stringify(result.body);

    for (const secret of Object.values(SECRETS)) {
      expect(serialized, `${secret} 가 남아 있습니다`).not.toContain(secret);
    }
  });

  test("개체명은 발행사 명칭이 아니라 번호 표기로 바뀐다", async () => {
    const body = asBody(
      (await revalidateOffer({ offerId: OFFER_ID, clientKey: "1.1.1.1" }, baseDeps()))
        .body,
    );

    for (const subject of body.subjects) {
      expect(subject.subject).toMatch(/^개체 \d+호$/);
    }
    expect(JSON.stringify(body)).not.toContain("학산");
  });

  test("판정이 0건인 개체도 목록에서 빠지지 않는다", async () => {
    const body = asBody(
      (await revalidateOffer({ offerId: OFFER_ID, clientKey: "1.1.1.1" }, baseDeps()))
        .body,
    );
    const unjudgedOnly = body.subjects.find(
      (subject) => subject.judgementCount === 0,
    );

    expect(body.subjects).toHaveLength(2);
    expect(unjudgedOnly?.subject).toBe("개체 25호");
    expect(unjudgedOnly?.verdict).toBe("unverifiable");
    expect(unjudgedOnly?.unjudgedCount).toBe(1);
  });

  test("집계는 개체·항목 두 축으로 나뉜다", async () => {
    const body = asBody(
      (await revalidateOffer({ offerId: OFFER_ID, clientKey: "1.1.1.1" }, baseDeps()))
        .body,
    );

    expect(body.summary.subjects).toEqual({
      total: 2,
      match: 0,
      mismatch: 1,
      unverifiable: 1,
    });
    expect(body.summary.items).toEqual({
      total: 1,
      match: 0,
      mismatch: 1,
      unverifiable: 0,
      unjudged: 1,
    });
  });
});

describe("레이트리밋 정책", () => {
  test("일 상한은 이력제 쿼터·1회 소비량·배정 비율에서 계산된다", () => {
    expect(LIVE_VERIFY_DAILY_MAX).toBe(
      Math.floor(
        (TRACE_DAILY_CALL_QUOTA * TRACE_QUOTA_BUDGET_RATIO) /
          TRACE_CALLS_PER_REVALIDATION,
      ),
    );
    expect(LIVE_VERIFY_DAILY_MAX * TRACE_CALLS_PER_REVALIDATION).toBeLessThanOrEqual(
      TRACE_DAILY_CALL_QUOTA * TRACE_QUOTA_BUDGET_RATIO,
    );
  });

  test("같은 IP는 윈도당 상한만큼만 통과하고 이후 Retry-After가 붙는다", () => {
    const gate = createLiveVerifyGate();
    const start = 1_000_000;

    const allowed = Array.from({ length: LIVE_VERIFY_BURST_MAX }, (_, index) =>
      gate("1.1.1.1", start + index),
    );
    const denied = gate("1.1.1.1", start + LIVE_VERIFY_BURST_MAX);

    expect(allowed.every((decision) => decision.allowed)).toBe(true);
    expect(denied.allowed).toBe(false);
    expect(denied.scope).toBe("client");
    expect(denied.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  test("다른 IP는 서로의 버스트 상한에 영향을 주지 않는다", () => {
    const gate = createLiveVerifyGate();
    const start = 2_000_000;

    for (let index = 0; index < LIVE_VERIFY_BURST_MAX; index += 1) {
      gate("1.1.1.1", start + index);
    }

    expect(gate("2.2.2.2", start + LIVE_VERIFY_BURST_MAX).allowed).toBe(true);
  });

  test("윈도가 지나면 같은 IP도 다시 통과한다", () => {
    const gate = createLiveVerifyGate();
    const start = 3_000_000;

    for (let index = 0; index < LIVE_VERIFY_BURST_MAX; index += 1) {
      gate("1.1.1.1", start + index);
    }

    expect(gate("1.1.1.1", start + LIVE_VERIFY_BURST_WINDOW_MS + 1).allowed).toBe(
      true,
    );
  });
});

describe("부분 실패 — 개체 1건 조회 실패는 전체를 멈추지 않는다", () => {
  const claimOf = (kind: ClaimKind, subject: string, value: string): Claim => ({
    id: `${kind}:${subject}`,
    kind,
    subject,
    field: kind,
    value,
    document: DOCUMENT,
    location: { section: "8", table: "개체 명세표", row: 1 },
    verifiability: "verifiable",
  });

  const flakyAdapter: LivestockTraceAdapter = {
    name: "ekape",
    sourceId: "livestock-trace",
    sourceName: "축산물이력제(stub)",
    url: "http://example.test/trace",
    lookup: async (traceNo) => {
      if (traceNo === "212786153") {
        throw new Error("축산물이력제 조회 실패 (HTTP 500)");
      }
      return {
        traceNo9: "212786152",
        traceNo12: "002212786152",
        exists: true,
        farmHistory: [],
        slaughtered: false,
        vaccinationCount: 0,
        observedAt: "2026-08-14T00:00:00.000Z",
      };
    },
  };

  test("실패한 개체만 대조 불가로 강등되고 나머지 판정은 살아남는다", async () => {
    const claims = [
      claimOf("livestock_trace_no", "검증 1호", "212786152"),
      claimOf("livestock_trace_no", "검증 2호", "212786153"),
    ];

    const outcome = await judgeClaims(claims, { trace: flakyAdapter });

    expect(outcome.judgements).toHaveLength(1);
    expect(outcome.judgements[0].claim.subject).toBe("검증 1호");
    expect(outcome.unjudged).toHaveLength(1);
    expect(outcome.unjudged[0].claim.subject).toBe("검증 2호");
    expect(outcome.unjudged[0].reason).toContain("HTTP 500");
  });
});

const RAW_XML_PATH = rawXmlPath(RCP_NO);
const hasLocalData = hasLocalFile(RAW_XML_PATH) && hasLocalFile(SNAPSHOT_PATH);

describe.skipIf(!hasLocalData)(
  `라이브 경로 완주 — 실측 원문·원장 ${
    hasLocalData ? "" : skipReason(`${RAW_XML_PATH} / ${SNAPSHOT_PATH}`)
  }`,
  () => {
    const liveLikeDeps = async (): Promise<LiveVerifyDeps> => {
      const replay = await createFakeTraceAdapter();
      return baseDeps({
        dartApiKey: "dart",
        traceServiceKey: "data-go-kr",
        fetchDocumentXml: async () => readFileSync(RAW_XML_PATH, "utf8"),
        createTraceAdapter: () => ({ ...replay, name: "ekape" }),
      });
    };

    test("37두 대조를 완주하고 mode는 live·verifiedAt은 실행 시각이다", async () => {
      const result = await revalidateOffer(
        { offerId: OFFER_ID, clientKey: "1.1.1.1" },
        await liveLikeDeps(),
      );
      const body = asBody(result.body);

      expect(result.status).toBe(200);
      expect(body.mode).toBe("live");
      expect(body.verifiedAt).toBe(NOW.toISOString());
      expect(body.subjects).toHaveLength(37);
      expect(body.summary.subjects.mismatch).toBe(1);
    });

    test("실측 원장을 거친 응답에도 평문 이력번호·실명이 없다", async () => {
      const result = await revalidateOffer(
        { offerId: OFFER_ID, clientKey: "1.1.1.1" },
        await liveLikeDeps(),
      );
      const serialized = JSON.stringify(result.body);

      expect(serialized).not.toMatch(/002\d{9}/);
      const longDigits = new Set(serialized.match(/\d{9,}/g) ?? []);
      expect([...longDigits].filter((digits) => digits !== RCP_NO)).toEqual([]);
    });
  },
);
