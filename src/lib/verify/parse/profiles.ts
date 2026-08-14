export type ColumnKey =
  | "label"
  | "name"
  | "trace"
  | "date"
  | "price"
  | "custody";

export interface DocumentProfile {
  readonly id: string;
  readonly issuer: string;
  readonly offerIds: readonly string[];
  readonly headerSignature: readonly string[];
  readonly tableName: string;
  readonly sectionFallback: string;
  readonly columns: Readonly<Record<ColumnKey, readonly string[]>>;
}

const BANKCOW_PROFILE: DocumentProfile = {
  id: "stockeeper-livestock",
  issuer: "주식회사 스탁키퍼 (뱅카우)",
  offerIds: ["livestock-7", "livestock-9"],
  headerSignature: ["고유명칭", "이력번호", "취득시기", "보관장소"],
  tableName: "기초자산 개체 명세표",
  sectionFallback: "8. 기초자산 취득에 관한 사항",
  columns: {
    label: ["구분", "연번", "번호"],
    name: ["고유명칭", "명칭", "품목"],
    trace: ["이력번호", "개체식별번호"],
    date: ["취득시기", "취득일", "취득일자"],
    price: ["취득원가", "취득가액", "매입가"],
    custody: ["보관장소", "사육지", "소재지"],
  },
};

export const DOCUMENT_PROFILES: readonly DocumentProfile[] = [BANKCOW_PROFILE];

export const FALLBACK_PROFILE: DocumentProfile = {
  ...BANKCOW_PROFILE,
  id: "generic-livestock",
  issuer: "(미등록 발행사)",
  offerIds: [],
};

export interface ProfileResolution {
  readonly profile: DocumentProfile;
  readonly matched: boolean;
}

export const resolveDocumentProfile = (offerId: string): ProfileResolution => {
  const profile = DOCUMENT_PROFILES.find((candidate) =>
    candidate.offerIds.includes(offerId),
  );
  return profile
    ? { profile, matched: true }
    : { profile: FALLBACK_PROFILE, matched: false };
};
