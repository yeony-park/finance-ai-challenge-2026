export type CardDesignVariant =
  | "yellowFrame"
  | "passport"
  | "splitBrief"
  | "categoryCanvas"
  | "guidedSteps";

export interface CardDesignOption {
  readonly id: string;
  readonly number: string;
  readonly name: string;
  readonly summary: string;
  readonly strength: string;
  readonly tradeoff: string;
  readonly variant: CardDesignVariant;
  readonly baseline?: boolean;
}

export interface CardDesignSample {
  readonly id: string;
  readonly category: string;
  readonly code: string;
  readonly title: string;
  readonly provider: string;
  readonly description: string;
  readonly status: string;
  readonly image: string;
  readonly imageAlt: string;
  readonly href: string;
  readonly primaryLabel: string;
  readonly primaryValue: string;
  readonly facts: readonly [
    { readonly label: string; readonly value: string },
    { readonly label: string; readonly value: string },
  ];
  readonly verification: {
    readonly match: number;
    readonly mismatch: number;
    readonly unknown: number;
  };
  readonly verificationNote: string;
  readonly checkedAt: string;
}

export const CARD_DESIGN_META = {
  title: "공통 카드 디자인 비교",
  description:
    "미술품·한우·한돈·부동산에 공통 적용할 카드 디자인 5안 비교 화면",
} as const;

export const CARD_DESIGN_COPY = {
  eyebrow: "CARD SYSTEM / DESIGN REVIEW",
  titleLineOne: "다른 자산도,",
  titleLineTwo: "같은 순서로 이해하도록",
  leadPrefix:
    "미술품·한우·한돈·부동산의 필수 정보는 다르지만, 사용자가 읽는 순서는 같습니다. 다섯 안 모두 ",
  leadStrong: "자산 이해 → 공모 조건 → 검증 현황",
  leadSuffix: "의 공통 문법을 사용합니다.",
  sampleNotice:
    "아래 수치는 기존 화면의 공개 정보를 디자인 비교용으로 압축한 샘플이며, 이 화면 자체는 투자 판단 자료가 아닙니다.",
  tabLabel: "카드 디자인 안 선택",
  baseline: "기본안",
  select: "이 안 선택",
  selected: "선택됨",
  strength: "강점",
  tradeoff: "고려할 점",
  primaryStep: "공모 조건",
  assetStep: "기초자산",
  verificationStep: "검증 현황",
  match: "일치",
  mismatch: "원장 불일치",
  unknown: "대조 불가",
  checkedAt: "최근 대조",
  reportLink: "검증 리포트 보기",
  selectionLabel: "현재 선택",
  selectionEmpty: "아직 선택하지 않았어요",
  selectionEmptyNote: "다섯 안을 비교한 뒤 마음에 드는 안을 선택해 주세요.",
  selectionDoneNote:
    "이 번호를 채팅에 알려주시면 전체 카테고리 카드에 적용하겠습니다.",
  clearSelection: "선택 해제",
} as const;

export const CARD_DESIGN_OPTIONS: readonly CardDesignOption[] = [
  {
    id: "yellow-frame",
    number: "01",
    name: "옐로 프레임",
    summary: "익숙한 이미지 상단형에 핵심 조건과 검증 현황을 단정하게 쌓습니다.",
    strength: "빠르게 익힐 수 있고 모든 카테고리에 무리 없이 확장됩니다.",
    tradeoff: "대표 이미지의 품질과 크롭 규칙을 꾸준히 관리해야 합니다.",
    variant: "yellowFrame",
    baseline: true,
  },
  {
    id: "passport",
    number: "02",
    name: "공시 패스포트",
    summary: "이미지는 작게, 공모 조건과 검증 숫자는 크게 보여 주는 기록형입니다.",
    strength: "이미지가 없거나 달라도 카드 간 비교와 정보 확인이 안정적입니다.",
    tradeoff: "자산의 시각적 인상은 다른 안보다 절제됩니다.",
    variant: "passport",
  },
  {
    id: "split-brief",
    number: "03",
    name: "자산 브리프",
    summary: "이미지와 판단 정보를 좌우로 나눠 자산과 조건을 동시에 설명합니다.",
    strength: "처음 보는 사람도 무엇에 참여하는 상품인지 한눈에 파악하기 좋습니다.",
    tradeoff: "가로 공간을 넉넉히 써서 한 화면에 보이는 카드 수가 줄어듭니다.",
    variant: "splitBrief",
  },
  {
    id: "category-canvas",
    number: "04",
    name: "카테고리 캔버스",
    summary: "자산의 인상을 살리되 숫자 영역은 평범하고 선명하게 유지합니다.",
    strength: "카테고리의 개성이 살아나 홈과 탐색 화면에서 기억하기 쉽습니다.",
    tradeoff: "이미지 면적이 커져 정보 밀도가 높은 목록에는 덜 적합합니다.",
    variant: "categoryCanvas",
  },
  {
    id: "guided-steps",
    number: "05",
    name: "3단계 확인",
    summary: "공모 조건, 기초자산, 검증 현황을 읽는 순서대로 안내합니다.",
    strength: "조각투자가 처음인 사용자가 숫자의 의미를 놓치지 않게 돕습니다.",
    tradeoff: "카드가 길어져 익숙한 사용자의 빠른 비교에는 조금 느릴 수 있습니다.",
    variant: "guidedSteps",
  },
] as const;

