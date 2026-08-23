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
    note: "증권신고서를 축산물이력제 원장과 개체 단위로 대조한 검증 리포트",
    preview: null,
  },
  {
    id: "pig",
    href: "/pig",
    label: "한돈",
    subLabel: null,
    note: "국산 돼지 공모 — 공시 축 정리 공개, 원장 축은 대조 불가",
    preview: [
      "대상 공모: 한돈 투자계약증권 3건 — 증권신고서 원문 확보",
      "연결 예정 원장: 축산물이력제(농장 단위) · 축산물품질평가원 돼지 경락 정보",
      "층별 지원 선언이 확정되면 한우와 같은 형식으로 확인 현황이 표시됩니다",
    ],
  },
  {
    id: "art",
    href: "/art",
    label: "미술품",
    subLabel: null,
    note: "미술품 공모 5건 — 공시 원문 대조와 공모가 구성 확인",
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
    note: "종료 공모의 소재지·가격·이행을 공공 원장과 대조한 사후 검증 리포트",
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
