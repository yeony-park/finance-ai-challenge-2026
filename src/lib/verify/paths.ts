/**
 * 식별자 가드와 데이터 경로 해석 — 파일시스템에 닿는 모든 진입점의 최전방 방어선.
 *
 * 원칙
 * - 외부에서 들어온 식별자(접수번호·공모 ID)는 **허용목록 정규식**을 통과해야만 경로가 된다
 * - 경로는 반드시 기준 디렉토리 아래로 resolve된 것만 사용한다 (`..` 탈출 차단)
 * - 실패는 조용히 넘기지 않고 사람이 읽을 수 있는 예외로 던진다
 */
import path from "node:path";

/** DART 접수번호 — YYYYMMDD + 일련번호 6자리 */
const RCP_NO_PATTERN = /^\d{14}$/;
/** 공모 식별자 — 소문자·숫자·하이픈만 (디렉토리명으로 그대로 쓰인다) */
const OFFER_ID_PATTERN = /^[a-z0-9-]+$/;

export const assertRcpNo = (rcpNo: string): string => {
  if (!RCP_NO_PATTERN.test(rcpNo)) {
    throw new Error(`접수번호 형식이 올바르지 않습니다 (14자리 숫자): ${rcpNo}`);
  }
  return rcpNo;
};

export const assertOfferId = (offerId: string): string => {
  if (!OFFER_ID_PATTERN.test(offerId)) {
    throw new Error(
      `공모 식별자 형식이 올바르지 않습니다 (소문자·숫자·하이픈): ${offerId}`,
    );
  }
  return offerId;
};

/**
 * `{base}/{segment}` 를 만들되 결과가 base 아래인지 확인한다.
 * 정규식 가드를 이미 통과했더라도, 경로 조립 단계에서 한 번 더 검증한다(이중 방어).
 */
const resolveWithin = (base: string, segment: string): string => {
  const baseDir = path.resolve(base);
  const target = path.resolve(baseDir, segment);
  if (target !== path.join(baseDir, segment)) {
    throw new Error(`허용되지 않는 경로입니다: ${segment}`);
  }
  return target;
};

/** data/ 하위 구획 — 저장 정책(로컬 전용 / 커밋 대상)의 물리적 경계 */
export type DataSection = "raw" | "reports" | "public";

/** `{dataDir}/{section}/{offerId}` (절대 경로) */
export const offerDataDir = (
  section: Exclude<DataSection, "raw">,
  offerId: string,
  dataDir = "data",
): string =>
  resolveWithin(path.resolve(dataDir, section), assertOfferId(offerId));

/** `{dataDir}/raw/{rcpNo}` (절대 경로) */
export const rawDataDir = (rcpNo: string, dataDir = "data"): string =>
  resolveWithin(path.resolve(dataDir, "raw"), assertRcpNo(rcpNo));
