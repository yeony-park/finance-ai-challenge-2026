/**
 * `POST /api/verify/[id]` — 라이브 재검증("지금 다시 대조").
 *
 * 심사자 curl 예시:
 *   curl -X POST https://<배포주소>/api/verify/livestock-9
 *
 * 계약
 * - 응답은 항상 마스킹된 공개 리포트에서 파생된다 (실명·이력번호 평문·상세주소 없음)
 * - 신선도가 곧 제품 가치이므로 `no-store` — 캐시된 판정은 재검증이 아니다
 * - 키 미설정·외부 API 실패는 fake로 덮지 않는다 → `mode: "snapshot"` + 사유, 그마저 없으면 503/502
 * - 본문은 읽지 않는다(빈 본문 허용). GET·기타 메서드는 정의하지 않아 Next가 405로 답한다
 */
import { NextResponse, type NextRequest } from "next/server";

import { isPublishedOfferId } from "@/components/site/service";
import { createEkapeTraceAdapter } from "@/lib/verify/adapters/livestock-trace";
import { fetchDocumentXmlInMemory } from "@/lib/verify/dart/fetch-document";
import { createLiveVerifyGate } from "@/lib/verify/live/policy";
import { revalidateOffer } from "@/lib/verify/live/revalidate";
import { loadLatestReport } from "@/lib/verify/report/load";
import type { ReportSnapshot } from "@/lib/verify/report/snapshot";
import { rcpNoForOffer } from "@/lib/verify/pipeline";

// Edge 금지(플랜 결정) — 원문 압축 해제·파일 읽기가 Node API에 의존한다
export const runtime = "nodejs";
// 재검증은 언제나 요청 시각에 실행된다
export const dynamic = "force-dynamic";

// 모듈 스코프 게이트 — Fluid Compute 인스턴스 재사용 범위에서 유효(spine 리미터와 같은 한계)
const gate = createLiveVerifyGate();

/** 저장된 공개 리포트. 없으면 예외 대신 undefined — 폴백 판단은 호출부가 한다 */
const loadSnapshot = async (
  offerId: string,
): Promise<ReportSnapshot | undefined> => {
  try {
    return (await loadLatestReport(offerId)).report;
  } catch {
    return undefined;
  }
};

export async function POST(
  request: NextRequest,
  context: { readonly params: Promise<{ readonly id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  const result = await revalidateOffer(
    { offerId: id, clientKey },
    {
      isPublished: isPublishedOfferId,
      rcpNoForOffer,
      dartApiKey: process.env.DART_API_KEY,
      traceServiceKey: process.env.DATA_GO_KR_API_KEY,
      fetchDocumentXml: (rcpNo, apiKey) =>
        fetchDocumentXmlInMemory(rcpNo, apiKey),
      createTraceAdapter: (serviceKey) =>
        createEkapeTraceAdapter({ serviceKey }),
      loadSnapshot,
      checkRateLimit: (key) => gate(key),
      now: () => new Date(),
    },
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "Cache-Control": "no-store",
      ...(result.retryAfterSeconds === undefined
        ? {}
        : { "Retry-After": String(result.retryAfterSeconds) }),
    },
  });
}
