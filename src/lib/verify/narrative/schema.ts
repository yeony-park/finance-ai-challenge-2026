import { z } from "zod";
import {
  NARRATIVE_TAGS,
  type NarrativeDocument,
  type NarrativeLevel,
} from "./types";

const MAX_SENTENCE_LENGTH = 220;
const MIN_SENTENCE_LENGTH = 6;
const MAX_SENTENCES_PER_GROUP = 3;

export const narrativeSentenceSchema = z.object({
  tag: z.enum(NARRATIVE_TAGS),
  text: z.string().min(MIN_SENTENCE_LENGTH).max(MAX_SENTENCE_LENGTH),
});

const groupSchema = z
  .array(narrativeSentenceSchema)
  .min(1)
  .max(MAX_SENTENCES_PER_GROUP);

export const narrativeLevelDraftSchema = z.object({
  reality: groupSchema,
  price: groupSchema,
  history: groupSchema,
  overall: groupSchema,
  overallClosing: z.string().min(MIN_SENTENCE_LENGTH).max(MAX_SENTENCE_LENGTH),
});

export const narrativeDraftSchema = z.object({
  easy: narrativeLevelDraftSchema,
  pro: narrativeLevelDraftSchema,
});

export type NarrativeLevelDraft = z.infer<typeof narrativeLevelDraftSchema>;
export type NarrativeDraft = z.infer<typeof narrativeDraftSchema>;

const storedGroupSchema = z.array(narrativeSentenceSchema);

const storedLevelSchema = z.object({
  layers: z.object({
    reality: storedGroupSchema,
    price: storedGroupSchema,
    history: storedGroupSchema,
  }),
  overall: storedGroupSchema,
});

const narrativeDocumentSchema = z.object({
  offerId: z.string().min(1),
  rcpNo: z.string(),
  reportFileName: z.string().min(1),
  reportGeneratedAt: z.string().min(1),
  generatedAt: z.string().min(1),
  generator: z.enum(["llm", "fake"]),
  model: z.string().min(1),
  levels: z.object({ easy: storedLevelSchema, pro: storedLevelSchema }),
  filter: z.object({
    discarded: z.number().int().min(0),
    retried: z.boolean(),
    violations: z.array(z.string()),
  }),
});

export const toNarrativeLevel = (draft: NarrativeLevelDraft): NarrativeLevel => ({
  layers: { reality: draft.reality, price: draft.price, history: draft.history },
  overall: [...draft.overall, { tag: "ai", text: draft.overallClosing }],
});

export const parseNarrativeDocument = (raw: unknown): NarrativeDocument => {
  const parsed = narrativeDocumentSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`서술 캐시 형식이 올바르지 않습니다 — ${reason}`);
  }
  return parsed.data satisfies NarrativeDocument;
};
