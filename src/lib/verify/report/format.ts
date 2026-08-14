const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toKst = (iso: string): Date => new Date(new Date(iso).getTime() + KST_OFFSET_MS);

export const formatIsoDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${year}. ${Number(month)}. ${Number(day)}.`;
};

export const formatIsoDateShort = (isoDate: string): string => {
  const [, month, day] = isoDate.split("-");
  if (!month || !day) return isoDate;
  return `${Number(month)}. ${Number(day)}.`;
};

export const formatYmd8 = (ymd: string): string => {
  if (!/^\d{8}$/.test(ymd)) return ymd;
  return `${ymd.slice(0, 4)}. ${Number(ymd.slice(4, 6))}. ${Number(ymd.slice(6, 8))}.`;
};

export const formatKstDate = (iso: string): string => {
  const date = toKst(iso);
  return `${date.getUTCFullYear()}. ${date.getUTCMonth() + 1}. ${date.getUTCDate()}.`;
};

export const formatKstDateTime = (iso: string): string => {
  const date = toKst(iso);
  return `${formatKstDate(iso)} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
};

export const formatKstShortDate = (iso: string): string => {
  const date = toKst(iso);
  return `${date.getUTCMonth() + 1}. ${date.getUTCDate()}.`;
};

export const formatKstShortDateTime = (iso: string): string => {
  const date = toKst(iso);
  return `${date.getUTCMonth() + 1}. ${date.getUTCDate()}. ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
};

export const formatWon = (value: number): string =>
  `${Math.round(value).toLocaleString("en-US")}원`;
