import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { ZodType } from "zod";
import {
  CachedAnswerSchema,
  ChunkRecordSchema,
  DocumentRecordSchema,
  ScenarioOfferSchema,
} from "./schema";
import {
  MAX_JSON_INPUT_BYTES,
  MAX_TOTAL_JSON_INPUT_BYTES,
  type IndexIssue,
} from "./common-index";
import { resolveWithin } from "./loader";

interface AuditTarget {
  readonly root: string;
  readonly recursive: boolean;
  readonly schema: ZodType;
  readonly publicStateError: (value: unknown) => string | null;
}

const recordOf = (value: unknown): Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null ? value as Readonly<Record<string, unknown>> : {};

const jsonFiles = async (root: string, recursive: boolean): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true }).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const file = resolveWithin(root, entry.name);
    const stat = await lstat(file);
    if (stat.isSymbolicLink()) {
      throw new Error("배포 대상 legacy JSON 경로에는 심볼릭 링크를 사용할 수 없습니다.");
    }
    if (stat.isDirectory() && recursive) files.push(...await jsonFiles(file, true));
    else if (stat.isFile() && entry.name.endsWith(".json")) files.push(file);
  }
  return files;
};

const issue = (code: string, dataRoot: string, file: string, message: string): IndexIssue => ({
  code,
  file: path.relative(dataRoot, file),
  message,
});

/** Audits every legacy JSON path included by Next output tracing before npm build. */
export const auditLegacyPublicData = async (dataRoot: string): Promise<readonly IndexIssue[]> => {
  const knowledgeRoot = resolveWithin(dataRoot, "knowledge");
  const targets: readonly AuditTarget[] = [
    {
      root: resolveWithin(dataRoot, "scenarios"),
      recursive: true,
      schema: ScenarioOfferSchema,
      publicStateError: (value) => {
        const record = recordOf(value);
        return record.approvedForPublic === true && record.status === "approved"
          ? null
          : "공개 승인된 scenario만 배포할 수 있습니다.";
      },
    },
    {
      root: resolveWithin(knowledgeRoot, "documents"),
      recursive: false,
      schema: DocumentRecordSchema,
      publicStateError: (value) => {
        const record = recordOf(value);
        return record.approvedForPublic === true && ["ready", "partial"].includes(String(record.status))
          ? null
          : "공개 승인되고 사용 가능한 문서만 배포할 수 있습니다.";
      },
    },
    {
      root: resolveWithin(knowledgeRoot, "chunks"),
      recursive: false,
      schema: ChunkRecordSchema,
      publicStateError: (value) => {
        const record = recordOf(value);
        return record.approvedForPublic === true && record.status === "ready"
          ? null
          : "공개 승인되고 ready인 chunk만 배포할 수 있습니다.";
      },
    },
    {
      root: resolveWithin(knowledgeRoot, "cache"),
      recursive: false,
      schema: CachedAnswerSchema,
      publicStateError: (value) => recordOf(value).guardrailStatus === "passed"
        ? null
        : "guardrail을 통과한 cache만 배포할 수 있습니다.",
    },
  ];
  const errors: IndexIssue[] = [];
  let totalBytes = 0;

  for (const target of targets) {
    let files: string[];
    try {
      files = await jsonFiles(target.root, target.recursive);
    } catch (error: unknown) {
      errors.push({
        code: "LEGACY_PATH_ERROR",
        file: path.relative(dataRoot, target.root),
        message: error instanceof Error ? error.message : "legacy JSON 경로를 감사할 수 없습니다.",
      });
      continue;
    }
    for (const file of files) {
      try {
        const stat = await lstat(file);
        if (!stat.isFile() || stat.size > MAX_JSON_INPUT_BYTES) {
          errors.push(issue("LEGACY_JSON_SIZE_LIMIT", dataRoot, file, `JSON 입력은 ${MAX_JSON_INPUT_BYTES}바이트를 초과할 수 없습니다.`));
          continue;
        }
        totalBytes += stat.size;
        if (totalBytes > MAX_TOTAL_JSON_INPUT_BYTES) {
          errors.push(issue("LEGACY_TOTAL_JSON_SIZE_LIMIT", dataRoot, file, `legacy JSON 입력 합계는 ${MAX_TOTAL_JSON_INPUT_BYTES}바이트를 초과할 수 없습니다.`));
          continue;
        }
        const parsed = target.schema.safeParse(JSON.parse(await readFile(file, "utf8")));
        if (!parsed.success) {
          errors.push(issue("INVALID_LEGACY_JSON", dataRoot, file, parsed.error.issues[0]?.message ?? "legacy JSON 스키마 오류"));
          continue;
        }
        const publicStateError = target.publicStateError(parsed.data);
        if (publicStateError) errors.push(issue("LEGACY_NOT_PUBLIC", dataRoot, file, publicStateError));
      } catch {
        errors.push(issue("INVALID_LEGACY_JSON", dataRoot, file, "legacy JSON을 안전하게 읽을 수 없습니다."));
      }
    }
  }
  return errors;
};
