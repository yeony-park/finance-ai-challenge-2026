import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveWithin } from "@/lib/knowledge/loader";

import {
  AI_SUMMARY_CATEGORIES,
  parseAiSummaryDocument,
  type AiSummaryCategoryId,
  type AiSummaryDocument,
  type AiSummarySource,
} from "./schema";
import { buildAiSummarySource } from "./source";
import { attachAiSummaryEvidenceExcerpts, validateAiSummaryDocument } from "./generate";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export const aiSummaryFilePath = (
  categoryId: AiSummaryCategoryId,
  productId: string,
  dataRoot = "data",
): string => {
  if (!AI_SUMMARY_CATEGORIES.includes(categoryId) || !SAFE_ID.test(productId)) {
    throw new Error("허용되지 않은 AI 요약 scope입니다.");
  }
  return resolveWithin(dataRoot, path.join("knowledge", "derived", "ai-summaries", categoryId, `${productId}.json`));
};

export const writeAiSummary = async (
  document: AiSummaryDocument,
  dataRoot = "data",
): Promise<string> => {
  const parsed = parseAiSummaryDocument(document);
  const target = aiSummaryFilePath(parsed.categoryId, parsed.productId, dataRoot);
  const temporary = `${target}.tmp-${process.pid}`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  await rename(temporary, target);
  return target;
};

export const readAiSummary = async (
  categoryId: AiSummaryCategoryId,
  productId: string,
  dataRoot = "data",
): Promise<AiSummaryDocument | null> => {
  const raw = await readFile(aiSummaryFilePath(categoryId, productId, dataRoot), "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  });
  if (raw === null) return null;
  try {
    const document = parseAiSummaryDocument(JSON.parse(raw));
    return document.generator === "llm" &&
      document.categoryId === categoryId &&
      document.productId === productId
      ? document
      : null;
  } catch {
    return null;
  }
};

export const loadAiSummary = async (
  categoryId: AiSummaryCategoryId,
  productId: string,
  dataRoot = "data",
): Promise<AiSummaryDocument | null> => {
  const [source, document] = await Promise.all([
    buildAiSummarySource(categoryId, productId, dataRoot),
    readAiSummary(categoryId, productId, dataRoot),
  ]);
  return source && isAiSummaryFreshForSource(document, source)
    ? attachAiSummaryEvidenceExcerpts(document, source)
    : null;
};

export const isAiSummaryFreshForSource = (
  document: AiSummaryDocument | null,
  source: AiSummarySource,
): document is AiSummaryDocument => document !== null &&
  document.inputHash === source.inputHash &&
  document.dataNature === source.dataNature &&
  document.scenarioId === source.scenarioId &&
  validateAiSummaryDocument(document, source);
