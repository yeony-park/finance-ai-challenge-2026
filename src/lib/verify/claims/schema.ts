import { z } from "zod";

const CATTLE_TRACE_PREFIX = "002";

export const traceNo9Schema = z
  .string()
  .trim()
  .regex(/^\d{9,12}$/, "이력번호는 9자리 숫자여야 합니다")
  .refine(
    (raw) =>
      raw.length === 9 ||
      raw.padStart(12, "0").startsWith(CATTLE_TRACE_PREFIX),
    "이력번호를 12자리로 복원해도 소 이력번호 체계(002)와 맞지 않습니다",
  )
  .transform((raw) =>
    raw.length === 9 ? raw : raw.padStart(12, "0").slice(3),
  );

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
  .transform((raw) => raw.replace(/\s+/g, " "))
  .refine((value) => value.length >= 2, "보관장소가 비어 있습니다");

const isoDateSchema = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label}는 YYYY-MM-DD 형식이어야 합니다`);

const wonAmountSchema = (label: string) =>
  z
    .string()
    .trim()
    .transform((raw) => raw.replace(/[,\s원]/g, ""))
    .refine((raw) => /^\d+$/.test(raw), `${label}는 숫자여야 합니다`)
    .transform((raw) => Number.parseInt(raw, 10))
    .refine((value) => value > 0, `${label}는 0보다 커야 합니다`);

export const acquisitionDateSchema = isoDateSchema("취득시기");

export const acquisitionPriceSchema = wonAmountSchema("취득원가");

export const realEstateAddressSchema = z
  .string()
  .trim()
  .min(6, "소재지가 비어 있습니다")
  .regex(
    /(동|가|리)\s*(산\s*)?\d+(-\d+)?$/,
    "소재지는 법정동·지번까지 적혀 있어야 합니다",
  );

export const lawdCdSchema = z
  .string()
  .trim()
  .regex(/^\d{5}$/, "법정동코드(시군구)는 5자리 숫자여야 합니다");

export const offerAmountSchema = wonAmountSchema("공모금액");

export const saleAmountSchema = wonAmountSchema("매각금액");

export const saleDateSchema = isoDateSchema("매각일");

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
