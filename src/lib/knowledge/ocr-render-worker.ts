import { isIngestionWorkerEnvSafe } from "./isolation-env";
import { renderPdfPagesForOcr } from "./vision-ocr";

if (!process.send) throw new Error("OCR renderer child IPC가 없습니다.");
process.once("message", async (input: { pdf: Uint8Array; pages: number[] }) => {
  try {
    process.send!({
      ok: true,
      value: await renderPdfPagesForOcr(input.pdf, input.pages),
      environmentSafe: isIngestionWorkerEnvSafe(),
    });
  } catch {
    process.send!({ ok: false });
  }
});
