import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  ECOS_API_DOCUMENTATION_URL,
  ECOS_BASE_RATE_ITEM_CODE,
  ECOS_BASE_RATE_STATISTIC_CODE,
  ECOS_ROW_LIMIT,
  collectEcosBaseRate,
  ecosCacheFile,
  writeEcosCache,
} from "../ecos-collect";

const responseOf = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const rateRow = (time: string, value: string) => ({
  STAT_CODE: ECOS_BASE_RATE_STATISTIC_CODE,
  ITEM_CODE1: ECOS_BASE_RATE_ITEM_CODE,
  ITEM_NAME1: "한국은행 기준금리",
  TIME: time,
  DATA_VALUE: value,
  UNIT_NAME: "연%",
});

describe("ECOS 기준금리 정제 수집", () => {
  test("기준금리만 정제하고 인증키·요청 URL을 cache에 저장하지 않는다", async () => {
    let requested = "";
    const { cache, calls } = await collectEcosBaseRate({
      apiKey: "test-ecos-secret",
      from: "2024-11-01",
      to: "2024-11-05",
      now: () => new Date("2026-08-23T00:00:00.000Z"),
      fetchImpl: async (input) => {
        requested = String(input);
        return responseOf({
          RESULT: { CODE: "INFO-000" },
          StatisticSearch: { list_total_count: 2, row: [rateRow("20241101", "3.25"), rateRow("20241104", "3.25")] },
        });
      },
    });

    expect(calls).toBe(1);
    expect(requested).toContain("test-ecos-secret");
    expect(requested).toContain(`/${ECOS_BASE_RATE_ITEM_CODE}/`);
    expect(cache).toMatchObject({
      status: "ok",
      sourceUrl: ECOS_API_DOCUMENTATION_URL,
      totalCount: 2,
      collectedCount: 2,
    });
    expect(cache.observations).toContainEqual(
      expect.objectContaining({ observedOn: "2024-11-01", value: 3.25, unit: "percent", itemCode: "0101000" }),
    );
    expect(JSON.stringify(cache)).not.toContain("test-ecos-secret");
    expect(JSON.stringify(cache)).not.toContain("StatisticSearch/test-ecos-secret");
  });

  test("응답 코드·행 수·한도 이상을 failed cache로 보존한다", async () => {
    const error = await collectEcosBaseRate({
      apiKey: "not-written",
      from: "2024-11-01",
      to: "2024-11-05",
      fetchImpl: async () => responseOf({ RESULT: { CODE: "ERROR-300" } }),
    });
    const tooMany = await collectEcosBaseRate({
      apiKey: "not-written",
      from: "2024-11-01",
      to: "2024-11-05",
      fetchImpl: async () => responseOf({
        RESULT: { CODE: "INFO-000" },
        StatisticSearch: { list_total_count: ECOS_ROW_LIMIT + 1, row: [] },
      }),
    });
    const mismatched = await collectEcosBaseRate({
      apiKey: "not-written",
      from: "2024-11-01",
      to: "2024-11-05",
      fetchImpl: async () => responseOf({
        RESULT: { CODE: "INFO-000" },
        StatisticSearch: { list_total_count: 2, row: [rateRow("20241101", "3.25")] },
      }),
    });
    const wrongItemName = await collectEcosBaseRate({
      apiKey: "not-written",
      from: "2024-11-01",
      to: "2024-11-05",
      fetchImpl: async () => responseOf({
        RESULT: { CODE: "INFO-000" },
        StatisticSearch: {
          list_total_count: 1,
          row: [{ ...rateRow("20241101", "3.25"), ITEM_NAME1: "다른 항목" }],
        },
      }),
    });

    expect(error).toMatchObject({ calls: 1, cache: { status: "failed", responseCode: "ERROR-300", observations: [] } });
    expect(tooMany).toMatchObject({ calls: 1, cache: { status: "failed", totalCount: ECOS_ROW_LIMIT + 1, observations: [] } });
    expect(mismatched).toMatchObject({ calls: 1, cache: { status: "failed", totalCount: 2, collectedCount: 1, observations: [] } });
    expect(wrongItemName).toMatchObject({ calls: 1, cache: { status: "failed", reason: "ECOS 항목명이 한국은행 기준금리와 일치하지 않습니다." } });
  });

  test("키가 없으면 호출하지 않고 failed cache를 만들며, 파일에도 키가 없다", async () => {
    const noKey = await collectEcosBaseRate({ from: "2024-11-01", to: "2024-11-05" });
    expect(noKey).toMatchObject({ calls: 0, cache: { status: "failed", reason: "ECOS_API_KEY가 설정되지 않았습니다." } });

    const dir = await mkdtemp(path.join(os.tmpdir(), "ecos-collect-"));
    try {
      const collected = await collectEcosBaseRate({
        apiKey: "cache-secret",
        from: "2024-11-01",
        to: "2024-11-05",
        fetchImpl: async () => responseOf({
          StatisticSearch: { list_total_count: 1, row: [rateRow("20241101", "3.25")] },
        }),
      });
      await writeEcosCache(collected.cache, dir);
      const raw = await readFile(ecosCacheFile(dir), "utf8");
      expect(raw).not.toContain("cache-secret");
      expect(raw).not.toContain("StatisticSearch/cache-secret");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