export const CARD_DESIGN_SAMPLES: readonly CardDesignSample[] = [
  {
    id: "cattle-9",
    category: "한우",
    code: "CATTLE 09",
    title: "한우 9호",
    provider: "발행사 공시 · 축산물이력제 대조",
    description: "한우 37두의 사육·매각 결과에 참여하는 구조의 상품이에요.",
    status: "청약 예정",
    image: "/category-cattle.jpg",
    imageAlt: "한우 카테고리 대표 이미지",
    href: "/cattle?tab=analysis",
    primaryLabel: "최소 투자금",
    primaryValue: "공시 미기재",
    facts: [
      { label: "청약 기간", value: "09.08 – 09.22" },
      { label: "대조 대상", value: "한우 37두" },
    ],
    verification: { match: 183, mismatch: 1, unknown: 1 },
    verificationNote: "공시 내용 185건을 공공 원장과 대조했어요.",
    checkedAt: "2026.08.15",
  },
  {
    id: "pig-3",
    category: "한돈",
    code: "PIG 03",
    title: "한돈 3호",
    provider: "발행사 공시 · DART 원문",
    description: "돼지 500두의 사육과 출하 결과에 참여하는 구조의 상품이에요.",
    status: "발행 완료",
    image: "/category-pig.jpg",
    imageAlt: "한돈 카테고리 대표 이미지",
    href: "/pig?tab=analysis&product=round-3",
    primaryLabel: "한 조각 금액",
    primaryValue: "20,000원",
    facts: [
      { label: "총 발행금액", value: "2억 2,900만원" },
      { label: "기초자산", value: "돼지 500두" },
    ],
    verification: { match: 0, mismatch: 0, unknown: 1 },
    verificationNote: "개체 식별번호가 없어 공공 원장 대조는 아직 불가해요.",
    checkedAt: "2026.07.14",
  },
  {
    id: "art-3",
    category: "미술품",
    code: "ART 03",
    title: "미술품 상품 3",
    provider: "DART 투자설명서 · 발행실적보고서",
    description: "한 작품의 소유 관계를 조각으로 나눠 참여하는 구조의 상품이에요.",
    status: "보관 중",
    image: "/category-art.jpg",
    imageAlt: "미술품 카테고리 대표 이미지",
    href: "/art?tab=analysis&product=art-3",
    primaryLabel: "총 공모금액",
    primaryValue: "2억 2,500만원",
    facts: [
      { label: "작품 취득가", value: "2억 376만원" },
      { label: "발행비용", value: "2,124만원" },
    ],
    verification: { match: 1, mismatch: 0, unknown: 0 },
    verificationNote: "취득가와 발행비용의 합이 공모금액과 일치해요.",
    checkedAt: "2026.08.08",
  },
  {
    id: "real-estate-a",
    category: "부동산",
    code: "BUILDING A",
    title: "서초 지웰타워 12층",
    provider: "공모 공고 · 국토부 실거래 자료",
    description: "업무시설 한 층의 임대·매각 결과에 참여했던 구조의 상품이에요.",
    status: "매각 완료",
    image: "/category-real-estate-card-v2.png",
    imageAlt: "부동산 카테고리 대표 이미지",
    href: "/real-estate?tab=analysis",
    primaryLabel: "한 조각 금액",
    primaryValue: "5,000원",
    facts: [
      { label: "총 공모금액", value: "40억원" },
      { label: "건물 용도", value: "상업업무용" },
    ],
    verification: { match: 0, mismatch: 2, unknown: 0 },
    verificationNote: "공시 매각 정보 2건은 공공 자료에서 같은 값이 확인되지 않았어요.",
    checkedAt: "2026.08.21",
  },
] as const;
