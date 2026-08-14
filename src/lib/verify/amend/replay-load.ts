import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { assertOfferId } from "../paths";
import type { ReplayDiffArtifact } from "./replay-fixture";

const REPLAY_SECTION = "replay";

const REPLAY_FILE_PATTERN = /^diff-.*\.json$/;

const verdictSchema = z.enum(["match", "mismatch", "unverifiable"]);

const shiftSchema = z.enum([
  "maintained",
  "changed",
  "added",
  "removed",
  "unknown",
  "not_judged",
]);

const documentSchema = z.object({
  offerId: z.string(),
  rcpNo: z.string(),
  submittedOn: z.string(),
});

const changeRowSchema = z.object({
  changeKind: z.enum(["added", "removed", "changed"]),
  claimId: z.string(),
  subject: z.string(),
  field: z.string(),
  before: z.string().optional(),
  after: z.string().optional(),
  verdictBefore: verdictSchema.optional(),
  verdictAfter: verdictSchema.optional(),
  verdictShift: shiftSchema,
});

const shiftRowSchema = z.object({
  claimId: z.string(),
  subject: z.string(),
  field: z.string(),
  before: verdictSchema.optional(),
  after: verdictSchema.optional(),
  shift: shiftSchema,
});

const diffSchema = z.object({
  from: documentSchema,
  to: documentSchema,
  changedClaims: z.array(changeRowSchema),
  verdictChanges: z.array(shiftRowSchema),
  summary: z.object({
    changedClaims: z.number(),
    verdictMaintained: z.number(),
    verdictChanged: z.number(),
    verdictUnknown: z.number(),
    notJudged: z.number(),
  }),
  notes: z.array(z.string()),
});

const commonShape = {
  offerId: z.string(),
  generatedAt: z.string(),
  disclosure: z.string(),
  facts: z.array(z.string()),
  diff: diffSchema,
};

const filingSchema = z.object({
  rcpNo: z.string(),
  receivedOn: z.string(),
  role: z.enum(["base", "amendment"]),
  reportLabel: z.string(),
  isRechecked: z.boolean(),
  correctionReason: z.string(),
  correctionItems: z.array(z.string()),
  correctionNotes: z.array(z.string()),
});

const replayDiffSchema = z.discriminatedUnion("kind", [
  z.object({
    ...commonShape,
    kind: z.literal("synthetic-amendment-diff"),
    editLabels: z.array(z.string()),
  }),
  z.object({
    ...commonShape,
    kind: z.literal("actual-amendment-diff"),
    sourceName: z.string(),
    filings: z.array(filingSchema),
  }),
]);

export const parseReplayDiff = (raw: unknown): ReplayDiffArtifact => {
  const parsed = replayDiffSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`정정 리플레이 자료 형식이 올바르지 않습니다 — ${reason}`);
  }
  return parsed.data;
};

export const loadLatestReplayDiff = async (
  offerId: string,
  dataDir = "data",
): Promise<ReplayDiffArtifact | undefined> => {
  const dir = path.resolve(
    process.cwd(),
    dataDir,
    "public",
    REPLAY_SECTION,
    assertOfferId(offerId),
  );

  let files: readonly string[];
  try {
    files = await readdir(dir);
  } catch {
    return undefined;
  }

  const fileName = files
    .filter((file) => REPLAY_FILE_PATTERN.test(file))
    .sort()
    .at(-1);
  if (!fileName) return undefined;

  return parseReplayDiff(JSON.parse(await readFile(path.join(dir, fileName), "utf8")));
};
