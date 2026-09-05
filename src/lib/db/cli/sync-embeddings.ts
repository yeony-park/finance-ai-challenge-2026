import { closeConnections } from "../client";
import { directDatabaseUrl } from "../env";
import {
  buildEmbeddingSyncPlan,
  writeEmbeddingSyncPlan,
} from "../ingest/embedding-sync";

const main = async (): Promise<void> => {
  const plan = await buildEmbeddingSyncPlan();
  const summary = Object.entries(plan.counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, count]) => `${category} ${count}`)
    .join(" · ");
  if (process.argv.includes("--check")) {
    console.log(`[db:embedding:sync] check 완료 — ${plan.rows.length}개 (${summary})`);
    return;
  }
  if (!directDatabaseUrl()) {
    console.log("[db:embedding:sync] DATABASE_URL_DIRECT 미설정 — not_configured. 적재를 실행하지 않습니다.");
    return;
  }
  const updated = await writeEmbeddingSyncPlan(plan);
  console.log(`[db:embedding:sync] 완료 — ${updated}개 (${summary})`);
};

main()
  .catch((error: unknown) => {
    console.error(
      `[db:embedding:sync] 실패: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(() => {
    void closeConnections();
  });
