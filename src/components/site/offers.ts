import type { AssetKind } from "@/lib/verify/types";

export type { AssetKind };

export type SchedulePrecision = "minute" | "day";

export interface OfferEntry {
  readonly id: string;
  readonly title: string;
  readonly assetLabel: string;
  readonly assetKind: AssetKind;
  readonly subscription: {
    readonly opensAt: string;
    readonly closesAt: string;
    readonly precision?: SchedulePrecision;
  };
}

export const OFFERS: readonly OfferEntry[] = [
  {
    id: "livestock-1",
    title: "가축 1호",
    assetLabel: "가축",
    assetKind: "livestock",
    subscription: {
      opensAt: "2024-06-20T00:00:00+09:00",
      closesAt: "2024-07-02T23:59:00+09:00",
      precision: "day",
    },
  },
  {
    id: "livestock-2",
    title: "가축 2호",
    assetLabel: "가축",
    assetKind: "livestock",
    subscription: {
      opensAt: "2024-09-13T00:00:00+09:00",
      closesAt: "2024-10-30T23:59:00+09:00",
      precision: "day",
    },
  },
  {
    id: "livestock-3",
    title: "가축 3호",
    assetLabel: "가축",
    assetKind: "livestock",
    subscription: {
      opensAt: "2024-12-24T00:00:00+09:00",
      closesAt: "2025-01-06T23:59:00+09:00",
      precision: "day",
    },
  },
  {
    id: "livestock-4",
    title: "가축 4호",
    assetLabel: "가축",
    assetKind: "livestock",
    subscription: {
      opensAt: "2025-04-22T00:00:00+09:00",
      closesAt: "2025-05-02T23:59:00+09:00",
      precision: "day",
    },
  },
  {
    id: "livestock-5",
    title: "가축 5호",
    assetLabel: "가축",
    assetKind: "livestock",
    subscription: {
      opensAt: "2025-06-19T00:00:00+09:00",
      closesAt: "2025-07-02T23:59:00+09:00",
      precision: "day",
    },
  },
  {
    id: "livestock-6",
    title: "가축 6호",
    assetLabel: "가축",
    assetKind: "livestock",
    subscription: {
      opensAt: "2025-11-22T00:00:00+09:00",
      closesAt: "2025-12-08T23:59:00+09:00",
      precision: "day",
    },
  },
  {
    id: "livestock-7",
    title: "가축 7호",
    assetLabel: "가축",
    assetKind: "livestock",
    subscription: {
      opensAt: "2026-02-28T10:00:00+09:00",
      closesAt: "2026-03-30T16:00:00+09:00",
    },
  },
  {
    id: "livestock-8",
    title: "가축 8호",
    assetLabel: "가축",
    assetKind: "livestock",
    subscription: {
      opensAt: "2026-04-17T10:00:00+09:00",
      closesAt: "2026-06-10T16:00:00+09:00",
    },
  },
  {
    id: "livestock-9",
    title: "가축 9호",
    assetLabel: "가축",
    assetKind: "livestock",
    subscription: {
      opensAt: "2026-09-08T10:00:00+09:00",
      closesAt: "2026-09-22T16:00:00+09:00",
    },
  },
  {
    id: "real-estate-a",
    title: "부동산 A",
    assetLabel: "부동산",
    assetKind: "real-estate",
    subscription: {
      opensAt: "2021-07-07T00:00:00+09:00",
      closesAt: "2021-07-15T23:59:00+09:00",
      precision: "day",
    },
  },
];

export const PUBLISHED_OFFER_IDS: readonly string[] = OFFERS.map((offer) => offer.id);

export const isPublishedOfferId = (offerId: string): boolean =>
  PUBLISHED_OFFER_IDS.includes(offerId);

export const TOTAL_2026_OFFER_COUNT = 8;

export type SubscriptionPhase = "open" | "closed";

export interface OfferSchedule {
  readonly phase: SubscriptionPhase;
  readonly label: string;
  readonly dday: number | null;
  readonly badge: string;
  readonly closesAt: string;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad2 = (value: number): string => String(value).padStart(2, "0");

const kstDayIndex = (epochMs: number): number =>
  Math.floor((epochMs + KST_OFFSET_MS) / DAY_MS);

export const formatScheduleTime = (iso: string): string => {
  const kst = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  return `${kst.getUTCMonth() + 1}/${kst.getUTCDate()} ${pad2(kst.getUTCHours())}:${pad2(kst.getUTCMinutes())}`;
};

export const formatScheduleDate = (
  iso: string,
  options: { readonly withYear?: boolean } = {},
): string => {
  const kst = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  const md = `${kst.getUTCMonth() + 1}. ${kst.getUTCDate()}.`;
  return options.withYear ? `${kst.getUTCFullYear()}. ${md}` : md;
};

const scheduleLabel = (entry: OfferEntry): string => {
  const { opensAt, closesAt, precision } = entry.subscription;
  if (precision === "day") {
    return `${formatScheduleDate(opensAt, { withYear: true })} ~ ${formatScheduleDate(closesAt)}`;
  }
  return `${formatScheduleTime(opensAt)} ~ ${formatScheduleTime(closesAt)}`;
};

export const buildOfferSchedule = (entry: OfferEntry, now: Date): OfferSchedule => {
  const { opensAt, closesAt } = entry.subscription;
  const label = scheduleLabel(entry);
  const base = { label, closesAt } as const;

  const nowMs = now.getTime();
  const opensMs = new Date(opensAt).getTime();
  const closesMs = new Date(closesAt).getTime();

  if (nowMs > closesMs) {
    return { ...base, phase: "closed", dday: null, badge: "청약 종료" };
  }

  if (nowMs < opensMs) {
    const dday = kstDayIndex(opensMs) - kstDayIndex(nowMs);
    return {
      ...base,
      phase: "open",
      dday,
      badge: dday === 0 ? "청약 D-DAY" : `청약 D-${dday}`,
    };
  }

  const dday = kstDayIndex(closesMs) - kstDayIndex(nowMs);
  return {
    ...base,
    phase: "open",
    dday,
    badge: dday === 0 ? "마감 D-DAY" : `마감 D-${dday}`,
  };
};
