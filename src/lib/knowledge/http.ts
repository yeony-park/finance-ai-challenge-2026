import { KnowledgeQuerySchema, type KnowledgeQuery } from "./schema";

const MAX_BODY_BYTES = 32_768;

export type JsonBodyResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false };

// Rate limiting is enforced at the deployment edge, not with a per-process memory map.
export const readJsonBody = async (request: Request): Promise<JsonBodyResult> => {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") return { ok: false };

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    await request.body?.cancel().catch(() => undefined);
    return { ok: false };
  }
  const reader = request.body?.getReader();
  if (!reader) return { ok: false };

  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  } finally {
    reader.releaseLock();
  }
};

export const parseKnowledgeRequest = async (
  request: Request,
): Promise<KnowledgeQuery | null> => {
  const body = await readJsonBody(request);
  if (!body.ok) return null;
  const parsed = KnowledgeQuerySchema.safeParse(body.value);
  return parsed.success ? parsed.data : null;
};

export const invalidRequest = (): Response =>
  Response.json(
    { error: { code: "INVALID_REQUEST", message: "요청 본문을 확인해 주세요." } },
    { status: 400 },
  );

export const internalError = (): Response =>
  Response.json(
    { error: { code: "INTERNAL_ERROR", message: "요청을 처리하지 못했습니다." } },
    { status: 500 },
  );
