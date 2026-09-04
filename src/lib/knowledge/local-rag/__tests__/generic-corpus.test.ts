import { mkdtempSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";

import { loadGenericCorpusDocuments, searchApprovedGenericCorpus } from "../generic-corpus";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("green이면서 외부 AI 허용이 명시된 일반 문서만 semantic corpus에 포함한다", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "generic-corpus-"));
  roots.push(root);
  const directory = path.join(root, "reference/rag");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "fixture.json"), JSON.stringify({
    schemaVersion: 1,
    documents: [
      {
        sourceId: "dart-viewer",
        title: "허용 문서",
        url: "https://dart.fss.or.kr",
        license: "green",
        approvedForExternalAi: true,
        retrievedOn: "2026-09-02",
        chunks: [{ chunkIndex: 0, content: "공개 공시 근거" }],
      },
      {
        sourceId: "opendart-filings",
        title: "명시적 허용이 없는 문서",
        url: "https://opendart.fss.or.kr",
        license: "green",
        retrievedOn: "2026-09-02",
        chunks: [{ chunkIndex: 0, content: "외부 전송 제외" }],
      },
      {
        sourceId: "dart-viewer",
        title: "같은 sourceId의 미승인 과거 문서",
        url: "https://dart.fss.or.kr",
        license: "green",
        approvedForExternalAi: false,
        retrievedOn: "2026-08-01",
        chunks: [{ chunkIndex: 0, content: "미승인 비밀 청크" }],
      },
      {
        sourceId: "livestock-trace",
        title: "yellow 문서",
        url: "https://www.mtrace.go.kr",
        license: "yellow_confirmed",
        approvedForExternalAi: true,
        retrievedOn: "2026-09-02",
        chunks: [{ chunkIndex: 0, content: "외부 전송 제외" }],
      },
    ],
  }), "utf8");

  await expect(loadGenericCorpusDocuments(root)).resolves.toEqual([
    expect.objectContaining({ sourceId: "dart-viewer" }),
  ]);
  await expect(searchApprovedGenericCorpus("미승인 비밀", root)).resolves.toEqual([]);
});
