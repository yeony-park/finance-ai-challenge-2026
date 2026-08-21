import type { Claim, DocumentRef } from "../types";
import {
  acquisitionDateSchema,
  acquisitionPriceSchema,
  breedSchema,
  custodyLocationSchema,
  gate,
  sexSchema,
  traceNo9Schema,
  type GateResult,
} from "./schema";
import {
  claimId,
  selectHeadRows,
  type HeadRow,
  type HeadTableSelection,
} from "./extract-rules";
import { buildExtractionPrompt } from "./llm-prompt";
import type { ClaimExtractionClient } from "./llm-client";
import type { LlmClaimDraft } from "./llm-schema";
import { z } from "zod";

export const MAX_ROWS_PER_REQUEST = 10;

export const CHUNK_RETRY_LIMIT = 1;

interface FieldRule {
  readonly field: string;
  readonly schema: z.ZodType<string | number>;
  readonly unit?: string;
}

const fieldRuleOf = (kind: LlmClaimDraft["kind"]): FieldRule => {
  switch (kind) {
    case "livestock_trace_no":
      return { field: "이력번호", schema: traceNo9Schema };
    case "livestock_breed":
      return { field: "품종", schema: breedSchema };
    case "livestock_sex":
      return { field: "성별", schema: sexSchema };
    case "custody_location":
      return { field: "보관장소", schema: custodyLocationSchema };
    case "acquisition_date":
      return { field: "취득시기", schema: acquisitionDateSchema };
    case "acquisition_price":
      return { field: "취득원가", schema: acquisitionPriceSchema, unit: "원" };
  }
  const unreachable: never = kind;
  throw new Error(`게이트가 없는 claim 종류입니다: ${String(unreachable)}`);
};

export interface LlmExtractionResult {
  readonly claims: readonly Claim[];
  readonly notes: readonly string[];
  readonly clientName: string;
  readonly failed: boolean;
}

const chunk = <T>(items: readonly T[], size: number): readonly (readonly T[])[] => {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
};

const toClaim = (
  draft: LlmClaimDraft,
  gated: GateResult<string | number>,
  document: DocumentRef,
  selection: HeadTableSelection,
): Claim => {
  const rule = fieldRuleOf(draft.kind);
  const value = gated.ok ? String(gated.value) : draft.value.trim();
  const numericValue =
    gated.ok && typeof gated.value === "number" ? gated.value : undefined;

  return {
    id: claimId(draft.kind, draft.subject),
    kind: draft.kind,
    subject: draft.subject,
    field: rule.field,
    value,
    ...(numericValue === undefined ? {} : { numericValue }),
    ...(rule.unit === undefined ? {} : { unit: rule.unit }),
    document,
    location: {
      section:
        selection.source.section.length > 0
          ? selection.source.section
          : selection.profile.sectionFallback,
      table: selection.profile.tableName,
      row: draft.row,
      sectionPath: selection.source.sectionPath,
      charOffset: selection.source.charOffset,
    },
    verifiability: gated.ok ? "verifiable" : "unparsed",
    ...(gated.ok ? {} : { demotionReason: gated.reason }),
    extractedBy: "llm",
  };
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

interface ChunkOutcome {
  readonly drafts: readonly LlmClaimDraft[];
  readonly coveredRows: number;
  readonly error?: string;
}

const coveredRowCount = (
  drafts: readonly LlmClaimDraft[],
  rows: ReadonlySet<number>,
): number =>
  new Set(drafts.filter((draft) => rows.has(draft.row)).map((d) => d.row)).size;

const extractChunk = async (
  client: ClaimExtractionClient,
  prompt: ReturnType<typeof buildExtractionPrompt>,
  batch: readonly HeadRow[],
): Promise<ChunkOutcome> => {
  const rows = new Set(batch.map((head) => head.row));
  let best: ChunkOutcome | undefined;
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= CHUNK_RETRY_LIMIT; attempt += 1) {
    try {
      const payload = await client.extract(prompt);
      const coveredRows = coveredRowCount(payload.claims, rows);
      const outcome: ChunkOutcome = { drafts: payload.claims, coveredRows };
      if (coveredRows >= rows.size) return outcome;
      if (!best || coveredRows > best.coveredRows) best = outcome;
    } catch (error: unknown) {
      lastError = errorMessage(error);
    }
  }

  return best ?? { drafts: [], coveredRows: 0, error: lastError ?? "알 수 없는 오류" };
};

export const extractClaimsWithLlm = async (
  selection: HeadTableSelection,
  document: DocumentRef,
  client: ClaimExtractionClient,
): Promise<LlmExtractionResult> => {
  const heads = selectHeadRows(selection);
  const knownRows = new Map<number, HeadRow>(
    heads.map((head) => [head.row, head]),
  );

  const notes: string[] = [];
  const drafts: LlmClaimDraft[] = [];
  let failed = false;
  let uncoveredRows = 0;

  for (const batch of chunk(heads, MAX_ROWS_PER_REQUEST)) {
    const prompt = buildExtractionPrompt(document, selection, batch);
    const outcome = await extractChunk(client, prompt, batch);

    if (outcome.error !== undefined) {
      failed = true;
      notes.push(
        `LLM 추출 호출이 실패해 이 구간(${batch.length}행)은 규칙 추출만으로 진행합니다: ${outcome.error}`,
      );
      continue;
    }

    drafts.push(...outcome.drafts);
    uncoveredRows += batch.length - outcome.coveredRows;
  }

  if (uncoveredRows > 0) {
    notes.push(
      `LLM 응답이 개체 행 ${uncoveredRows}건을 다루지 않아(재시도 1회 후에도) 그 행은 규칙 단독으로 진행합니다.`,
    );
  }

  const claims: Claim[] = [];
  let outOfRange = 0;
  let subjectMismatch = 0;
  const seen = new Set<string>();

  for (const draft of drafts) {
    const head = knownRows.get(draft.row);
    if (!head) {
      outOfRange += 1;
      continue;
    }
    if (head.subject !== draft.subject) subjectMismatch += 1;

    const key = `${draft.kind}:${draft.subject}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const rule = fieldRuleOf(draft.kind);
    claims.push(
      toClaim(draft, gate(rule.schema, draft.value), document, selection),
    );
  }

  if (outOfRange > 0) {
    notes.push(
      `LLM 추출값 ${outOfRange}건은 표에 없는 행 번호를 가리켜 채택하지 않았습니다(문서 좌표 미확인).`,
    );
  }
  if (subjectMismatch > 0) {
    notes.push(
      `LLM 추출값 ${subjectMismatch}건은 같은 행에 대해 규칙 파서와 다른 개체 라벨을 붙였습니다 — 교차검증에서 단독 추출로 처리됩니다.`,
    );
  }

  return { claims, notes, clientName: client.name, failed };
};
