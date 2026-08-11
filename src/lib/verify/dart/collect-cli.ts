/**
 * 원문 수집 1회용 CLI: `npx tsx --env-file-if-exists=.env src/lib/verify/dart/collect-cli.ts 20260806000159`
 * 성공 시 data/raw/{rcpNo}/ 에 원문 xml 저장. 실패는 그대로 노출한다(가짜 원문 생성 금지).
 */
import { assertRcpNo } from "../paths";
import { collectRawDocument } from "./fetch-document";

const main = async (): Promise<void> => {
  const raw = process.argv[2];
  if (!raw) throw new Error("사용법: collect-cli.ts <rcpNo>");
  // 인자는 곧 파일 경로가 된다 — 최전방에서 형식을 검증한다
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
