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

export const PUBLISHED_OFFER_IDS: readonly string[] = [
  "livestock-1",
  "livestock-2",
  "livestock-3",
  "livestock-4",
  "livestock-5",
  "livestock-6",
  "livestock-7",
  "livestock-8",
  "livestock-9",
  "real-estate-a",
];

export const LISTED_OFFER_IDS: readonly string[] = PUBLISHED_OFFER_IDS;

export const isPublishedOfferId = (offerId: string): boolean =>
  PUBLISHED_OFFER_IDS.includes(offerId);

export const TOTAL_2026_OFFER_COUNT = 8;

/** 공모 목록을 가진 카테고리만 자산 종류를 갖는다(한돈·미술품은 없음). */
export const optionalCategoryAssetKind = (
  categoryId: string,
): AssetKind | null => {
  switch (categoryId) {
    case "cattle":
      return "livestock";
    case "real-estate":
      return "real-estate";
    default:
      return null;
  }
};

export const categoryIdToAssetKind = (categoryId: string): AssetKind => {
  const assetKind = optionalCategoryAssetKind(categoryId);
  if (assetKind === null) {
    throw new Error(`[offers] 매핑 불가 categoryId: ${categoryId}`);
  }
  return assetKind;
};

export const reportHrefForOffer = (
  offer: Pick<OfferEntry, "id" | "assetKind">,
): string => {
  const categoryId =
    offer.assetKind === "livestock" ? "cattle" : "real-estate";
  return `/${categoryId}/products/${encodeURIComponent(offer.id)}`;
};

export const latestOfferEntry = (
  offers: readonly OfferEntry[],
): OfferEntry | null =>
  offers.reduce<OfferEntry | null>(
    (latest, entry) =>
      latest === null ||
      Date.parse(entry.subscription.opensAt) >
        Date.parse(latest.subscription.opensAt)
        ? entry
        : latest,
    null,
  );

export type SubscriptionPhase = "upcoming" | "open" | "closed";

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
      phase: "upcoming",
      dday,
      badge: dday === 0 ? "D-DAY" : `D-${dday}`,
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
