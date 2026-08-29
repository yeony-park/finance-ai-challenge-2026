import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CategoryId } from "@/lib/verify/contract/category";

import { closeConnections } from "../client";
import { directDatabaseUrl } from "../env";
import { toPublicOfferingsManifest } from "../export/public-offering";
import { createDbOfferingsRepository } from "../repositories/offerings-db";
import type { Offering } from "../repositories/types";

const CATEGORIES: readonly CategoryId[] = [
  "cattle",
  "pig",
  "art",
  "real-estate",
];

const OUTPUT_PATH = "data/public/offerings/index.json";

const main = async (): Promise<void> => {
  if (!directDatabaseUrl()) {
    console.log(
      "[db:export] DATABASE_URL_DIRECT 미설정 — not_configured. 내보내기를 실행하지 않습니다 (file 모드).",
    );
    return;
  }

  const repository = createDbOfferingsRepository();
  const collected: Offering[] = [];
  for (const category of CATEGORIES) {
    collected.push(...(await repository.listByCategory(category)));
  }

  const manifest = toPublicOfferingsManifest(collected);
  const outFile = path.resolve(OUTPUT_PATH);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(
    `[db:export] 완료 — ${manifest.offerings.length}건 마스킹 후 ${OUTPUT_PATH}에 기록 (익명화 게이트 대상).`,
  );
};

main()
  .catch((error: unknown) => {
    console.error(
      `[db:export] 실패: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(() => {
    void closeConnections();
  });
