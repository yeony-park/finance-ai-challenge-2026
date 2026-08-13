/**
 * 골드셋 — 추출 품질(F1)의 기준 라벨.
 *
 * 규칙 추출 결과를 **선(先)라벨**로 깔고 사람이 검수하는 방식이다(빈 표에서 시작하지 않는다).
 * 검수를 마치지 않은 라벨은 측정에서 제외한다 — 자기 산출물을 정답으로 삼아
 * 점수를 부풀리는 자기채점(self-scoring)을 구조적으로 막기 위해서다.
 */
import { z } from "zod";
import { claimKindSchema } from "../claims/llm-schema";

/**
 * - `pending`   : 선라벨 그대로. **측정에서 제외된다**
 * - `confirmed` : 사람이 원문과 대조해 선라벨이 맞다고 확인
 * - `corrected` : 사람이 값을 고침 (선라벨이 틀렸던 항목)
 * - `not_in_doc`: 원문에 그런 값이 없음 (추출기가 만들어낸 값)
 */
export const reviewStateSchema = z.enum([
  "pending",
  "confirmed",
  "corrected",
  "not_in_doc",
]);

export const goldLabelSchema = z.object({
  subject: z.string().min(1),
  kind: claimKindSchema,
  field: z.string(),
  /** 검수를 마친 정답 값 (정규화된 표기) */
  value: z.string(),
  /** 선라벨 값 — corrected일 때 무엇이 어떻게 틀렸는지 남는다 */
  prelabeledValue: z.string(),
  row: z.number().int().positive(),
  section: z.string(),
  review: reviewStateSchema,
  note: z.string().default(""),
});

export const goldSetSchema = z.object({
  offerId: z.string().min(1),
  rcpNo: z.string().min(1),
  generatedAt: z.string().min(1),
  /** 선라벨을 만든 추출 경로 — 무엇을 기준으로 깔았는지 남긴다 */
  prelabeledBy: z.string().min(1),
  reviewer: z.string().default(""),
  labels: z.array(goldLabelSchema),
});

export type ReviewState = z.infer<typeof reviewStateSchema>;
export type GoldLabel = z.infer<typeof goldLabelSchema>;
export type GoldSet = z.infer<typeof goldSetSchema>;

/**
 * 측정에 쓸 수 있는 라벨인가 — 검수를 마친 것만 정답으로 인정한다.
 * `not_in_doc`은 정답 목록에서 빠지므로, 그 값을 낸 추출은 자동으로 FP(허위 생성)로 잡힌다.
 */
export const isScorable = (label: GoldLabel): boolean =>
  label.review === "confirmed" || label.review === "corrected";

export const labelKey = (label: {
  readonly kind: string;
  readonly subject: string;
}): string => `${label.kind}:${label.subject}`;
