const ISSUER_KEY_BY_OFFER: Readonly<Record<string, string>> = {
  "livestock-7": "issuer-a",
  "livestock-8": "issuer-a",
  "livestock-9": "issuer-a",
};

export const issuerKeyForOffer = (offerId: string): string | undefined =>
  ISSUER_KEY_BY_OFFER[offerId];

export const offerIdsForIssuer = (issuerKey: string): readonly string[] =>
  Object.keys(ISSUER_KEY_BY_OFFER).filter(
    (offerId) => ISSUER_KEY_BY_OFFER[offerId] === issuerKey,
  );

export const trackedIssuerKeys: readonly string[] = [
  ...new Set(Object.values(ISSUER_KEY_BY_OFFER)),
];
