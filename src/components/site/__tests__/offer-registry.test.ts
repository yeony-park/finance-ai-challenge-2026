import { afterEach, describe, expect, test, vi } from "vitest";

import type {
  PublicOffering,
  PublicOfferingsManifest,
} from "@/lib/db/export/public-offering";

import { PUBLISHED_OFFER_IDS } from "../offer-schedule";
import { buildOffersFrom, OFFERS, toOfferEntry } from "../offer-registry";

const findOffer = (id: string) => OFFERS.find((offer) => offer.id === id);

const publicOffering = (
  over: Partial<PublicOffering> & { offerSlug: string },
): PublicOffering => ({
  offerSlug: over.offerSlug,
  categoryId: over.categoryId ?? "cattle",
  assetLabel: over.assetLabel ?? "한우",
  titlePublic: over.titlePublic ?? "제목",
  provenance: over.provenance ?? "manual_verified",
  isExample: over.isExample ?? false,
  amountWon: over.amountWon ?? null,
  minimumInvestment: over.minimumInvestment ?? null,
  subscription: over.subscription ?? {
    opensOn: "2024-06-20",
    closesOn: "2024-07-02",
    precision: "day",
  },
  detail: over.detail ?? {},
});

const manifest = (
  offerings: readonly PublicOffering[],
): PublicOfferingsManifest => ({
  schemaVersion: 2,
  generatedBy: "db:export",
  offerings: [...offerings],
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OFFERS — 공개 인덱스에서 파생한 게시 레지스트리", () => {
  test("게시 공모 10건을 지정된 순서로 파생한다", () => {
    expect(OFFERS).toHaveLength(10);
    expect(OFFERS.map((offer) => offer.id)).toEqual(PUBLISHED_OFFER_IDS);
    expect(OFFERS[0]?.id).toBe("livestock-1");
  });

  test("분 단위 공모(livestock-7)는 detail 시각을 그대로 쓴다", () => {
    const entry = findOffer("livestock-7");
    expect(entry?.subscription.opensAt).toBe("2026-02-28T10:00:00+09:00");
    expect(entry?.subscription.closesAt).toBe("2026-03-30T16:00:00+09:00");
    expect(entry?.subscription.precision).toBe("minute");
    expect(entry?.assetKind).toBe("livestock");
    expect(entry?.assetLabel).toBe("한우");
  });

  test("일 단위 공모(livestock-1)는 청약일을 KST 경계로 넓힌다", () => {
    const entry = findOffer("livestock-1");
    expect(entry?.subscription.opensAt).toBe("2024-06-20T00:00:00+09:00");
    expect(entry?.subscription.closesAt).toBe("2024-07-02T23:59:00+09:00");
    expect(entry?.subscription.precision).toBe("day");
  });

  test("부동산 공모(real-estate-a)는 real-estate 자산·일 단위로 파생한다", () => {
    const entry = findOffer("real-estate-a");
    expect(entry?.assetKind).toBe("real-estate");
    expect(entry?.subscription.precision).toBe("day");
  });
});

describe("buildOffersFrom — 누락·불량 인덱스의 시끄러운 폴백", () => {
  test("게시 id가 하나 빠지면 던지지 않고 짧은 목록을 내며 시끄럽게 로그한다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const full = PUBLISHED_OFFER_IDS.map((id) =>
      publicOffering({
        offerSlug: id,
        categoryId: id.startsWith("real-estate") ? "real-estate" : "cattle",
      }),
    );
    const missingOne = full.filter((offer) => offer.offerSlug !== "livestock-5");

    const result = buildOffersFrom(manifest(missingOne));

    expect(result).toHaveLength(PUBLISHED_OFFER_IDS.length - 1);
    expect(result.map((offer) => offer.id)).not.toContain("livestock-5");
    expect(errorSpy).toHaveBeenCalledWith(
      "[offers] 인덱스에 게시 공모 누락: livestock-5",
    );
  });

  test("빈 인덱스는 던지지 않고 빈 목록을 내며 게시 id마다 로그한다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = buildOffersFrom(manifest([]));

    expect(result).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledTimes(PUBLISHED_OFFER_IDS.length);
  });

  test("게시 공모의 청약일이 null이면 toOfferEntry가 null을 반환하고 로그한다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = publicOffering({
      offerSlug: "livestock-1",
      subscription: { opensOn: null, closesOn: null, precision: "day" },
    });

    expect(toOfferEntry(broken)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      "[offers] 게시 공모 청약일 누락 — 건너뜀: livestock-1",
    );
  });
});
