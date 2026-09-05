import { z } from "zod";

export const AI_SUMMARY_CATEGORIES = ["real-estate", "cattle", "pig", "art"] as const;
export type AiSummaryCategoryId = (typeof AI_SUMMARY_CATEGORIES)[number];
export const AI_SUMMARY_PROMPT_VERSION = 3 as const;

const EvidencePath = z.string().regex(/^\/(?:[^/~]|~[01])+(?:\/(?:[^/~]|~[01])+)*$/);

export const AiSummaryDraftSchema = z.strictObject({
  claims: z.array(z.strictObject({
    text: z.string().trim().min(6).max(140),
    evidenceIds: z.array(z.string().regex(/^E[1-9]\d*$/)).min(1).max(6),
  })).min(1).max(2),
});

const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

export const AiSummaryDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  promptVersion: z.literal(AI_SUMMARY_PROMPT_VERSION),
  categoryId: z.enum(AI_SUMMARY_CATEGORIES),
  productId: Id,
  scenarioId: Id.optional(),
  dataNature: z.enum(["observed", "scenario"]),
  asOf: z.string().trim().min(1).max(40),
  inputHash: Hash,
  generatedAt: z.string().datetime({ offset: true }),
  generator: z.enum(["llm", "fake"]),
  model: z.string().trim().min(1).max(160),
  sentences: z.array(z.string().trim().min(6).max(140)).min(1).max(2),
  sentenceEvidencePaths: z.array(z.array(EvidencePath).min(1).max(6)).min(1).max(2),
  sentenceEvidenceExcerpts: z.array(z.array(z.string().trim().min(1).max(240)).min(1).max(6)).min(1).max(2).optional(),
  sourceReferences: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
}).refine((document) => document.sentences.length === document.sentenceEvidencePaths.length, {
  message: "문장과 근거 경로 수가 일치해야 합니다.",
  path: ["sentenceEvidencePaths"],
}).refine((document) => !document.sentenceEvidenceExcerpts ||
  document.sentences.length === document.sentenceEvidenceExcerpts.length, {
  message: "문장과 근거 발췌 수가 일치해야 합니다.",
  path: ["sentenceEvidenceExcerpts"],
});

export type AiSummaryDraft = z.infer<typeof AiSummaryDraftSchema>;
export type AiSummaryDocument = z.infer<typeof AiSummaryDocumentSchema>;

export interface AiSummarySource {
  readonly categoryId: AiSummaryCategoryId;
  readonly productId: string;
  readonly scenarioId?: string;
  readonly dataNature: "observed" | "scenario";
  readonly title: string;
  readonly asOf: string;
  readonly digest: Readonly<Record<string, unknown>>;
  readonly requiredAny: readonly (readonly string[])[];
  readonly fallbackSentences: readonly [string] | readonly [string, string];
  readonly sourceReferences: readonly string[];
  readonly inputHash: string;
}

export const parseAiSummaryDocument = (raw: unknown): AiSummaryDocument =>
  AiSummaryDocumentSchema.parse(raw);
