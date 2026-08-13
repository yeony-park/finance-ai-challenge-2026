export type AssetKind = "livestock" | "real-estate";

export interface OfferEntry {
  readonly id: string;
  readonly title: string;
  readonly assetLabel: string;
  readonly assetKind: AssetKind;
  readonly subscription: {
    readonly opensAt: string;
    readonly closesAt: string;
  };
}

export const OFFERS: readonly OfferEntry[] = [
  {
    id: "livestock-9",
    title: "가축 9호",
    assetLabel: "가축",
    assetKind: "livestock",
    subscription: {
      opensAt: "2026-08-27T10:00:00+09:00",
      closesAt: "2026-09-10T16:00:00+09:00",
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

export const buildOfferSchedule = (entry: OfferEntry, now: Date): OfferSchedule => {
  const { opensAt, closesAt } = entry.subscription;
  const label = `${formatScheduleTime(opensAt)} ~ ${formatScheduleTime(closesAt)}`;
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
