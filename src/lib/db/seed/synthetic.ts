import { createHash } from "node:crypto";

import {
  type ArtAuctionRecordRow,
  type OfferingRow,
  type SourceMeta,
  artAuctionRecordRowSchema,
  offeringRowSchema,
} from "../records";

const GENERATOR_RETRIEVED_AT = "2026-08-29T00:00:00.000Z";

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const syntheticSourceMeta = (ref: string): SourceMeta => ({
  sourceUrl: `synthetic://generator/${ref}`,
  license: "synthetic",
  method: "deterministic-generator",
  retrievedAt: GENERATOR_RETRIEVED_AT,
  sha256: sha256(ref),
});

interface ArtOfferingSeed {
  readonly slug: string;
  readonly title: string;
  readonly amountWon: number;
  readonly opensOn: string;
  readonly closesOn: string;
  readonly artist: string;
  readonly platform: string;
  readonly minimumInvestmentWon: number;
  readonly hasImage: boolean;
}

const ART_OFFERINGS: readonly ArtOfferingSeed[] = [
  {
    slug: "art-1",
    title: "예시 회화 A",
    amountWon: 120_000_000,
    opensOn: "2026-05-04",
    closesOn: "2026-05-12",
    artist: "예시 작가 가",
    platform: "예시 플랫폼 가",
    minimumInvestmentWon: 100_000,
    hasImage: false,
  },
  {
    slug: "art-2",
    title: "예시 회화 B",
    amountWon: 85_000_000,
    opensOn: "2026-06-01",
    closesOn: "2026-06-09",
    artist: "예시 작가 나",
    platform: "예시 플랫폼 나",
    minimumInvestmentWon: 50_000,
    hasImage: false,
  },
  {
    slug: "art-3",
    title: "예시 조각 C",
    amountWon: 47_000_000,
    opensOn: "2026-07-06",
    closesOn: "2026-07-14",
    artist: "예시 작가 다",
    platform: "예시 플랫폼 가",
    minimumInvestmentWon: 50_000,
    hasImage: false,
  },
];

interface RealEstateOfferingSeed {
  readonly slug: string;
  readonly title: string;
  readonly amountWon: number;
  readonly opensOn: string;
  readonly closesOn: string;
  readonly buildingUse: string;
  readonly minimumInvestmentWon: number;
}

const REAL_ESTATE_OFFERINGS: readonly RealEstateOfferingSeed[] = [
  {
    slug: "re-1",
    title: "예시 오피스 A",
    amountWon: 3_800_000_000,
    opensOn: "2026-04-06",
    closesOn: "2026-04-14",
    buildingUse: "상업업무용(사무소)",
    minimumInvestmentWon: 5_000,
  },
  {
    slug: "re-2",
    title: "예시 근린상가 B",
    amountWon: 2_150_000_000,
    opensOn: "2026-05-11",
    closesOn: "2026-05-19",
    buildingUse: "상업업무용(근린생활시설)",
    minimumInvestmentWon: 5_000,
  },
  {
    slug: "re-3",
    title: "예시 물류센터 C",
    amountWon: 6_400_000_000,
    opensOn: "2026-06-15",
    closesOn: "2026-06-23",
    buildingUse: "공업용(창고)",
    minimumInvestmentWon: 10_000,
  },
];

export const syntheticOfferings = (): readonly OfferingRow[] => {
  const art = ART_OFFERINGS.map((seed) =>
    offeringRowSchema.parse({
      offerSlug: seed.slug,
      categoryId: "art",
      provenance: "synthetic",
      titlePublic: seed.title,
      amountWon: seed.amountWon,
      opensOn: seed.opensOn,
      closesOn: seed.closesOn,
      detail: {
        artistName: seed.artist,
        platformName: seed.platform,
        hasImage: seed.hasImage,
        minimumInvestment: seed.minimumInvestmentWon,
        note: "예시 데이터로 구성한 화면입니다.",
      },
      sourceMeta: syntheticSourceMeta(seed.slug),
    }),
  );
  const realEstate = REAL_ESTATE_OFFERINGS.map((seed) =>
    offeringRowSchema.parse({
      offerSlug: seed.slug,
      categoryId: "real-estate",
      provenance: "synthetic",
      titlePublic: seed.title,
      amountWon: seed.amountWon,
      opensOn: seed.opensOn,
      closesOn: seed.closesOn,
      detail: {
        buildingUse: seed.buildingUse,
        minimumInvestment: seed.minimumInvestmentWon,
        note: "예시 데이터로 구성한 화면입니다.",
      },
      sourceMeta: syntheticSourceMeta(seed.slug),
    }),
  );
  return [...art, ...realEstate];
};

interface ArtRecordSeed {
  readonly ref: string;
  readonly title: string;
  readonly date: string;
  readonly house: string;
  readonly priceKrw: number;
  readonly result: ArtAuctionRecordRow["result"];
}

const ART_RECORDS: readonly ArtRecordSeed[] = [
  {
    ref: "art-rec-1",
    title: "예시 회화 A 비교작 1",
    date: "2025-11-18",
    house: "예시 경매사 갑",
    priceKrw: 110_000_000,
    result: "sold",
  },
  {
    ref: "art-rec-2",
    title: "예시 회화 A 비교작 2",
    date: "2026-02-24",
    house: "예시 경매사 을",
    priceKrw: 132_000_000,
    result: "sold",
  },
  {
    ref: "art-rec-3",
    title: "예시 조각 C 비교작 1",
    date: "2026-03-30",
    house: "예시 경매사 갑",
    priceKrw: 51_000_000,
    result: "unsold",
  },
];

export const syntheticArtAuctionRecords = (): readonly ArtAuctionRecordRow[] =>
  ART_RECORDS.map((seed) =>
    artAuctionRecordRowSchema.parse({
      externalRef: sha256(seed.ref),
      provenance: "synthetic",
      artworkTitle: seed.title,
      auctionDate: seed.date,
      auctionHouse: seed.house,
      medium: null,
      widthCm: null,
      heightCm: null,
      currency: "KRW",
      normalizedPriceKrw: seed.priceKrw,
      result: seed.result,
      sourceMeta: syntheticSourceMeta(seed.ref),
    }),
  );
