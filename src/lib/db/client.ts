import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import { directDatabaseUrl, runtimeDatabaseUrl } from "./env";
import { RDS_CA_BUNDLE } from "./rds-ca";

// sslmode=require는 서버 인증서를 검증하지 않는다(postgres-js가 rejectUnauthorized=false 설정)
// — 내장 RDS CA 번들 핀닝으로 검증을 강제한다.
const pinnedSsl = (): { readonly rejectUnauthorized: true; readonly ca: string } => ({
  rejectUnauthorized: true,
  ca: RDS_CA_BUNDLE,
});

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
  if (!runtimeSql)
    runtimeSql = postgres(url, {
      prepare: false,
      max: 2,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: pinnedSsl(),
    });
  return drizzle(runtimeSql, { schema });
};

export const getDirectSql = (): ReturnType<typeof postgres> => {
  const url = directDatabaseUrl();
  if (!url) throw new DatabaseNotConfiguredError("DATABASE_URL_DIRECT");
  if (!directSql) directSql = postgres(url, { max: 1, ssl: pinnedSsl() });
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
