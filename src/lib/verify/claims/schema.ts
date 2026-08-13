import { z } from "zod";

export const traceNo9Schema = z
  .string()
  .trim()
  .regex(/^\d{9}$/, "이력번호는 9자리 숫자여야 합니다");

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
