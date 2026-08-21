import type { ReportSnapshot } from "../report/snapshot";
import type { NarrativeClient } from "./client";
import {
  buildNarrativeUserPrompt,
  buildRetryInstruction,
  NARRATIVE_SYSTEM_PROMPT,
} from "./prompt";
import { toNarrativeLevel, type NarrativeDraft } from "./schema";
import { screenSentences } from "./screen";
import { buildNarrativeDigest, type NarrativeDigest } from "./source";
import { NARRATIVE_LAYERS, type NarrativeDocument, type NarrativeLevel } from "./types";

export interface NarrativeGenerationInput {
  readonly report: ReportSnapshot;
  readonly reportFileName: string;
  readonly versionCount: number;
  readonly client: NarrativeClient;
  readonly now?: Date;
}

export interface NarrativeGenerationResult {
  readonly document: NarrativeDocument;
  readonly digest: NarrativeDigest;
}

interface ScreenedDraft {
  readonly levels: Readonly<Record<"easy" | "pro", NarrativeLevel>>;
  readonly discarded: number;
  readonly violations: readonly string[];
}

const screenDraft = (draft: NarrativeDraft): ScreenedDraft => {
  let discarded = 0;
  const violations: string[] = [];

  const screenLevel = (level: "easy" | "pro"): NarrativeLevel => {
    const raw = toNarrativeLevel(draft[level]);
    const overall = screenSentences(raw.overall);
    discarded += overall.discarded;
    violations.push(...overall.violations);

    const layers = Object.fromEntries(
      NARRATIVE_LAYERS.map((layer) => {
        const screened = screenSentences(raw.layers[layer]);
        discarded += screened.discarded;
        violations.push(...screened.violations);
        return [layer, screened.kept];
      }),
    ) as NarrativeLevel["layers"];

    return { layers, overall: overall.kept };
  };

  const levels = { easy: screenLevel("easy"), pro: screenLevel("pro") };

  return {
    levels,
    discarded,
    violations: [...new Set(violations)].sort(),
  };
};

export const generateNarrative = async ({
  report,
  reportFileName,
  versionCount,
  client,
  now = new Date(),
}: NarrativeGenerationInput): Promise<NarrativeGenerationResult> => {
  const digest = buildNarrativeDigest(report, versionCount);
  const user = buildNarrativeUserPrompt(digest);

  const first = screenDraft(
    await client.generate({ system: NARRATIVE_SYSTEM_PROMPT, user, digest }),
  );

  const retried = first.discarded > 0;
  const screened = retried
    ? screenDraft(
        await client.generate({
          system: NARRATIVE_SYSTEM_PROMPT,
          user: `${user}${buildRetryInstruction(first.violations)}`,
          digest,
        }),
      )
    : first;

  return {
    digest,
    document: {
      offerId: report.offerId,
      rcpNo: report.document.rcpNo,
      reportFileName,
      reportGeneratedAt: report.generatedAt,
      generatedAt: now.toISOString(),
      generator: client.generator,
      model: client.name,
      levels: screened.levels,
      filter: {
        discarded: first.discarded + (retried ? screened.discarded : 0),
        retried,
        violations: [
          ...new Set([...first.violations, ...screened.violations]),
        ].sort(),
      },
    },
  };
};
