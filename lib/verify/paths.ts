import path from "node:path";

const RCP_NO_PATTERN = /^\d{14}$/;
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

const resolveWithin = (base: string, segment: string): string => {
  const baseDir = path.resolve(base);
  const target = path.resolve(baseDir, segment);
  if (target !== path.join(baseDir, segment)) {
    throw new Error(`허용되지 않는 경로입니다: ${segment}`);
  }
  return target;
};

export type DataSection = "raw" | "reports" | "public" | "goldset";

export const offerDataDir = (
  section: Exclude<DataSection, "raw">,
  offerId: string,
  dataDir = "data",
): string =>
  resolveWithin(path.resolve(dataDir, section), assertOfferId(offerId));

export const rawDataDir = (rcpNo: string, dataDir = "data"): string =>
  resolveWithin(path.resolve(dataDir, "raw"), assertRcpNo(rcpNo));
