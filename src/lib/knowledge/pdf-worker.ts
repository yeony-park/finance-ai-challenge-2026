import { isIngestionWorkerEnvSafe } from "./isolation-env";
import { parsePdf } from "./pdf";

if (!process.send) throw new Error("PDF parser child IPC가 없습니다.");
const send = process.send.bind(process);

process.once("message", async (input: Uint8Array) => {
  try {
    send({ ok: true, value: await parsePdf(input), environmentSafe: isIngestionWorkerEnvSafe() });
  } catch {
    send({ ok: false });
  }
});
