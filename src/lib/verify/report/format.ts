/**
 * 화면 표기 포맷 — 순수 함수. 로캘 데이터에 의존하지 않도록 직접 조립한다.
 * 시각은 모두 KST(UTC+9)로 환산해 표시한다 — 리포트의 ISO 시각은 UTC다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toKst = (iso: string): Date => new Date(new Date(iso).getTime() + KST_OFFSET_MS);

/** "2026-08-06" → "2026. 8. 6." */
export const formatIsoDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${year}. ${Number(month)}. ${Number(day)}.`;
};

/** "2026-08-06" → "8. 6." */
export const formatIsoDateShort = (isoDate: string): string => {
  const [, month, day] = isoDate.split("-");
  if (!month || !day) return isoDate;
  return `${Number(month)}. ${Number(day)}.`;
};

/** "20260730" → "2026. 7. 30." */
export const formatYmd8 = (ymd: string): string => {
  if (!/^\d{8}$/.test(ymd)) return ymd;
  return `${ymd.slice(0, 4)}. ${Number(ymd.slice(4, 6))}. ${Number(ymd.slice(6, 8))}.`;
};

/** ISO 시각 → "2026. 8. 10." (KST) */
export const formatKstDate = (iso: string): string => {
  const date = toKst(iso);
  return `${date.getUTCFullYear()}. ${date.getUTCMonth() + 1}. ${date.getUTCDate()}.`;
};

/** ISO 시각 → "2026. 8. 10. 01:40" (KST) */
export const formatKstDateTime = (iso: string): string => {
  const date = toKst(iso);
  return `${formatKstDate(iso)} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
};

/** ISO 시각 → "8. 10. 01:40" (KST) */
export const formatKstShortDateTime = (iso: string): string => {
  const date = toKst(iso);
  return `${date.getUTCMonth() + 1}. ${date.getUTCDate()}. ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
};

/** 4719865 → "4,719,865원" */
export const formatWon = (value: number): string =>
  `${Math.round(value).toLocaleString("en-US")}원`;
