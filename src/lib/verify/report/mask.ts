const VISIBLE_DIGITS = 2;
const MASK_CHAR = "●";
const REGION_MASK = "○○";

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

const DISTRICT_PATTERN = /[가-힣]+(시|군|구)/;

const REGION_TOKEN_PATTERN = /[가-힣]{2,}(시|군|구|읍|면|동)(?![가-힣])/g;

const LONG_DIGITS_PATTERN = /\d{9,}/g;

const NON_REGION_TOKENS: ReadonlySet<string> = new Set([
  "법정동",
  "행정동",
  "자치구",
  "시군구",
  "비교군",
  "대조군",
  "표본군",
]);

export const maskFreeText = (raw: string): string =>
  raw
    .replace(LONG_DIGITS_PATTERN, (digits) => maskTraceNo(digits))
    .replace(REGION_TOKEN_PATTERN, (match: string, suffix: string) =>
      NON_REGION_TOKENS.has(match) ? match : `${REGION_MASK}${suffix}`,
    );

const SIDO_SHORT = new Map(
  SIDO_TABLE.flatMap((sido) => sido.names.map((name) => [name, sido.short] as const)),
);

const SIDO_NAMES = [...SIDO_SHORT.keys()].sort((a, b) => b.length - a.length);

const DONG_PATTERN = /[가-힣0-9]+(동|가|리)(?![가-힣])/;

export const maskAddressToDong = (raw: string): string => {
  const text = raw.trim();
  const sido = SIDO_NAMES.find((name) => text.startsWith(name));
  if (!sido) return maskFreeText(text);
  const rest = text.slice(sido.length).trim();
  const district = rest.match(DISTRICT_PATTERN)?.[0];
  const dong = rest.match(DONG_PATTERN);
  const head = [SIDO_SHORT.get(sido), district].filter(Boolean).join(" ");
  return dong ? `${head} ${REGION_MASK}${dong[1]}` : `${head} ${REGION_MASK}`;
};

const MASKED_REGION_PATTERN = new RegExp(
  `^([가-힣]{2} )?${REGION_MASK}( ?[시군구]| 지역)?$`,
);

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
