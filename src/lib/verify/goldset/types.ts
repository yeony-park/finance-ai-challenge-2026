import { z } from "zod";
import { claimKindSchema } from "../claims/llm-schema";

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
  value: z.string(),
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
  prelabeledBy: z.string().min(1),
  reviewer: z.string().default(""),
  labels: z.array(goldLabelSchema),
});

export type ReviewState = z.infer<typeof reviewStateSchema>;
export type GoldLabel = z.infer<typeof goldLabelSchema>;
export type GoldSet = z.infer<typeof goldSetSchema>;

export const isScorable = (label: GoldLabel): boolean =>
  label.review === "confirmed" || label.review === "corrected";

export const labelKey = (label: {
  readonly kind: string;
  readonly subject: string;
}): string => `${label.kind}:${label.subject}`;
