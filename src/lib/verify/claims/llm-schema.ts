/**
 * LLM 추출 응답 계약 (구조화 출력).
 * 스파인의 `LlmDraft`가 "출처 없으면 abstain"을 강제하듯, 여기서는
 * **문서 좌표(row) 없는 추출값을 애초에 만들 수 없게** 스키마로 강제한다.
 */
import { z } from "zod";

export const claimKindSchema = z.enum([
  "livestock_trace_no",
  "livestock_breed",
  "livestock_sex",
  "custody_location",
  "acquisition_date",
  "acquisition_price",
]);

export const llmClaimSchema = z.object({
  /** 프롬프트에 제시된 원문 행 번호 — 문서 좌표 보존 요구 */
  row: z.number().int().positive(),
  /** 개체 식별 라벨 (예: "학산 1호") */
  subject: z.string().min(1),
  kind: claimKindSchema,
  /** 원문 표기 그대로. 정규화는 규칙 파서와 같은 zod 게이트가 담당한다 */
  value: z.string(),
});

export const llmExtractionSchema = z.object({
  claims: z.array(llmClaimSchema),
});

export type LlmClaimDraft = z.infer<typeof llmClaimSchema>;
export type LlmExtractionPayload = z.infer<typeof llmExtractionSchema>;
