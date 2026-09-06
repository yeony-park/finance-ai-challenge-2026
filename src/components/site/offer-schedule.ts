import type {
  AssetKind,
  RealEstateAssetLifecycle,
  RealEstateTradabilityStatus,
} from "@/lib/verify/types";

export type { AssetKind };

export type SchedulePrecision = "minute" | "day";

export interface OfferEntry {
  readonly id: string;
  readonly title: string;
  readonly assetLabel: string;
  readonly assetKind: AssetKind;
  readonly assetLifecycle?: RealEstateAssetLifecycle;
  readonly isExitVerified?: boolean;
  readonly tradabilityStatus?: RealEstateTradabilityStatus;
  readonly realEstateListingKind?: "development-sample";
  readonly subscription: {
    readonly opensAt: string;
    readonly closesAt: string;
    readonly precision?: SchedulePrecision;
  };
}

export type RealEstateUserGroup =
  | "current-confirmed"
  | "operating-needs-check"
  | "historical-completed"
  | "development-sample";

export interface RealEstateListingStatus {
  readonly tradabilityStatus?: RealEstateTradabilityStatus;
  readonly statusEvidence?: {
    readonly tradabilityStatus?: {
      readonly sourceKind:
        | "platform-claim"
        | "official-document"
        | "external-observation";
      readonly asOf: string;
    };
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

const scheduleLabel = (entry: Pick<OfferEntry, "subscription">): string => {
  const { opensAt, closesAt, precision } = entry.subscription;
  if (precision === "day") {
    return `${formatScheduleDate(opensAt, { withYear: true })} ~ ${formatScheduleDate(closesAt)}`;
  }
  return `${formatScheduleTime(opensAt)} ~ ${formatScheduleTime(closesAt)}`;
};

export const buildOfferSchedule = (entry: Pick<OfferEntry, "subscription">, now: Date): OfferSchedule => {
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

const REAL_ESTATE_CURRENT_EVIDENCE_MAX_AGE_DAYS = 31;

export const classifyRealEstateOffer = (
  offer: OfferEntry,
  now: Date,
  status?: RealEstateListingStatus,
): RealEstateUserGroup => {
  if (offer.assetKind !== "real-estate") {
    throw new Error("부동산 상품만 사용자 그룹을 분류할 수 있습니다");
  }
  if (offer.realEstateListingKind === "development-sample") {
    return "development-sample";
  }
  if (buildOfferSchedule(offer, now).phase === "open") {
    return "current-confirmed";
  }
  if (["sold", "settled"].includes(offer.assetLifecycle ?? "")) {
    return "historical-completed";
  }

  const evidence = status?.statusEvidence?.tradabilityStatus;
  const ageDays = evidence
    ? (Date.parse(now.toISOString().slice(0, 10)) - Date.parse(evidence.asOf)) /
      DAY_MS
    : Number.POSITIVE_INFINITY;
  if (
    (status?.tradabilityStatus ?? offer.tradabilityStatus) === "available" &&
    evidence !== undefined &&
    evidence.sourceKind !== "external-observation" &&
    ageDays >= 0 &&
    ageDays <= REAL_ESTATE_CURRENT_EVIDENCE_MAX_AGE_DAYS
  ) {
    return "current-confirmed";
  }
  return "operating-needs-check";
};

/** 이전 공모 링크를 카테고리 상세로 연결한다. 존재·공개 여부는 상세 라우트에서 확인한다. */
export const productHref = (id: string): string | null => {
  const category = id.startsWith("livestock-") ? "cattle"
    : id.startsWith("pig-") ? "pig"
    : id.startsWith("re-offer-") || id.startsWith("real-estate-") ? "real-estate"
    : null;
  return category ? `/${category}/products/${encodeURIComponent(category === "pig" ? id.replace(/^pig-/, "round-") : id)}` : null;
};
