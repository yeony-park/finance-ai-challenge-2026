import { DOCUMENT_PROFILES } from "@/lib/verify/parse/profiles";

import { SYNTHETIC_NAME_PREFIX } from "./provenance";

const CORP_TOKENS: ReadonlySet<string> = new Set([
  "주식회사",
  "㈜",
  "유한회사",
  "유한책임회사",
]);

const issuerTokensOf = (): readonly string[] =>
  DOCUMENT_PROFILES.flatMap((profile) =>
    [...profile.issuer.matchAll(/[가-힣]{2,}|[A-Za-z]{4,}/g)]
      .map((matched) => matched[0])
      .filter((token) => !CORP_TOKENS.has(token)),
  );

export const KNOWN_REAL_PLATFORM_NAMES: readonly string[] = [
  "뱅카우",
  "스탁키퍼",
  "bancow",
  "stockeeper",
  "서울옥션",
  "케이옥션",
  "아트투게더",
  "아트앤가이드",
  "테사",
  "TESSA",
  "열매컴퍼니",
  "소투",
  "카사",
  "kasa",
  "펀블",
  "비브라더스",
  "소유",
];

const ZERO_WIDTH_PATTERN = /[​-‍﻿⁠]/g;

const normalizeForMatch = (value: string): string =>
  value.normalize("NFKC").replace(ZERO_WIDTH_PATTERN, "").toLowerCase();

export const realEntityBlocklist = (): readonly string[] => [
  ...new Set(
    [...issuerTokensOf(), ...KNOWN_REAL_PLATFORM_NAMES].map(normalizeForMatch),
  ),
];

const strippedName = (name: string): string =>
  normalizeForMatch(
    name.startsWith(SYNTHETIC_NAME_PREFIX)
      ? name.slice(SYNTHETIC_NAME_PREFIX.length)
      : name,
  );

export const realEntityCollisionsOf = (
  name: string,
  blocklist: readonly string[] = realEntityBlocklist(),
): readonly string[] => {
  const target = strippedName(name);
  return blocklist.filter((entity) => target.includes(entity));
};

export class RealEntityCollisionError extends Error {
  readonly collisions: readonly string[];
  readonly name = "RealEntityCollisionError";

  constructor(field: string, value: string, collisions: readonly string[]) {
    super(
      `synthetic 명칭 '${value}'(${field})가 실존 개체와 겹칩니다: ${collisions.join(", ")} — 시드 중단 (R-STO-07).`,
    );
    this.collisions = collisions;
  }
};

export const assertNoRealEntityCollision = (
  field: string,
  value: string,
  blocklist: readonly string[] = realEntityBlocklist(),
): void => {
  const collisions = realEntityCollisionsOf(value, blocklist);
  if (collisions.length > 0) {
    throw new RealEntityCollisionError(field, value, collisions);
  }
};
