/**
 * 발행사별 **항목 매핑 테이블** — 코드가 아니라 데이터다.
 *
 * 왜 분리하는가: 신고서의 XML 골격(부·절·항목)은 서식이 정해져 있어 공통 파서로 읽히지만,
 * 기초자산 명세표의 **이름과 열 표기**는 발행사마다 다르다("취득원가" ↔ "취득가액").
 * 파서를 고치는 대신 이 표에 항목을 한 줄 추가하는 것으로 발행사가 늘어나게 한다.
 *
 * 새 발행사 추가 절차
 * 1. 아래 배열에 프로필 한 건을 추가한다 (offerIds에 공모 식별자를 적는다)
 * 2. `__tests__/parse-document.test.ts`에 원문 픽스처 기반 추출 회귀 테스트를 추가한다
 * 3. 코드 수정은 필요 없다 — 미등록 공모는 `FALLBACK_PROFILE`로 시도되고 리포트에 그 사실이 남는다
 */

/** 개체 명세표에서 읽어야 하는 열 — 값은 헤더 별칭 목록(앞선 것이 우선) */
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
  /** 이 프로필이 적용되는 공모 식별자 (빈 배열 = 폴백 전용) */
  readonly offerIds: readonly string[];
  /** 개체 명세표를 특정하는 헤더 시그니처 — 전부 있어야 후보로 본다 */
  readonly headerSignature: readonly string[];
  /** 리포트에 인용할 표 이름 (원문에 표 캡션 태그가 없어 사람이 붙인 이름) */
  readonly tableName: string;
  /** 원문에서 항목 제목을 못 읽었을 때 쓰는 좌표 폴백 */
  readonly sectionFallback: string;
  readonly columns: Readonly<Record<ColumnKey, readonly string[]>>;
}

/**
 * 스탁키퍼(뱅카우) — 가축투자계약증권.
 * 헤더에 "고유명칭 + 이력번호 + 취득시기 + 보관장소"를 모두 요구하는 이유:
 * 이력번호를 쓰는 표가 신고서에 10여 개(사료비·경락가·등급) 있어 취득 명세표만 특정해야 한다.
 */
const BANKCOW_PROFILE: DocumentProfile = {
  id: "stockeeper-livestock",
  issuer: "주식회사 스탁키퍼 (뱅카우)",
  offerIds: ["livestock-9"],
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

/**
 * 미등록 발행사용 폴백 — 축산 신고서 서식이 표준화돼 있어 열 별칭만으로 상당수가 읽힌다.
 * 폴백으로 읽었다는 사실은 추출 결과의 note에 남겨 사람이 검수하게 한다.
 */
export const FALLBACK_PROFILE: DocumentProfile = {
  ...BANKCOW_PROFILE,
  id: "generic-livestock",
  issuer: "(미등록 발행사)",
  offerIds: [],
};

export interface ProfileResolution {
  readonly profile: DocumentProfile;
  /** 공모 식별자로 프로필을 특정했는가 (false면 폴백) */
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
