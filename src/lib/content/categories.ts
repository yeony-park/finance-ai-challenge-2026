export const CATEGORY_IDS = ["cattle", "pig", "art", "real-estate"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryInfo {
  readonly id: CategoryId;
  readonly href: string;
  readonly label: string;
  readonly subLabel: string | null;
  readonly note: string;
  readonly preview: readonly string[] | null;
}

export const CATEGORY_REGISTRY: readonly CategoryInfo[] = [
  {
    id: "cattle",
    href: "/cattle",
    label: "한우",
    subLabel: null,
    note: "공시-원장 대조 리포트 공개 중",
    preview: null,
  },
  {
    id: "pig",
    href: "/pig",
    label: "한돈",
    subLabel: null,
    note: "국산 돼지 공모 — 공시 축 정리 공개, 원장 축은 대조 불가",
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
    note: "카테고리 착지 준비 중 — 공통 검증 기반 연결 대기",
    preview: [
      "대상 공모: 미술품 투자계약증권 — 공개 공모 정보 정리 중",
      "연결 예정 출처: 전자공시(DART) 증권신고서 · 공개 판매·이행 공시",
      "층별 지원 선언이 확정되면 같은 형식으로 확인 현황이 표시됩니다",
    ],
  },
  {
    id: "real-estate",
    href: "/real-estate",
    label: "부동산",
    subLabel: null,
    note: "사후 검증 리포트 공개 중",
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
