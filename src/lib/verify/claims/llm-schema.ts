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
  row: z.number().int().positive(),
  subject: z.string().min(1),
  kind: claimKindSchema,
  value: z.string(),
});

export const llmExtractionSchema = z.object({
  claims: z.array(llmClaimSchema),
});

export type LlmClaimDraft = z.infer<typeof llmClaimSchema>;
export type LlmExtractionPayload = z.infer<typeof llmExtractionSchema>;
