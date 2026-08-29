import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ingestionWorkerEnv } from "./isolation-env";
import { MAX_PDF_BYTES, sha256 } from "./pdf";
import {
  MAX_OCR_PAGES,
  MAX_OCR_PNG_BYTES,
  assertOcrRenderWithinLimits,
  type OcrRenderer,
  type RenderedOcrPage,
} from "./vision-ocr";

export const OCR_WORKER_TIMEOUT_MS = 45_000;
export const OCR_WORKER_MEMORY_MB = 384;
export const MAX_OCR_TOTAL_PNG_BYTES = 30 * 1024 * 1024;

export class OcrRenderIsolationError extends Error {
  constructor(readonly code: "timeout" | "worker-error" | "worker-exit") { super(`OCR render ${code}`); }
}

type Message = { ok: boolean; value?: readonly RenderedOcrPage[]; environmentSafe?: boolean };
export interface OcrWorkerHandle {
  once(event: "message", listener: (message: Message) => void): this;
  once(event: "error", listener: () => void): this;
  once(event: "exit", listener: () => void): this;
  send(value: unknown, callback: (error: Error | null) => void): boolean;
  kill(signal: NodeJS.Signals): boolean;
}
const createWorker = (): OcrWorkerHandle => fork(
  fileURLToPath(new URL("./ocr-render-worker.ts", import.meta.url)),
  [],
  {
    execArgv: ["--import", "tsx", `--max-old-space-size=${OCR_WORKER_MEMORY_MB}`],
    env: ingestionWorkerEnv(),
    serialization: "advanced",
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  },
) as OcrWorkerHandle;

const validateRequest = (pdf: Uint8Array, pages: readonly number[]): void => {
  if (pdf.byteLength === 0 || pdf.byteLength > MAX_PDF_BYTES) throw new OcrRenderIsolationError("worker-error");
  if (pages.length === 0 || pages.length > MAX_OCR_PAGES || pages.some((page, index) =>
    !Number.isInteger(page) || page <= 0 || (index > 0 && page <= pages[index - 1]))) {
    throw new OcrRenderIsolationError("worker-error");
  }
};

const validateResponse = (value: unknown, pages: readonly number[]): value is readonly RenderedOcrPage[] => {
  if (!Array.isArray(value) || value.length !== pages.length) return false;
  let totalBytes = 0;
  return value.every((candidate, index) => {
    if (!candidate || typeof candidate !== "object") return false;
    const page = candidate as Partial<RenderedOcrPage>;
    if (page.page !== pages[index] || !(page.png instanceof Uint8Array) ||
      typeof page.renderWidth !== "number" || typeof page.renderHeight !== "number" ||
      typeof page.renderScale !== "number" || !Number.isFinite(page.renderScale) || page.renderScale <= 0 ||
      typeof page.renderHash !== "string" || page.renderHash !== sha256(page.png)) return false;
    totalBytes += page.png.byteLength;
    try {
      assertOcrRenderWithinLimits(page.renderWidth, page.renderHeight, page.png.byteLength);
    } catch {
      return false;
    }
    return page.png.byteLength <= MAX_OCR_PNG_BYTES && totalBytes <= MAX_OCR_TOTAL_PNG_BYTES;
  });
};

export const renderPdfPagesIsolatedWithOptions = (
  pdf: Uint8Array,
  pages: readonly number[],
  options: { timeoutMs?: number; workerFactory?: () => OcrWorkerHandle } = {},
): Promise<readonly RenderedOcrPage[]> => {
  try {
    validateRequest(pdf, pages);
  } catch (error) {
    return Promise.reject(error);
  }
  return new Promise((resolve, reject) => {
    const child = (options.workerFactory ?? createWorker)();
    let settled = false;
    const finish = (value?: readonly RenderedOcrPage[], error?: OcrRenderIsolationError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill("SIGKILL");
      if (error) reject(error);
      else resolve(value ?? []);
    };
    const timer = setTimeout(
      () => finish(undefined, new OcrRenderIsolationError("timeout")),
      options.timeoutMs ?? OCR_WORKER_TIMEOUT_MS,
    );
    child.once("message", (message) => message.ok && message.environmentSafe === true && validateResponse(message.value, pages)
      ? finish(message.value)
      : finish(undefined, new OcrRenderIsolationError("worker-error")));
    child.once("error", () => finish(undefined, new OcrRenderIsolationError("worker-error")));
    child.once("exit", () => finish(undefined, new OcrRenderIsolationError("worker-exit")));
    child.send({ pdf: new Uint8Array(pdf), pages: [...pages] }, (error) => {
      if (error) finish(undefined, new OcrRenderIsolationError("worker-error"));
    });
  });
};

export const renderPdfPagesIsolated: OcrRenderer = renderPdfPagesIsolatedWithOptions;
