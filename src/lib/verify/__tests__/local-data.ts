import { existsSync } from "node:fs";

export const rawXmlPath = (rcpNo: string): string =>
  `data/raw/${rcpNo}/${rcpNo}.xml`;

export const SNAPSHOT_PATH =
  "data/snapshots/2026-08-10-bankcow9-37head-trace.json";

export const hasLocalFile = (filePath: string): boolean => existsSync(filePath);

export const skipReason = (filePath: string): string =>
  `[스킵: 로컬 전용 데이터 ${filePath} 없음 — 재확보 방법은 data/MANIFEST.md 참고]`;
