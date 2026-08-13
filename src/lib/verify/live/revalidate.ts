/**
 * 라이브 재검증 — "지금 다시 대조" 한 번의 전체 흐름 (런타임 무관 순수 함수).
 *
 * 설계 제약
 * - **저장 없음**: 서버리스 파일시스템은 읽기 전용이다. 원문도 리포트도 메모리에만 둔다
 *   (CLI의 `writeReport`·`writePublicReport` 단계를 타지 않는다).
 * - **마스킹 강제**: 응답은 `toPublicView`를 거친 공개 리포트에서만 파생된다.
 * - **정직한 폴백**: 키가 없거나 외부 API가 실패하면 fake 데이터로 라이브인 척하지 않는다.
 *   저장된 공개 리포트를 `mode: "snapshot"`으로 돌려주고 사유를 `note`에 적는다.
 * - 재검증의 대상은 **대조(어댑터)**다 — 추출은 빌드 타임 산출물이 기준이므로 LLM을 호출하지 않는다.
 */
import type { LivestockTraceAdapter } from "../adapters/livestock-trace";
import { runVerification } from "../pipeline";
import type { ReportSnapshot } from "../report/snapshot";
import {
  toLiveVerifyBody,
  toPublicView,
  type LiveVerifyBody,
} from "./response";
import type { RateLimitDecision } from "./policy";

export type LiveVerifyErrorCode =
  | "not_found"
  | "rate_limited"
  | "upstream_failed"
  | "not_configured";

export interface LiveVerifyError {
  readonly error: LiveVerifyErrorCode;
  readonly message: string;
}

export interface LiveVerifyResult {
  readonly status: number;
  readonly body: LiveVerifyBody | LiveVerifyError;
  /** 429일 때만 채워진다 (Retry-After 헤더) */
  readonly retryAfterSeconds?: number;
}

export interface LiveVerifyDeps {
  /** 공개 목록(허용목록) — 여기 없는 id는 대조를 시도조차 하지 않는다 */
  readonly isPublished: (offerId: string) => boolean;
  /** 공모 식별자 → DART 접수번호 */
  readonly rcpNoForOffer: (offerId: string) => string | undefined;
  readonly dartApiKey?: string;
  readonly traceServiceKey?: string;
  /** DART 원문 xml을 메모리로 가져온다 (파일 저장 없음) */
  readonly fetchDocumentXml: (rcpNo: string, apiKey: string) => Promise<string>;
  /** 실호출 이력제 어댑터 — fake 어댑터를 여기 끼우면 폴백 정직성이 깨진다 */
  readonly createTraceAdapter: (serviceKey: string) => LivestockTraceAdapter;
  /** 저장된 최신 공개 리포트 (없으면 undefined) */
  readonly loadSnapshot: (offerId: string) => Promise<ReportSnapshot | undefined>;
  readonly checkRateLimit: (clientKey: string) => RateLimitDecision;
  readonly now: () => Date;
}

export interface LiveVerifyInput {
  readonly offerId: string;
  /** 레이트리밋 버킷 키 — 보통 클라이언트 IP */
  readonly clientKey: string;
}

/** 사용자 노출 문구 — 주어는 서비스가 아니라 공모·데이터다(자기보고형 금지) */
const MESSAGES = {
  notFound: "공개된 대조 리포트가 없는 공모입니다.",
  rateLimited:
    "대조 요청이 짧은 시간에 몰렸습니다. 공공 API 쿼터 보호를 위해 잠시 뒤에 다시 시도해 주세요.",
  upstreamFailed:
    "공공 원장 응답을 받지 못했고, 대신 보여줄 저장된 대조 리포트도 없습니다.",
  notConfigured:
    "라이브 대조에 필요한 공공 API 키가 설정되지 않았고, 저장된 대조 리포트도 없습니다.",
} as const;

const snapshotNote = {
  notConfigured: (missing: readonly string[]): string =>
    `라이브 대조에 필요한 공공 API 키(${missing.join(", ")})가 설정되지 않았습니다. 아래 판정은 마지막 대조 시각의 공개 리포트입니다.`,
  upstreamFailed: (reason: string): string =>
    `공공 원장 조회가 완료되지 않았습니다 — ${reason}. 아래 판정은 마지막 대조 시각의 공개 리포트입니다.`,
} as const;

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * 라이브 경로가 성립하지 않을 때의 착지점.
 * 스냅샷이 있으면 200 + `mode: "snapshot"` + 사유, 없으면 사유에 맞는 에러 상태로 답한다.
 */
const fallback = async (
  deps: LiveVerifyDeps,
  offerId: string,
  cause: { readonly code: "not_configured" | "upstream_failed"; readonly note: string },
): Promise<LiveVerifyResult> => {
  const snapshot = await deps.loadSnapshot(offerId);
  if (!snapshot) {
    return {
      status: cause.code === "not_configured" ? 503 : 502,
      body: {
        error: cause.code,
        message:
          cause.code === "not_configured"
            ? MESSAGES.notConfigured
            : MESSAGES.upstreamFailed,
      },
    };
  }

  return {
    status: 200,
    body: toLiveVerifyBody(toPublicView(snapshot), "snapshot", cause.note),
  };
};

/** 라이브 실행에 필요한 설정이 다 있는지 — 없는 항목 이름을 그대로 사용자에게 알린다 */
const missingConfig = (
  deps: LiveVerifyDeps,
  rcpNo: string | undefined,
): readonly string[] => [
  ...(deps.dartApiKey ? [] : ["DART_API_KEY"]),
  ...(deps.traceServiceKey ? [] : ["DATA_GO_KR_API_KEY"]),
  ...(rcpNo ? [] : ["공시 접수번호 매핑"]),
];

export const revalidateOffer = async (
  input: LiveVerifyInput,
  deps: LiveVerifyDeps,
): Promise<LiveVerifyResult> => {
  const { offerId } = input;
  if (!deps.isPublished(offerId)) {
    return {
      status: 404,
      body: { error: "not_found", message: MESSAGES.notFound },
    };
  }

  const gate = deps.checkRateLimit(input.clientKey);
  if (!gate.allowed) {
    return {
      status: 429,
      body: { error: "rate_limited", message: MESSAGES.rateLimited },
      retryAfterSeconds: gate.retryAfterSeconds,
    };
  }

  const rcpNo = deps.rcpNoForOffer(offerId);
  const missing = missingConfig(deps, rcpNo);
  if (!deps.dartApiKey || !deps.traceServiceKey || !rcpNo) {
    return fallback(deps, offerId, {
      code: "not_configured",
      note: snapshotNote.notConfigured(missing),
    });
  }

  try {
    const xml = await deps.fetchDocumentXml(rcpNo, deps.dartApiKey);
    const report = await runVerification({
      rcpNo,
      xml,
      trace: deps.createTraceAdapter(deps.traceServiceKey),
      generatedAt: deps.now().toISOString(),
      // 재검증 대상은 대조다 — 추출은 빌드 타임 산출물 기준이라 LLM을 부르지 않는다
      extractionMode: "rules-only",
    });
    return { status: 200, body: toLiveVerifyBody(toPublicView(report), "live") };
  } catch (error) {
    return fallback(deps, offerId, {
      code: "upstream_failed",
      note: snapshotNote.upstreamFailed(messageOf(error)),
    });
  }
};
