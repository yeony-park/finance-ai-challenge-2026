import { existsSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  PIG_ASF_DATA,
  PIG_ASF_EVENTS,
  PIG_ASF_SNAPSHOT_ASOF,
} from "@/lib/content/pig-asf";

const SNAPSHOT_DIR = path.join(
  process.cwd(),
  "data",
  "reference",
  "pig-asf",
);

describe("한돈 ASF 정적 맥락 스냅샷", () => {
  test("화면 사건·기준일과 자동 정규화 스냅샷이 일치한다", async () => {
    const snapshot = JSON.parse(
      await readFile(path.join(SNAPSHOT_DIR, "mafra_asf_events.json"), "utf8"),
    ) as {
      readonly asOf: string;
      readonly coverage: { readonly eventCount: number };
      readonly validation: {
        readonly eventCountMatches: boolean;
        readonly coordinateComparison: { readonly matchedCount: number };
      };
      readonly events: typeof PIG_ASF_EVENTS;
    };

    expect(snapshot.asOf).toBe(PIG_ASF_SNAPSHOT_ASOF);
    expect(snapshot.events).toEqual(PIG_ASF_EVENTS);
    expect(snapshot.coverage.eventCount).toBe(79);
    expect(snapshot.validation.eventCountMatches).toBe(true);
    expect(snapshot.validation.coordinateComparison.matchedCount).toBe(79);
  });

  const loadDocuments = async () =>
    JSON.parse(
      await readFile(
        path.join(SNAPSHOT_DIR, "mafra_asf_documents.json"),
        "utf8",
      ),
    ) as {
      readonly postCount: number;
      readonly attachmentCount: number;
      readonly documents: readonly {
        readonly attachments: readonly {
          readonly downloadUrl: string;
          readonly localPath: string;
          readonly bytes: number;
          readonly sha256: string;
        }[];
      }[];
    };

  test("게시물 86건의 출처 메타데이터를 보존한다", async () => {
    const documents = await loadDocuments();

    expect(documents.postCount).toBe(86);
    expect(documents.attachmentCount).toBe(86);
    const attachments = documents.documents.flatMap(
      (document) => document.attachments,
    );
    expect(attachments).toHaveLength(86);
    expect(new Set(attachments.map((attachment) => attachment.localPath)).size).toBe(86);
    expect(attachments.every((attachment) =>
      attachment.localPath.startsWith("data/reference/pig-asf/raw/") &&
      attachment.downloadUrl.startsWith("https://www.mafra.go.kr/") &&
      attachment.bytes > 0 &&
      /^[0-9a-f]{64}$/.test(attachment.sha256)
    )).toBe(true);
  });

  test.skipIf(!existsSync(path.join(SNAPSHOT_DIR, "raw")))(
    "로컬 원문 보유 시 첨부 86건이 전부 실재한다",
    async () => {
      const documents = await loadDocuments();

      await Promise.all(
        documents.documents
          .flatMap((document) => document.attachments)
          .map((attachment) =>
            access(path.join(process.cwd(), attachment.localPath)),
          ),
      );
    },
  );

  test("공개 사건 JSON에는 농장명·농장주·상세주소가 없다", () => {
    const serialized = JSON.stringify(PIG_ASF_DATA.events);

    expect(serialized).not.toMatch(/farmName|farmer|owner|농장명|농장주/iu);
    expect(
      PIG_ASF_EVENTS.every(
        (event) => event.region === `${event.province} ${event.cityCounty}`,
      ),
    ).toBe(true);
    expect(
      PIG_ASF_EVENTS.every(
        (event) =>
          Number.isFinite(event.coordinates.latitude) &&
          Number.isFinite(event.coordinates.longitude),
      ),
    ).toBe(true);
  });
});
