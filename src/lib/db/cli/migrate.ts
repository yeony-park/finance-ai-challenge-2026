import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { closeConnections, getDirectSql } from "../client";
import { directDatabaseUrl } from "../env";

const MIGRATIONS_DIR = path.resolve("db/migrations");

const migrationFiles = async (): Promise<readonly string[]> => {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter((file) => file.endsWith(".sql")).sort();
};

const main = async (): Promise<void> => {
  if (!directDatabaseUrl()) {
    console.log(
      "[db:migrate] DATABASE_URL_DIRECT 미설정 — not_configured. 마이그레이션을 실행하지 않습니다 (file 모드).",
    );
    return;
  }

  const sql = getDirectSql();
  await sql`CREATE TABLE IF NOT EXISTS _migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`;

  const applied = new Set(
    (await sql<{ filename: string }[]>`SELECT filename FROM _migrations`).map(
      (row) => row.filename,
    ),
  );

  const files = await migrationFiles();
  const pending = files.filter((file) => !applied.has(file));
  if (pending.length === 0) {
    console.log(`[db:migrate] 적용할 마이그레이션 없음 (총 ${files.length}건 반영됨).`);
    return;
  }

  for (const file of pending) {
    const ddl = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(ddl);
      await tx`INSERT INTO _migrations (filename) VALUES (${file})`;
    });
    console.log(`[db:migrate] 적용: ${file}`);
  }
  console.log(`[db:migrate] 완료 — ${pending.length}건 적용.`);
};

main()
  .catch((error: unknown) => {
    console.error(
      `[db:migrate] 실패: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(() => {
    void closeConnections();
  });
