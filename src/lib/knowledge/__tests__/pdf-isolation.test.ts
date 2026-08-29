import { describe, expect, it, vi } from "vitest";
import {
  PdfIsolationError,
  parsePdfIsolated,
  type PdfWorkerHandle,
} from "../pdf-isolation";

type ListenerMap = {
  message?: (message: { readonly ok: false }) => void;
  error?: (error: Error) => void;
  exit?: (code: number | null, signal: NodeJS.Signals | null) => void;
};

const fakeChild = (
  start: (listeners: ListenerMap) => void,
): { readonly handle: PdfWorkerHandle; readonly kill: ReturnType<typeof vi.fn> } => {
  const listeners: ListenerMap = {};
  const kill = vi.fn(() => true);
  const handle = {
    once(event: keyof ListenerMap, listener: never) {
      listeners[event] = listener;
      return this;
    },
    send(_value: Uint8Array, callback: (error: Error | null) => void) {
      start(listeners);
      callback(null);
      return true;
    },
    kill,
  } as unknown as PdfWorkerHandle;
  return { handle, kill };
};

describe("isolated PDF parser", () => {
  it("부모 비밀 없이 tsx child에서 pdfjs parser를 로드한다", async () => {
    const previous = [process.env.OPENAI_API_KEY, process.env.AI_GATEWAY_API_KEY, process.env.TEST_AUTH_KEY];
    process.env.OPENAI_API_KEY = "must-not-leak";
    process.env.AI_GATEWAY_API_KEY = "must-not-leak";
    process.env.TEST_AUTH_KEY = "must-not-leak";
    try {
      await expect(parsePdfIsolated(new Uint8Array([1, 2, 3]), { timeoutMs: 10_000 }))
        .resolves.toMatchObject({ status: "damaged", pages: [] });
    } finally {
      ["OPENAI_API_KEY", "AI_GATEWAY_API_KEY", "TEST_AUTH_KEY"].forEach((name, index) => {
        if (previous[index] === undefined) delete process.env[name];
        else process.env[name] = previous[index];
      });
    }
  }, 15_000);

  it("wall timeout이면 child를 강제 종료한다", async () => {
    const child = fakeChild(() => undefined);
    await expect(parsePdfIsolated(new Uint8Array([1]), {
      timeoutMs: 5,
      workerFactory: () => child.handle,
    })).rejects.toMatchObject({ code: "timeout" } satisfies Partial<PdfIsolationError>);
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("child error를 안전한 격리 오류로 바꾸고 종료한다", async () => {
    const child = fakeChild((listeners) => queueMicrotask(() => listeners.error?.(new Error("secret"))));
    await expect(parsePdfIsolated(new Uint8Array([1]), {
      workerFactory: () => child.handle,
    })).rejects.toMatchObject({ code: "worker-error" } satisfies Partial<PdfIsolationError>);
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("OOM을 포함한 비정상 child exit를 격리 오류로 바꾼다", async () => {
    const child = fakeChild((listeners) => queueMicrotask(() => listeners.exit?.(134, null)));
    await expect(parsePdfIsolated(new Uint8Array([1]), {
      workerFactory: () => child.handle,
    })).rejects.toMatchObject({ code: "worker-exit" } satisfies Partial<PdfIsolationError>);
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });
});
