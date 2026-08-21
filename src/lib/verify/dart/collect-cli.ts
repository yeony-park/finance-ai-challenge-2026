import { assertRcpNo } from "../paths";
import { collectRawDocument } from "./fetch-document";

const main = async (): Promise<void> => {
  const raw = process.argv[2];
  if (!raw) throw new Error("사용법: collect-cli.ts <rcpNo>");
  const rcpNo = assertRcpNo(raw);

  const force = process.argv.includes("--force");
  const result = await collectRawDocument(rcpNo, { force });
  console.log(`수집 완료: ${result.dir}`);
  for (const file of result.files) console.log(`  - ${file}`);
};

main().catch((error: unknown) => {
  console.error(
    "원문 수집 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
