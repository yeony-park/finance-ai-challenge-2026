import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ingestionWorkerEnv } from "./isolation-env";
import type { ParsedPdf } from "./pdf";

export const PDF_WORKER_TIMEOUT_MS = 15_000;
export const PDF_WORKER_MEMORY_MB = 256;

type WorkerMessage =
  | { readonly ok: true; readonly value: ParsedPdf; readonly environmentSafe: boolean }
  | { readonly ok: false };

export interface PdfWorkerHandle {
  once(event: "message", listener: (message: WorkerMessage) => void): this;
  once(event: "error", listener: (error: Error) => void): this;
  once(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): this;
  send(value: Uint8Array, callback: (error: Error | null) => void): boolean;
  kill(signal: NodeJS.Signals): boolean;
}

export type PdfWorkerFactory = () => PdfWorkerHandle;

export class PdfIsolationError extends Error {
  override readonly name = "PdfIsolationError";

  constructor(readonly code: "timeout" | "worker-error" | "worker-exit") {
    super(`PDF worker ${code}`);
  }
}

const createPdfWorker: PdfWorkerFactory = () => fork(
  fileURLToPath(new URL("./pdf-worker.ts", import.meta.url)),
  [],
  {
    execArgv: ["--import", "tsx", `--max-old-space-size=${PDF_WORKER_MEMORY_MB}`],
    env: ingestionWorkerEnv(),
    serialization: "advanced",
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  },
) as PdfWorkerHandle;

export const parsePdfIsolated = (
  input: Uint8Array,
  options: {
    readonly timeoutMs?: number;
    readonly workerFactory?: PdfWorkerFactory;
  } = {},
): Promise<ParsedPdf> => new Promise((resolve, reject) => {
  const worker = (options.workerFactory ?? createPdfWorker)();
  let settled = false;
  const finish = (result: { readonly value: ParsedPdf } | { readonly error: PdfIsolationError }) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    worker.kill("SIGKILL");
    if ("value" in result) resolve(result.value);
    else reject(result.error);
  };
  const timer = setTimeout(
    () => finish({ error: new PdfIsolationError("timeout") }),
    options.timeoutMs ?? PDF_WORKER_TIMEOUT_MS,
  );
  worker.once("message", (message) => {
    if (message.ok && message.environmentSafe) finish({ value: message.value });
    else finish({ error: new PdfIsolationError("worker-error") });
  });
  worker.once("error", () => finish({ error: new PdfIsolationError("worker-error") }));
  worker.once("exit", () => finish({ error: new PdfIsolationError("worker-exit") }));
  const copy = new Uint8Array(input);
  worker.send(copy, (error) => {
    if (error) finish({ error: new PdfIsolationError("worker-error") });
  });
});
