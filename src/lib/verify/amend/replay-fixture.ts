import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertOfferId } from "../paths";
import type { VersionDiff } from "./diff";

const REPLAY_SECTION = "replay";

export interface ReplayDiffArtifact {
  readonly kind: "synthetic-amendment-diff";
  readonly offerId: string;
  readonly generatedAt: string;
  readonly disclosure: string;
  readonly editLabels: readonly string[];
  readonly facts: readonly string[];
  readonly diff: VersionDiff;
}

export const replayDiffDir = (offerId: string, dataDir = "data"): string =>
  path.resolve(dataDir, "public", REPLAY_SECTION, assertOfferId(offerId));

export const replayDiffFileName = (generatedAt: string): string =>
  `diff-${generatedAt.replace(/[:.]/g, "-")}.json`;

export const writeReplayDiff = async (
  artifact: ReplayDiffArtifact,
  dataDir = "data",
): Promise<string> => {
  const dir = replayDiffDir(artifact.offerId, dataDir);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, replayDiffFileName(artifact.generatedAt));
  await writeFile(file, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return file;
};
