import { describe, expect, it, vi } from "vitest";
import {
  OcrRenderIsolationError,
  renderPdfPagesIsolatedWithOptions,
  type OcrWorkerHandle,
} from "../ocr-render-isolation";
import { sha256 } from "../pdf";

type WorkerMessage = { ok: boolean; value?: unknown; environmentSafe?: boolean };
type Listeners = {
  message?: (message: WorkerMessage) => void;
  error?: () => void;
  exit?: () => void;
};

const fakeWorker = (
  start: (listeners: Listeners) => void,
): { handle: OcrWorkerHandle; kill: ReturnType<typeof vi.fn> } => {
  const listeners: Listeners = {};
  const kill = vi.fn(() => true);
  const handle = {
    once(event: keyof Listeners, listener: never) {
      listeners[event] = listener;
      return this;
    },
    send(_value: unknown, callback: (error: Error | null) => void) {
      start(listeners);
      callback(null);
      return true;
    },
    kill,
  } as unknown as OcrWorkerHandle;
  return { handle, kill };
};

const output = (page = 1) => {
  const png = new Uint8Array([137, 80, 78, 71]);
  return { page, png, renderScale: 2, renderWidth: 100, renderHeight: 200, renderHash: sha256(png) };
};

const minimalPdf = (): Uint8Array => {
  const stream = "BT /F1 12 Tf 20 80 Td (Isolation fixture) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let value = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(value.length);
    value += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = value.length;
  value += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(value);
};

describe("isolated OCR renderer", () => {
  it("부모 비밀 없이 고정 tsx child에서 PDF load/getPage/render/toBuffer를 실행한다", async () => {
    const previous = [process.env.OPENAI_API_KEY, process.env.AI_GATEWAY_API_KEY, process.env.TEST_AUTH_KEY];
    process.env.OPENAI_API_KEY = "must-not-leak";
    process.env.AI_GATEWAY_API_KEY = "must-not-leak";
    process.env.TEST_AUTH_KEY = "must-not-leak";
    try {
      await expect(renderPdfPagesIsolatedWithOptions(minimalPdf(), [1], { timeoutMs: 10_000 }))
        .resolves.toEqual([expect.objectContaining({ page: 1, renderWidth: 600, renderHeight: 288 })]);
    } finally {
      ["OPENAI_API_KEY", "AI_GATEWAY_API_KEY", "TEST_AUTH_KEY"].forEach((name, index) => {
        if (previous[index] === undefined) delete process.env[name];
        else process.env[name] = previous[index];
      });
    }
  }, 15_000);

  it("wall timeout이면 child를 강제 종료한다", async () => {
    const worker = fakeWorker(() => undefined);
    await expect(renderPdfPagesIsolatedWithOptions(new Uint8Array([1]), [1], {
      timeoutMs: 5,
      workerFactory: () => worker.handle,
    })).rejects.toMatchObject({ code: "timeout" } satisfies Partial<OcrRenderIsolationError>);
    expect(worker.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("worker error와 비정상 출력을 안전한 오류로 바꾸고 child를 종료한다", async () => {
    const errorWorker = fakeWorker((listeners) => queueMicrotask(() => listeners.error?.()));
    await expect(renderPdfPagesIsolatedWithOptions(new Uint8Array([1]), [1], {
      workerFactory: () => errorWorker.handle,
    })).rejects.toMatchObject({ code: "worker-error" } satisfies Partial<OcrRenderIsolationError>);
    expect(errorWorker.kill).toHaveBeenCalledWith("SIGKILL");

    const oversizedWorker = fakeWorker((listeners) => queueMicrotask(() => listeners.message?.({
      ok: true,
      environmentSafe: true,
      value: [{ ...output(), renderWidth: 12_000_001 }],
    })));
    await expect(renderPdfPagesIsolatedWithOptions(new Uint8Array([1]), [1], {
      workerFactory: () => oversizedWorker.handle,
    })).rejects.toMatchObject({ code: "worker-error" } satisfies Partial<OcrRenderIsolationError>);
    expect(oversizedWorker.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("요청·응답 페이지를 순서와 범위까지 1:1로 검증한다", async () => {
    const factory = vi.fn(() => fakeWorker(() => undefined).handle);
    await expect(renderPdfPagesIsolatedWithOptions(new Uint8Array([1]), [1, 1], { workerFactory: factory }))
      .rejects.toMatchObject({ code: "worker-error" });
    await expect(renderPdfPagesIsolatedWithOptions(new Uint8Array([1]), [2, 1], { workerFactory: factory }))
      .rejects.toMatchObject({ code: "worker-error" });
    expect(factory).not.toHaveBeenCalled();

    const wrongPageWorker = fakeWorker((listeners) => queueMicrotask(() => listeners.message?.({ ok: true, environmentSafe: true, value: [output(2)] })));
    await expect(renderPdfPagesIsolatedWithOptions(new Uint8Array([1]), [1], {
      workerFactory: () => wrongPageWorker.handle,
    })).rejects.toMatchObject({ code: "worker-error" });
    expect(wrongPageWorker.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("검증된 worker 결과만 반환하고 완료 후 child를 종료한다", async () => {
    const worker = fakeWorker((listeners) => queueMicrotask(() => listeners.message?.({ ok: true, environmentSafe: true, value: [output()] })));
    await expect(renderPdfPagesIsolatedWithOptions(new Uint8Array([1]), [1], {
      workerFactory: () => worker.handle,
    })).resolves.toEqual([output()]);
    expect(worker.kill).toHaveBeenCalledWith("SIGKILL");
  });
});
