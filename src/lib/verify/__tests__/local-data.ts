/**
 * 로컬 전용 데이터(개인정보 포함 — git 미포함) 가용성 헬퍼.
 * 신규 클론·CI에는 이 파일들이 없으므로, 이를 읽는 스위트는 명시적으로 스킵한다.
 * 무엇이 없는지·어떻게 다시 받는지는 data/MANIFEST.md에 적혀 있다.
 */
import { existsSync } from "node:fs";

export const rawXmlPath = (rcpNo: string): string =>
  `data/raw/${rcpNo}/${rcpNo}.xml`;

export const SNAPSHOT_PATH =
  "data/snapshots/2026-08-10-bankcow9-37head-trace.json";

export const hasLocalFile = (filePath: string): boolean => existsSync(filePath);

/** 스킵 사유 — 스위트 이름에 붙어 실행 로그에 그대로 남는다 */
export const skipReason = (filePath: string): string =>
  `[스킵: 로컬 전용 데이터 ${filePath} 없음 — 재확보 방법은 data/MANIFEST.md 참고]`;
