export class RequestBodyError extends Error {}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RequestBodyError();
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json" || request.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site") {
    await request.body?.cancel().catch(() => undefined);
    throw new RequestBodyError();
  }
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    await request.body?.cancel().catch(() => undefined);
    throw new RequestBodyError();
  }
  if (!request.body) throw new RequestBodyError();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      if (!next.value?.byteLength) continue;
      length += next.value.byteLength;
      if (length > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyError();
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (length === 0) throw new RequestBodyError();
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new RequestBodyError(); }
  try { return JSON.parse(text) as unknown; } catch { throw new RequestBodyError(); }
}

export function exactObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}

const active = new Set<string>();
const lastFinished = new Map<string, number>();
const COOLDOWN_MS = 15_000;

export function acquireProductReview(productId: string, now = Date.now()): { ok: true; release: () => void } | { ok: false; retryAfterSeconds: number } {
  const last = lastFinished.get(productId) ?? 0;
  const remaining = COOLDOWN_MS - (now - last);
  if (active.has(productId) || remaining > 0) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(Math.max(remaining, 1) / 1000)) };
  active.add(productId);
  let released = false;
  return { ok: true, release: () => { if (released) return; released = true; active.delete(productId); lastFinished.set(productId, Date.now()); } };
}

export function clearProductReviewGuardForTests(): void {
  active.clear();
  lastFinished.clear();
}
