import { realpathSync } from "node:fs";
import path from "node:path";

import { assertNoRealEntityCollision } from "../blocklist";

export const LOCAL_ONLY_DIRS = [
  "data/raw",
  "data/snapshots",
  "data/reports",
  "data/goldset",
  "data/scenarios/real-estate",
] as const;

export class LocalOnlySourceError extends Error {
  readonly name = "LocalOnlySourceError";
  constructor(sourcePath: string, matched: string) {
    super(
      `db:seed 원천 경로가 로컬 전용 디렉터리(${matched})에 속합니다: ${sourcePath} — 즉시 중단 (R-STO-03a·R-STO-04).`,
    );
  }
}

const canonical = (target: string): string => {
  const resolved = path.resolve(target);
  try {
    return realpathSync(resolved).toLowerCase();
  } catch {
    return resolved.toLowerCase();
  }
};

const isWithin = (parent: string, child: string): boolean => {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

export const assertSeedSourcePathAllowed = (sourcePath: string): void => {
  const resolved = canonical(sourcePath);
  for (const dir of LOCAL_ONLY_DIRS) {
    if (isWithin(canonical(dir), resolved)) {
      throw new LocalOnlySourceError(sourcePath, dir);
    }
  }
};

export const assertSeedSourcePathsAllowed = (
  sourcePaths: readonly string[],
): void => {
  for (const sourcePath of sourcePaths) {
    assertSeedSourcePathAllowed(sourcePath);
  }
};

export interface SyntheticNameField {
  readonly field: string;
  readonly value: string;
}

export const assertSyntheticNamesClean = (
  names: readonly SyntheticNameField[],
): void => {
  for (const { field, value } of names) {
    assertNoRealEntityCollision(field, value);
  }
};
