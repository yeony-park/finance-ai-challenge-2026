import type { Claim, Verdict } from "../types";
import type { LivestockTraceRecord } from "../adapters/livestock-trace";

export const ACQUISITION_WINDOW_DAYS = 30;

export interface Assessment {
  readonly verdict: Verdict;
  readonly observed: string;
  readonly rationale: string;
  readonly note?: string;
}

const ymdToDate = (ymd: string): Date | undefined => {
  const digits = ymd.replace(/\D/g, "");
  if (digits.length !== 8) return undefined;
  return new Date(
    `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T00:00:00Z`,
  );
};

const dayDiff = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / 86_400_000);

export const locationTokens = (raw: string): readonly string[] => {
  const compact = raw.replace(/\s/g, "");
  const matched = compact.match(/[가-힣]+?[도시군구읍면동]/g) ?? [];
  const tokens = matched.filter(
    (token) => token.length >= 2 && !token.endsWith("도"),
  );
  return [...new Set(tokens)];
};

const assessTraceNo = (record: LivestockTraceRecord): Assessment =>
  record.exists
    ? {
        verdict: "match",
        observed: `${record.cattleNo ?? record.traceNo12} 등록 (출생 ${record.birthYmd ?? "미상"})`,
        rationale: "공적 원장에 해당 이력번호의 개체가 등록되어 있습니다.",
      }
    : {
        verdict: "unverifiable",
        observed: "조회 결과 개체 정보 없음(빈 응답)",
        rationale:
          "공적 원장에서 해당 이력번호가 조회되지 않아 실재 여부를 확인할 수 없습니다.",
      };

const assessSimpleField = (
  label: string,
  claimed: string,
  observed: string | undefined,
): Assessment => {
  if (!observed) {
    return {
      verdict: "unverifiable",
      observed: "원장에 값 없음",
      rationale: `공적 원장에 ${label} 정보가 없어 확인할 수 없습니다.`,
    };
  }
  return observed === claimed
    ? {
        verdict: "match",
        observed,
        rationale: `신고서 기재 ${label}과 공적 원장의 값이 같습니다.`,
      }
    : {
        verdict: "mismatch",
        observed,
        rationale: `신고서 기재 ${label}(${claimed})과 공적 원장의 값(${observed})이 다릅니다.`,
      };
};

const MALE_SEX = "수";

const CASTRATED_SEX = "거세";

const CASTRATION_NOTE =
  "원장의 '거세'는 출생 등록 뒤 거세 처리된 수컷을 뜻합니다 — 한우 수컷의 비육 과정에서 표준적으로 이뤄지는 예상된 상태 전이입니다.";

const assessSex = (
  claimed: string,
  observed: string | undefined,
): Assessment => {
  if (claimed === MALE_SEX && observed === CASTRATED_SEX) {
    return {
      verdict: "match",
      observed,
      rationale:
        "신고서 기재 성별(수)과 원장의 '거세'는 모순되지 않습니다 — 출생 시 수컷이 거세 처리된 개체입니다.",
      note: CASTRATION_NOTE,
    };
  }
  return assessSimpleField("성별", claimed, observed);
};

const assessCustody = (
  claimed: string,
  record: LivestockTraceRecord,
): Assessment => {
  const farm = record.currentFarm;
  if (!farm || farm.farmAddress.length === 0) {
    return {
      verdict: "unverifiable",
      observed: "사육지 이력 없음",
      rationale:
        "공적 원장에 사육지 이력이 없어 보관장소를 확인할 수 없습니다.",
    };
  }

  const tokens = locationTokens(claimed);
  const address = farm.farmAddress.replace(/\s/g, "");
  const observed = `${farm.farmAddress} (${farm.regType} ${farm.regYmd}, 농장번호 ${farm.farmNo})`;
  if (tokens.length === 0) {
    return {
      verdict: "unverifiable",
      observed,
      rationale:
        "신고서 보관장소에서 대조 가능한 행정구역을 읽어내지 못했습니다.",
    };
  }

  const missing = tokens.filter((token) => !address.includes(token));
  return missing.length === 0
    ? {
        verdict: "match",
        observed,
        rationale: `공적 원장의 최종 사육지가 신고서 보관장소(${tokens.join(" ")})와 일치합니다.`,
        note: `대조 토큰: ${tokens.join(", ")}`,
      }
    : {
        verdict: "mismatch",
        observed,
        rationale: `공적 원장의 최종 사육지에서 신고서 보관장소(${missing.join(" ")})가 확인되지 않습니다.`,
        note: `불일치 토큰: ${missing.join(", ")}`,
      };
};

const assessAcquisitionDate = (
  claimed: string,
  record: LivestockTraceRecord,
): Assessment => {
  const claimedAt = ymdToDate(claimed);
  if (!claimedAt) {
    return {
      verdict: "unverifiable",
      observed: "취득시기를 날짜로 읽지 못함",
      rationale: "신고서 취득시기를 날짜로 해석할 수 없습니다.",
    };
  }

  const transfers = record.farmHistory.filter(
    (farm) => farm.farmNo === record.currentFarmNo && farm.regYmd.length === 8,
  );
  const candidate = transfers
    .map((farm) => ({ farm, at: ymdToDate(farm.regYmd) }))
    .find(({ at }) => {
      if (!at) return false;
      const diff = dayDiff(claimedAt, at);
      return diff >= -ACQUISITION_WINDOW_DAYS && diff <= ACQUISITION_WINDOW_DAYS;
    });

  if (!candidate?.at) {
    return {
      verdict: "unverifiable",
      observed:
        record.farmHistory.length === 0
          ? "사육지 이력 없음"
          : `현 사육지 등록일 ${record.currentFarm?.regYmd ?? "미상"} (${record.currentFarm?.regType ?? "-"})`,
      rationale: `신고서 취득시기(${claimed}) 전후 ${ACQUISITION_WINDOW_DAYS}일 안의 사육지 등록 기록이 없어 취득 시점을 확인할 수 없습니다.`,
    };
  }

  return {
    verdict: "match",
    observed: `${candidate.farm.regType} 등록 ${candidate.farm.regYmd}`,
    rationale: `신고서 취득시기와 공적 원장의 사육지 등록일 차이가 ${Math.abs(dayDiff(claimedAt, candidate.at))}일로 허용 범위(${ACQUISITION_WINDOW_DAYS}일) 안입니다.`,
  };
};

const NO_ADAPTER: Assessment = {
  verdict: "unverifiable",
  observed: "-",
  rationale: "이 어댑터로 대조할 수 없는 항목입니다.",
};

export const assess = (
  claim: Claim,
  record: LivestockTraceRecord,
): Assessment => {
  switch (claim.kind) {
    case "livestock_trace_no":
      return assessTraceNo(record);
    case "livestock_breed":
      return assessSimpleField("품종", claim.value, record.breedName);
    case "livestock_sex":
      return assessSex(claim.value, record.sexName);
    case "custody_location":
      return assessCustody(claim.value, record);
    case "acquisition_date":
      return assessAcquisitionDate(claim.value, record);
    case "acquisition_price":
    case "real_estate_address":
    case "real_estate_parcel_area":
    case "real_estate_building_area":
    case "real_estate_total_area":
    case "real_estate_use_approved_month":
    case "offer_amount":
    case "sale_amount":
    case "sale_date":
      return NO_ADAPTER;
  }
  const unreachable: never = claim.kind;
  throw new Error(`대조 규칙이 없는 claim 종류입니다: ${String(unreachable)}`);
};
