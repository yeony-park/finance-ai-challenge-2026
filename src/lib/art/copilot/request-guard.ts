export class RequestBodyError extends Error {
  constructor() {
    super("invalid request body");
    this.name = "RequestBodyError";
  }
}

export class RequestOriginError extends Error {
  constructor() {
    super("cross-origin request rejected");
    this.name = "RequestOriginError";
  }
}

const firstHeaderValue = (value: string | null): string | null =>
  value?.split(",", 1)[0]?.trim() || null;

/**
 * Browser cross-site POSTs are always rejected. In production, an explicit
 * Origin must also match the host and protocol seen by the application.
 */
export const assertAllowedRequestOrigin = (
  request: Request,
  environment: string | undefined = process.env.NODE_ENV,
): void => {
  if (request.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site") {
    throw new RequestOriginError();
  }

  if (environment !== "production") return;

  const origin = request.headers.get("origin");
  if (!origin) return;

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new RequestOriginError();
  }

  const requestUrl = new URL(request.url);
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host")) ??
    requestUrl.host;
  const forwardedProtocol = firstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );
  const protocol = forwardedProtocol
    ? `${forwardedProtocol.replace(/:$/, "").toLowerCase()}:`
    : requestUrl.protocol.toLowerCase();

  if (
    parsedOrigin.protocol.toLowerCase() !== protocol ||
    parsedOrigin.host.toLowerCase() !== host.toLowerCase()
  ) {
    throw new RequestOriginError();
  }
};

export const readBoundedJson = async (
  request: Request,
  maxBytes: number,
): Promise<unknown> => {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new RequestBodyError();
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    await request.body?.cancel().catch(() => undefined);
    throw new RequestBodyError();
  }

  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maxBytes)
  ) {
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
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError();
  } finally {
    reader.releaseLock();
  }

  if (length === 0) throw new RequestBodyError();

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new RequestBodyError();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestBodyError();
  }
};

export const isExactObject = (
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  Object.keys(value).every((key) => keys.includes(key));
