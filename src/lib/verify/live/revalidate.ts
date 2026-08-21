import type { AuctionPriceAdapter } from "../adapters/auction-price";
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
  readonly retryAfterSeconds?: number;
}

export interface LiveVerifyDeps {
  readonly isPublished: (offerId: string) => boolean;
  readonly rcpNoForOffer: (offerId: string) => string | undefined;
  readonly dartApiKey?: string;
  readonly traceServiceKey?: string;
  readonly fetchDocumentXml: (rcpNo: string, apiKey: string) => Promise<string>;
  readonly createTraceAdapter: (serviceKey: string) => LivestockTraceAdapter;
  readonly createAuctionAdapter?: () => Promise<AuctionPriceAdapter>;
  readonly loadSnapshot: (offerId: string) => Promise<ReportSnapshot | undefined>;
  readonly checkRateLimit: (clientKey: string) => RateLimitDecision;
  readonly now: () => Date;
}

export interface LiveVerifyInput {
  readonly offerId: string;
  readonly clientKey: string;
}

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
    const auction = await deps.createAuctionAdapter?.();
    const report = await runVerification({
      rcpNo,
      xml,
      trace: deps.createTraceAdapter(deps.traceServiceKey),
      ...(auction === undefined ? {} : { auction }),
      generatedAt: deps.now().toISOString(),
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
