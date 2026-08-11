/**
 * 익명화 — 목업 v4가 쓰던 마스킹 수준(발행사명·이력번호·지역)을 그대로 유지한다.
 * 근거: docs/planning/주제-정의 §11 결정.
 *
 * 마스킹은 서버(뷰 모델 조립) 단계에서 끝낸다. 클라이언트 번들·RSC 페이로드에는
 * 마스킹된 문자열만 실린다 — 화면에 안 보이는 key·id로도 실명이 새지 않게 한다.
 */

/** 앞뒤 2자리만 남기고 가리는 자릿수 — 목업 v4의 "21●●●●●79" 표기와 동일 */
const VISIBLE_DIGITS = 2;
const MASK_CHAR = "●";
const REGION_MASK = "○○";

/**
 * 이력번호를 "21●●●●●79" 형태로 가린다.
 * 이미 마스킹된 문자열은 그대로 돌려준다 — 저장된 공개 리포트에 뷰가 재적용해도 안전해야 한다(멱등).
 */
export const maskTraceNo = (raw: string): string => {
  if (raw.includes(MASK_CHAR)) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= VISIBLE_DIGITS * 2) {
    return MASK_CHAR.repeat(digits.length);
  }
  const head = digits.slice(0, VISIBLE_DIGITS);
  const tail = digits.slice(-VISIBLE_DIGITS);
  return `${head}${MASK_CHAR.repeat(digits.length - VISIBLE_DIGITS * 2)}${tail}`;
};

/** 시도 표기 정규화 표 — 긴 표기가 먼저 매칭되도록 배열 순서를 지킨다. */
const SIDO_TABLE: ReadonlyArray<{
  readonly names: readonly string[];
  readonly short: string;
}> = [
  { names: ["강원특별자치도", "강원도", "강원"], short: "강원" },
  { names: ["경기도", "경기"], short: "경기" },
  { names: ["경상북도", "경북"], short: "경북" },
  { names: ["경상남도", "경남"], short: "경남" },
  { names: ["전북특별자치도", "전라북도", "전북"], short: "전북" },
  { names: ["전라남도", "전남"], short: "전남" },
  { names: ["충청북도", "충북"], short: "충북" },
  { names: ["충청남도", "충남"], short: "충남" },
  { names: ["제주특별자치도", "제주도", "제주"], short: "제주" },
  { names: ["서울특별시", "서울시", "서울"], short: "서울" },
  { names: ["부산광역시", "부산시", "부산"], short: "부산" },
  { names: ["대구광역시", "대구시", "대구"], short: "대구" },
  { names: ["인천광역시", "인천시", "인천"], short: "인천" },
  { names: ["광주광역시", "광주시", "광주"], short: "광주" },
  { names: ["대전광역시", "대전시", "대전"], short: "대전" },
  { names: ["울산광역시", "울산시", "울산"], short: "울산" },
  { names: ["세종특별자치시", "세종시", "세종"], short: "세종" },
];

/** 시도 다음에 오는 첫 시·군·구 — 이름은 버리고 접미사만 남긴다. */
const DISTRICT_PATTERN = /[가-힣]+(시|군|구)/;

/** 자유 문장 안의 시·군·구·읍·면·동 지명 (시도 접미사 "도"는 제외) */
const REGION_TOKEN_PATTERN = /[가-힣]{2,}(시|군|구|읍|면|동)(?![가-힣])/g;

/** 자유 문장 안의 이력번호 자릿수 — 8자리 날짜(20260730)를 건드리지 않도록 9자리 이상만 */
const LONG_DIGITS_PATTERN = /\d{9,}/g;

/**
 * 엔진이 만든 자유 문장(판정 사유·근거 메모)에서 지명·이력번호를 가린다.
 * 화면에 그대로 인용하되 익명화 수준은 목업과 같게 맞추기 위한 방어선이다.
 */
export const maskFreeText = (raw: string): string =>
  raw
    .replace(LONG_DIGITS_PATTERN, (digits) => maskTraceNo(digits))
    .replace(REGION_TOKEN_PATTERN, (_match, suffix: string) => `${REGION_MASK}${suffix}`);

/** maskRegion이 이미 내놓은 형태 — "강원 ○○군" / "강원 ○○" / "○○ 지역" */
const MASKED_REGION_PATTERN = new RegExp(
  `^([가-힣]{2} )?${REGION_MASK}( ?[시군구]| 지역)?$`,
);

/**
 * 주소를 "강원 ○○군" 수준으로 가린다.
 * 번지·농장번호·읍면동 등 개체를 특정할 수 있는 뒷부분은 아예 버린다.
 * 이미 마스킹된 문자열은 그대로 돌려준다(멱등) — 저장된 공개 리포트에 뷰가 재적용하기 때문이다.
 */
export const maskRegion = (raw: string): string => {
  const text = raw.trim();
  if (MASKED_REGION_PATTERN.test(text)) return text;
  for (const sido of SIDO_TABLE) {
    const matched = sido.names.find((name) => text.startsWith(name));
    if (!matched) continue;
    const district = text.slice(matched.length).match(DISTRICT_PATTERN);
    return district
      ? `${sido.short} ${REGION_MASK}${district[1]}`
      : `${sido.short} ${REGION_MASK}`;
  }
  return `${REGION_MASK} 지역`;
};
