import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildCommonKnowledgeIndex,
  writeCommonKnowledgeIndex,
  type CommonIndexOptions,
} from "./common-index";
import { auditCattleFilingArtifacts } from "./cattle-filing-artifact";
import { auditLegacyPublicData } from "./legacy-audit";

export const runKnowledgeIndex = async (
  dataRoot = path.join(process.cwd(), "data"),
  options: CommonIndexOptions = {},
): Promise<number> => {
  const cattleErrors = await auditCattleFilingArtifacts(dataRoot);
  for (const item of cattleErrors) console.error(`[error] ${item.code} ${item.file}: ${item.message}`);
  if (cattleErrors.length > 0) return 1;
  const legacyErrors = await auditLegacyPublicData(dataRoot);
  for (const item of legacyErrors) console.error(`[error] ${item.code} ${item.file}: ${item.message}`);
  if (legacyErrors.length > 0) {
    console.error("배포는 legacy 공개 감사를 포함하는 `npm run build`만 지원하며 direct `next build` 우회는 지원하지 않습니다.");
    return 1;
  }
  const report = await buildCommonKnowledgeIndex(dataRoot, new Date().toISOString(), options);
  for (const item of report.errors) console.error(`[error] ${item.code} ${item.file}: ${item.message}`);
  for (const item of report.warnings) console.warn(`[warning] ${item.code} ${item.file}: ${item.message}`);
  console.info(
    `knowledge:index products=${report.products} documents=${report.documents} chunks=${report.chunks} pages=${JSON.stringify(report.pages)}`,
  );
  if (report.errors.length > 0) return 1;
  await writeCommonKnowledgeIndex(dataRoot, report.index);
  return 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Supported production builds enter here through npm run build's prebuild hook.
  runKnowledgeIndex().then((code) => {
    process.exitCode = code;
  }).catch(() => {
    console.error("knowledge:index 처리 중 안전한 실패가 발생했습니다. 배포는 `npm run build`만 지원합니다.");
    process.exitCode = 1;
  });
}
