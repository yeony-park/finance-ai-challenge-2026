import {
  SEX_CODES,
  BREED_CODES,
  THIN_SAMPLE_THRESHOLD,
  auctionQueryUrl,
  type AuctionPriceAdapter,
  type AuctionPriceReference,
} from "../adapters/auction-price";
import type {
  Claim,
  Evidence,
  Judgement,
  PricePlacement,
  UnjudgedClaim,
} from "../types";

export const referenceMonthOf = (isoDate: string): string | undefined => {
  const matched = isoDate.match(/^(\d{4})-(\d{2})/);
  return matched ? `${matched[1]}-${matched[2]}` : undefined;
};

const percent = (value: number, base: number): number =>
  Math.round(((value - base) / base) * 1000) / 10;

const won = (value: number): string => `${value.toLocaleString("ko-KR")}원`;

const signed = (value: number): string =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

interface PriceInput {
  readonly priceClaim: Claim;
  readonly reference: AuctionPriceReference;
  readonly windowMonths: readonly string[];
  readonly windowAveragePricePerKg?: number;
}

const toEvidence = (
  input: PriceInput,
  adapter: AuctionPriceAdapter,
): Evidence => {
  const { reference } = input;
  const breedCd = BREED_CODES[reference.breedName] ?? "";
  const sexCd = SEX_CODES[reference.sexName] ?? "";
  return {
    sourceId: adapter.sourceId,
    sourceName: adapter.sourceName,
    url: auctionQueryUrl({
      startYmd: reference.startYmd,
      endYmd: reference.endYmd,
      breedCd,
      sexCd,
      qgradeYn: "Y",
      defectIncludeYn: "N",
    }),
    observedAt: reference.collectedAt,
    field: input.priceClaim.field,
    claimed: won(input.priceClaim.numericValue ?? 0),
    observed: `${reference.month} ${reference.breedName} ${reference.sexName} 소도체 전국 평균 경락가 ${reference.averagePricePerKg.toLocaleString("ko-KR")}원/kg (등급판정 ${reference.sampleSize.toLocaleString("ko-KR")}두)`,
    stance: "context",
    note: `${reference.startYmd}~${reference.endYmd} 집계${reference.partial ? " · 진행 중인 달의 부분 집계" : ""}${reference.sampleSize < THIN_SAMPLE_THRESHOLD ? ` · 모수 ${reference.sampleSize}두로 얇음` : ""}`,
  };
};

const statementOf = (
  placement: Omit<PricePlacement, "statement" | "evidence">,
): string => {
  const parts = [
    `신고서 기재 취득원가 ${won(placement.claimedPerHead)}`,
    `기준 월 ${placement.referenceMonth} ${placement.breedName} ${placement.sexName} 소도체 전국 평균 경락가 ${placement.averagePricePerKg.toLocaleString("ko-KR")}원/kg(등급판정 ${placement.sampleSize.toLocaleString("ko-KR")}두)`,
  ];
  if (placement.monthVsWindowPercent !== undefined) {
    parts.push(
      `기준 월 평균가는 수집 구간(${placement.windowMonths[0]}~${placement.windowMonths.at(-1)}) 월평균의 단순평균 대비 ${signed(placement.monthVsWindowPercent)}`,
    );
  }
  parts.push(
    `이 개체 취득원가는 같은 공모의 대조 가능 개체 평균 ${won(placement.offerAveragePerHead)} 대비 ${signed(placement.vsOfferAveragePercent)}`,
  );
  if (placement.thinSample) {
    parts.push(
      `참조 모수가 ${placement.sampleSize}두로 얇아 평균가가 소수 개체에 좌우될 수 있음`,
    );
  }
  return `${parts.join(" · ")}. 이 표시는 위치이며 적정성 판단이 아닙니다.`;
};

export interface PriceLayerInput {
  readonly claims: readonly Claim[];
  readonly priceClaims: readonly Claim[];
  readonly judgements: readonly Judgement[];
  readonly auction: AuctionPriceAdapter | undefined;
}

export interface PriceLayerOutcome {
  readonly placements: readonly PricePlacement[];
  readonly unplaced: readonly UnjudgedClaim[];
}

const valueOfKind = (
  claims: readonly Claim[],
  subject: string,
  kind: Claim["kind"],
): Claim | undefined =>
  claims.find((claim) => claim.subject === subject && claim.kind === kind);

const confirmedAcquisitionDate = (
  judgements: readonly Judgement[],
  subject: string,
): Judgement | undefined =>
  judgements.find(
    (judgement) =>
      judgement.claim.subject === subject &&
      judgement.claim.kind === "acquisition_date" &&
      judgement.verdict === "match",
  );

