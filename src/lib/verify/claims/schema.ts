/**
 * claim 스키마 v1 — 원문에서 규칙으로 뽑은 원시 문자열을 정규화·검증하는 게이트.
 * 게이트 실패는 파이프라인 중단이 아니라 해당 필드의 "확인 불가" 강등으로 처리한다.
 */
import { z } from "zod";

/** 신고서 기재 이력번호는 9자리 (API 조회 시 002 프리픽스를 붙여 12자리로 변환) */
export const traceNo9Schema = z
  .string()
  .trim()
  .regex(/^\d{9}$/, "이력번호는 9자리 숫자여야 합니다");

/** "한우 송아지" → 품종 "한우" */
export const breedSchema = z
  .string()
  .trim()
  .min(1, "고유명칭이 비어 있습니다")
  .transform((raw) => raw.replace(/\s*송아지\s*/g, "").trim())
  .refine((value) => value.length > 0, "품종을 식별할 수 없습니다");

export const sexSchema = z
  .string()
  .trim()
  .regex(/^(수|암|거세)$/, "성별은 수/암/거세 중 하나여야 합니다");

export const custodyLocationSchema = z
  .string()
  .trim()
  .min(2, "보관장소가 비어 있습니다");

export const acquisitionDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "취득시기는 YYYY-MM-DD 형식이어야 합니다");

/** "4,574,865 " → 4574865 */
export const acquisitionPriceSchema = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[,\s원]/g, ""))
  .refine((raw) => /^\d+$/.test(raw), "취득원가는 숫자여야 합니다")
  .transform((raw) => Number.parseInt(raw, 10))
  .refine((value) => value > 0, "취득원가는 0보다 커야 합니다");

export type GateResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

/** zod 스키마 게이트 — 실패 사유를 사람이 읽을 수 있는 한 줄로 돌려준다. */
export const gate = <T>(
  schema: z.ZodType<T>,
  raw: unknown,
): GateResult<T> => {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const reason =
    parsed.error.issues.map((issue) => issue.message).join("; ") ||
    "스키마 검증 실패";
  return { ok: false, reason };
};
