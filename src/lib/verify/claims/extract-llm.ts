/**
 * LLM 기반 claim 추출 — 규칙 추출의 **교차검증 상대**.
 *
 * 설계 제약
 * - 입력은 규칙 파서가 특정한 것과 **같은 표**다. 교차검증의 대상은 "표 선택"이 아니라 "값 해석"이다
 * - 모든 추출값은 문서 좌표(행 번호)를 달고 와야 한다 — 좌표 없는 값은 근거가 될 수 없다
 * - 표에 없는 행 번호를 가리키는 값은 **버린다**(환각 차단) 그리고 그 사실을 note에 남긴다
 * - 정규화는 규칙 파서와 **동일한 zod 게이트**를 쓴다 — 두 경로의 차이가 서식 차이로 위장되지 않게
 * - 추출 실패(네트워크·계약 위반)는 파이프라인을 멈추지 않는다. 그 경우 LLM 근거는 0건이 되고
 *   교차검증은 "규칙 단독 채택" 경로로 흐른다 (사유는 리포트 note에 남는다)
 */
import type { Claim, ClaimKind, DocumentRef } from "../types";
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

/** 한 번의 호출에 싣는 최대 행 수 — 컨텍스트·비용 방어 */
export const MAX_ROWS_PER_REQUEST = 40;

interface FieldRule {
  readonly field: string;
  readonly schema: z.ZodType<string | number>;
  readonly unit?: string;
}

/**
 * claim 종류별 게이트 — 규칙 파서와 같은 스키마를 쓴다.
 * `default` 절이 없다: 새 ClaimKind가 생기면 여기서 컴파일이 깨진다.
 */
const fieldRuleOf = (kind: ClaimKind): FieldRule => {
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
  /** 호출이 한 번이라도 실패했는가 — 교차검증이 채택 규칙을 보수적으로 잡는 데 쓴다 */
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

/** 개체 명세표 → LLM 추출 claim 목록 (규칙 추출과 같은 정규화·같은 좌표계) */
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

  for (const batch of chunk(heads, MAX_ROWS_PER_REQUEST)) {
    const prompt = buildExtractionPrompt(document, selection, batch);
    try {
      const payload = await client.extract(prompt);
      drafts.push(...payload.claims);
    } catch (error: unknown) {
      failed = true;
      notes.push(
        `LLM 추출 호출이 실패해 이 구간(${batch.length}행)은 규칙 추출만으로 진행합니다: ${errorMessage(error)}`,
      );
    }
  }

  const claims: Claim[] = [];
  let outOfRange = 0;
  let subjectMismatch = 0;
  const seen = new Set<string>();

  for (const draft of drafts) {
    const head = knownRows.get(draft.row);
    if (!head) {
      // 프롬프트에 없던 행을 가리키는 값 — 좌표가 없는 주장이므로 채택하지 않는다
      outOfRange += 1;
      continue;
    }
    if (head.subject !== draft.subject) subjectMismatch += 1;

    const key = `${draft.kind}:${draft.subject}`;
    if (seen.has(key)) continue; // 같은 claim을 두 번 말하면 첫 값만 쓴다
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