const monthReason = (
  claims: readonly Claim[],
  judgements: readonly Judgement[],
  subject: string,
): string | undefined => {
  const dateClaim = valueOfKind(claims, subject, "acquisition_date");
  if (!dateClaim) {
    return "취득시기가 신고서에서 확인되지 않아 대조할 기준 월을 정할 수 없습니다(대조 불가).";
  }
  if (!confirmedAcquisitionDate(judgements, subject)) {
    return `취득시기(${dateClaim.value})가 공적 원장으로 확인되지 않아 기준 월을 확정할 수 없습니다(대조 불가).`;
  }
  return undefined;
};

interface Candidate {
  readonly claim: Claim;
  readonly reference: AuctionPriceReference;
}

export const placePrices = (input: PriceLayerInput): PriceLayerOutcome => {
  const priceClaims = input.priceClaims;
  if (priceClaims.length === 0) return { placements: [], unplaced: [] };

  const adapter = input.auction;
  if (!adapter) {
    return {
      placements: [],
      unplaced: priceClaims.map((claim) => ({
        claim,
        reason:
          "경락가 참조 데이터가 연결되지 않아 시장 위치를 제시할 수 없습니다(대조 불가).",
      })),
    };
  }

  const candidates: Candidate[] = [];
  const unplaced: UnjudgedClaim[] = [];

  for (const claim of priceClaims) {
    const perHead = claim.numericValue;
    if (perHead === undefined || perHead <= 0) {
      unplaced.push({
        claim,
        reason: "취득원가를 금액으로 읽지 못해 시장 위치를 제시할 수 없습니다(대조 불가).",
      });
      continue;
    }

    const blocked = monthReason(input.claims, input.judgements, claim.subject);
    if (blocked) {
      unplaced.push({ claim, reason: blocked });
      continue;
    }

    const dateClaim = valueOfKind(input.claims, claim.subject, "acquisition_date");
    const month = referenceMonthOf(dateClaim?.value ?? "");
    const breed = valueOfKind(input.claims, claim.subject, "livestock_breed");
    const sex = valueOfKind(input.claims, claim.subject, "livestock_sex");
    if (!month || !breed || !sex) {
      unplaced.push({
        claim,
        reason:
          "품종·성별·취득시기 중 읽지 못한 항목이 있어 같은 조건의 경락가를 고를 수 없습니다(대조 불가).",
      });
      continue;
    }

    const lookup = adapter.lookup({
      month,
      breedName: breed.value,
      sexName: sex.value,
    });
    if (lookup.kind === "missing") {
      unplaced.push({ claim, reason: `${lookup.reason}(대조 불가)` });
      continue;
    }
    candidates.push({ claim, reference: lookup.reference });
  }

  if (candidates.length === 0) return { placements: [], unplaced };

  const offerAveragePerHead = Math.round(
    candidates.reduce((sum, item) => sum + (item.claim.numericValue ?? 0), 0) /
      candidates.length,
  );

  const placements = candidates.map((candidate): PricePlacement => {
    const { reference } = candidate;
    const windowMonths = adapter.months(
      reference.breedName,
      reference.sexName,
    );
    const windowPrices = windowMonths.flatMap((month) => {
      const lookup = adapter.lookup({
        month,
        breedName: reference.breedName,
        sexName: reference.sexName,
      });
      return lookup.kind === "found" ? [lookup.reference.averagePricePerKg] : [];
    });
    const windowMean =
      windowPrices.length > 0
        ? windowPrices.reduce((sum, value) => sum + value, 0) /
          windowPrices.length
        : 0;
    const windowAverage = windowMean > 0 ? windowMean : undefined;

    const claimedPerHead = candidate.claim.numericValue ?? 0;
    const base: Omit<PricePlacement, "statement" | "evidence"> = {
      claim: candidate.claim,
      referenceMonth: reference.month,
      breedName: reference.breedName,
      sexName: reference.sexName,
      claimedPerHead,
      averagePricePerKg: reference.averagePricePerKg,
      sampleSize: reference.sampleSize,
      thinSample: reference.sampleSize < THIN_SAMPLE_THRESHOLD,
      grades: reference.grades,
      windowMonths,
      ...(windowAverage === undefined
        ? {}
        : {
            windowAveragePricePerKg: Math.round(windowAverage),
            monthVsWindowPercent: percent(
              reference.averagePricePerKg,
              windowAverage,
            ),
          }),
      offerAveragePerHead,
      vsOfferAveragePercent: percent(claimedPerHead, offerAveragePerHead),
    };

    return {
      ...base,
      evidence: [
        toEvidence(
          {
            priceClaim: candidate.claim,
            reference,
            windowMonths,
            ...(windowAverage === undefined
              ? {}
              : { windowAveragePricePerKg: Math.round(windowAverage) }),
          },
          adapter,
        ),
      ],
      statement: statementOf(base),
    };
  });

  return { placements, unplaced };
};
