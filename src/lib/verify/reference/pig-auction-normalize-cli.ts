import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildPigAuctionRows } from "@/lib/db/ingest/build";
import { loadManifestIndex } from "@/lib/db/ingest/manifest";

import {
  PIG_AUCTION_CACHE_SUBDIR,
  PIG_AUCTION_SOURCE_ID,
} from "../adapters/pig-auction-price";

const main = async (): Promise<void> => {
  const dataDir = "data";
  const rows = await buildPigAuctionRows(dataDir, await loadManifestIndex(dataDir));
  if (rows.length === 0) {
    throw new Error("정규화할 돼지 경락가 관측값이 없습니다.");
  }

  const outputDir = path.join(dataDir, PIG_AUCTION_CACHE_SUBDIR, "normalized");
  await mkdir(outputDir, { recursive: true });
  for (const month of [...new Set(rows.map((row) => row.month))].sort()) {
    const entries = rows.filter((row) => row.month === month);
    const snapshot = {
      schemaVersion: 1,
      sourceId: PIG_AUCTION_SOURCE_ID,
      month,
      dataNature: "observed",
      validationStatus: "source_hash_and_schema_checked",
      entries,
    };
    const file = path.join(outputDir, `${month}.json`);
    await writeFile(file, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    console.log(`${file} — ${entries.length}행`);
  }
  console.log(`정규화 완료: 총 ${rows.length}행`);
};

main().catch((error: unknown) => {
  console.error(
    "돼지 경락가 정규화 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
