import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import { directDatabaseUrl, runtimeDatabaseUrl } from "./env";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export class DatabaseNotConfiguredError extends Error {
  readonly name = "DatabaseNotConfiguredError";
  constructor(variable: string) {
    super(
      `${variable}가 설정되지 않았습니다 — DB 경로를 사용할 수 없습니다 (file 모드).`,
    );
  }
}

let runtimeSql: ReturnType<typeof postgres> | undefined;
let directSql: ReturnType<typeof postgres> | undefined;

export const getRuntimeDb = (): Database => {
  const url = runtimeDatabaseUrl();
  if (!url) throw new DatabaseNotConfiguredError("DATABASE_URL");
  if (!runtimeSql) runtimeSql = postgres(url, { prepare: false });
  return drizzle(runtimeSql, { schema });
};

export const getDirectSql = (): ReturnType<typeof postgres> => {
  const url = directDatabaseUrl();
  if (!url) throw new DatabaseNotConfiguredError("DATABASE_URL_DIRECT");
  if (!directSql) directSql = postgres(url, { max: 1 });
  return directSql;
};

export const getDirectDb = (): Database =>
  drizzle(getDirectSql(), { schema });

export const closeConnections = async (): Promise<void> => {
  await Promise.all([
    runtimeSql?.end({ timeout: 5 }),
    directSql?.end({ timeout: 5 }),
  ]);
  runtimeSql = undefined;
  directSql = undefined;
};
