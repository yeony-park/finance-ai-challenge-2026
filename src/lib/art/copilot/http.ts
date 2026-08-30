import { artProductIdSchema, type ArtProduct } from "@/lib/art/product-model";
import { getArtProductById } from "@/lib/art/product-repository";
import { screenInput } from "@/lib/spine/guardrail/input-screen";
import type { RateLimiter } from "@/lib/spine/ops/rate-limit";

import {
  assertAllowedRequestOrigin,
  isExactObject,
  readBoundedJson,
  RequestBodyError,
  RequestOriginError,
} from "./request-guard";
import {
  answerProductQuestion,
  type AskProductResponse,
  type CopilotServiceOptions,
} from "./service";

const MAX_REQUEST_BYTES = 8_192;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
} as const;

interface AskProductHandlerDeps {
  readonly rateLimiter: RateLimiter;
  readonly getProduct?: (id: string) => Promise<ArtProduct | null>;
  readonly answerQuestion?: (
    product: ArtProduct,
    question: string,
    options?: CopilotServiceOptions,
  ) => Promise<AskProductResponse>;
  readonly environment?: string;
  readonly mode?: "demo" | "live";
}

const json = (
  body: unknown,
  init: { readonly status: number; readonly headers?: HeadersInit },
): Response =>
  new Response(JSON.stringify(body), {
    status: init.status,
    headers: { ...NO_STORE_HEADERS, ...init.headers },
  });

const errorJson = (
  code: "validation_error" | "not_found" | "rate_limited" | "internal_error",
  message: string,
  init: { readonly status: number; readonly headers?: HeadersInit },
): Response => json({ error: code, message }, init);

const clientKey = (request: Request): string =>
  (
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  ).slice(0, 128);

const isValidBody = (
  body: unknown,
): body is { readonly productId: string; readonly question: string } =>
  isExactObject(body, ["productId", "question"]) &&
  typeof body.productId === "string" &&
  body.productId.length >= 1 &&
  body.productId.length <= 128 &&
  typeof body.question === "string" &&
  body.question.trim().length >= 1 &&
  body.question.length <= 1_000;

export const createAskProductHandler =
  (deps: AskProductHandlerDeps) =>
  async (request: Request): Promise<Response> => {
    try {
      assertAllowedRequestOrigin(request, deps.environment);

      const rate = deps.rateLimiter.check(clientKey(request));
      if (!rate.allowed) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil(rate.retryAfterMs / 1_000),
        );
        return errorJson(
          "rate_limited",
          "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
          {
            status: 429,
            headers: { "Retry-After": String(retryAfterSeconds) },
          },
        );
      }

      const body = await readBoundedJson(request, MAX_REQUEST_BYTES);
      if (
        !isValidBody(body) ||
        !artProductIdSchema.safeParse(body.productId).success
      ) {
        return errorJson(
          "validation_error",
          "상품과 1,000자 이하 질문이 필요합니다.",
          { status: 400 },
        );
      }

      const question = body.question.trim();
      if (screenInput(question).decision === "block") {
        return errorJson(
          "validation_error",
          "서비스 범위를 벗어난 질문은 처리할 수 없습니다.",
          { status: 400 },
        );
      }

      const product = await (deps.getProduct ?? getArtProductById)(
        body.productId,
      );
      if (!product) {
        return errorJson("not_found", "상품이 없습니다.", { status: 404 });
      }

      const response = await (deps.answerQuestion ?? answerProductQuestion)(
        product,
        question,
        deps.mode ? { mode: deps.mode } : undefined,
      );
      return json(response, { status: 200 });
    } catch (error) {
      if (error instanceof RequestOriginError) {
        return errorJson(
          "validation_error",
          "허용되지 않은 요청 출처입니다.",
          { status: 400 },
        );
      }
      if (error instanceof RequestBodyError) {
        return errorJson(
          "validation_error",
          "질문 요청 형식이 올바르지 않습니다.",
          { status: 400 },
        );
      }
      return errorJson(
        "internal_error",
        "질문 처리 중 오류가 발생했습니다.",
        { status: 500 },
      );
    }
  };
