import { defineConfig } from "drizzle-kit";

// 마이그레이션 정본은 수기 SQL(db/migrations/) + 자체 러너(src/lib/db/cli/migrate.ts).
// drizzle-kit은 generate로 스키마↔마이그레이션 드리프트 대조(spike) 전용이며, 정본 디렉터리를
// 덮지 않도록 out을 분리한다(db/generated/ 스크래치 — .gitignore·.vercelignore 제외 대상).
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./db/generated",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT ?? "",
  },
  strict: true,
  verbose: true,
});
