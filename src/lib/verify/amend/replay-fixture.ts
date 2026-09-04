import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { isPublicVerificationDocumentAllowed } from "../dart/onboarding-catalog";
import { assertOfferId } from "../paths";
import type { VersionDiff } from "./diff";

const REPLAY_SECTION = "replay";

export interface ReplayDiffCommon {
  readonly offerId: string;
  readonly generatedAt: string;
  readonly disclosure: string;
  readonly facts: readonly string[];
  readonly diff: VersionDiff;
}

export interface SyntheticReplayDiffArtifact extends ReplayDiffCommon {
  readonly kind: "synthetic-amendment-diff";
  readonly editLabels: readonly string[];
}

export type FilingRole = "base" | "amendment";

export interface CorrectionDetailRecord {
  readonly label: string;
  readonly isOrderRelated: boolean;
  readonly before: string;
  readonly after: string;
  readonly isExcerpt: boolean;
}

export interface ReplayFilingRecord {
  readonly rcpNo: string;
  readonly receivedOn: string;
  readonly role: FilingRole;
  readonly reportLabel: string;
  readonly isRechecked: boolean;
  readonly correctionReason: string;
  readonly correctionItems: readonly string[];
  readonly correctionDetails?: readonly CorrectionDetailRecord[];
  readonly correctionNotes: readonly string[];
}

export interface ActualReplayDiffArtifact extends ReplayDiffCommon {
  readonly kind: "actual-amendment-diff";
  readonly sourceName: string;
  readonly filings: readonly ReplayFilingRecord[];
}

export type ReplayDiffArtifact =
  | SyntheticReplayDiffArtifact
  | ActualReplayDiffArtifact;

export const replayDiffDir = (offerId: string, dataDir = "data"): string =>
  path.resolve(dataDir, "public", REPLAY_SECTION, assertOfferId(offerId));

export const replayDiffFileName = (generatedAt: string): string =>
  `diff-${generatedAt.replace(/[:.]/g, "-")}.json`;

export const writeReplayDiff = async (
  artifact: ReplayDiffArtifact,
  dataDir = "data",
): Promise<string> => {
  if (
    artifact.diff.to.offerId !== artifact.offerId ||
    !isPublicVerificationDocumentAllowed(
      artifact.offerId,
      artifact.diff.to.rcpNo,
    )
  ) {
    throw new Error("공개 정정 자료는 승인된 active RCP 결과만 저장할 수 있습니다.");
  }
  const dir = replayDiffDir(artifact.offerId, dataDir);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, replayDiffFileName(artifact.generatedAt));
  await writeFile(file, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return file;
};
