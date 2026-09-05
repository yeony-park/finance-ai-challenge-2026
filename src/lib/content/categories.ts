export const CATEGORY_IDS = ["cattle", "pig", "art", "real-estate"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryInfo {
  readonly id: CategoryId;
  readonly href: string;
  readonly label: string;
  readonly subLabel: string | null;
  readonly note: string;
  /** 카테고리 페이지 <meta description>. 페이지 파일에 문구를 따로 적지 않는다. */
  readonly metaDescription: string;
  readonly cardNote: readonly [string, string];
  readonly preview: readonly string[] | null;
}

export const CATEGORY_REGISTRY: readonly CategoryInfo[] = [
  {
    id: "cattle",
    href: "/cattle",
    label: "한우",
    subLabel: null,
    note: "증권신고서의 개체 정보를 축산물이력제 원장과 대조한 검증 리포트",
    metaDescription:
      "한우 공모의 공시-공공 원장 대조 확인 현황",
    cardNote: [
      "증권신고서의 개체 정보를 확인합니다",
      "축산물이력제 원장과 대조합니다",
    ],
    preview: null,
  },
  {
    id: "pig",
    href: "/pig",
    label: "한돈",
    subLabel: null,
    note: "국산 돼지 공모의 공시 내용과 가격 산식을 정리한 검증 리포트",
    metaDescription:
      "한돈 공모의 확인 현황 — 공시 축은 정리, 원장 축은 대조 불가",
    cardNote: [
      "공시 내용과 가격 산식을 확인합니다",
      "개체 원장은 대조할 수 없습니다",
    ],
    preview: [
      "대상 공모: 한돈 투자계약증권 3건 — 증권신고서 원문·발행실적 정리 공개",
      "공시 축: 회차·가격 산식·정산 실측·경락 시장 참고값·원문 링크",
      "원장 축: 개체 이력번호 미제공으로 공공 원장 대조는 대조 불가",
    ],
  },
  {
    id: "art",
    href: "/art",
    label: "미술품",
    subLabel: null,
    note: "합성 미술품 상품의 공모 조건과 작가·플랫폼 이력을 살펴보는 화면",
    metaDescription:
      "합성 미술품의 공모 조건, 가격 구성과 과거 이력",
    cardNote: [
      "합성 상품의 공모 조건을 살펴봅니다",
      "가격 구성과 과거 이력을 확인합니다",
    ],
    preview: [
      "대상 공모: 미술품 투자계약증권 5건 — 공모가 구성·공시 문서 좌표를 아래 확인 현황에 정리",
      "공시 축: 증권신고서·투자설명서·발행실적보고서 원문 대조 (DART 링크)",
      "원장 축: 독립 경매·보관 원장이 아직 연결되지 않아 해당 항목은 대조 불가로 표기",
    ],
  },
  {
    id: "real-estate",
    href: "/real-estate",
    label: "부동산",
    subLabel: null,
    note: "부동산 시나리오의 공모 조건과 건축물대장 공개정보를 확인하는 화면",
    metaDescription:
      "부동산 시나리오의 상품 조건과 건축물대장 공개 근거",
    cardNote: [
      "시나리오의 상품 조건을 살펴봅니다",
      "건물 정보와 공개 근거를 확인합니다",
    ],
    preview: null,
  },
];

export const categoryById = (id: CategoryId): CategoryInfo => {
  const found = CATEGORY_REGISTRY.find((entry) => entry.id === id);
  if (!found) throw new Error(`unregistered category: ${id}`);
  return found;
};

export const categoryDisplayLabel = (entry: CategoryInfo): string =>
  entry.subLabel ? `${entry.label}(${entry.subLabel})` : entry.label;
