export type PigRound = 1 | 2 | 3;

export interface PigDisclosureDocument {
  readonly label: string;
  readonly rceptNo: string;
  readonly filedAt: string;
}

export interface PigDisclosureProduct {
  readonly id: `round-${PigRound}`;
  readonly round: PigRound;
  readonly productName: string;
  readonly statusLabel: "정산 완료" | "발행 완료";
  readonly offering: {
    readonly heads: number;
    readonly units: number;
    readonly unitPriceWon: number;
    readonly issueAmountWon: number;
    readonly subscriptionPeriod: string;
    readonly issuedAt: string;
  };
  readonly farm: {
    readonly name: string;
    readonly region: string;
    readonly supplier: string;
    readonly entryDate: string;
    readonly participationHistory: string;
  };
  readonly pricing: {
    readonly baselineMonth: string;
    readonly baselinePriceWonPerKg: number;
    readonly purchaseMultiplier: number;
    readonly averagePigletPriceWon: number;
    readonly averageEntryWeightKg: number;
    readonly pigletPurchaseAmountWon: number;
  };
  readonly settlement: {
    readonly completed: boolean;
    readonly completedAt?: string;
    readonly shippedHeads: number | null;
    readonly totalSaleWon: number | null;
    readonly profitWon: number | null;
    readonly realizedReturnPercent: number | null;
    readonly publicSummary: string;
    readonly sourceUrl: string;
  };
  readonly documents: readonly PigDisclosureDocument[];
}

export interface PigMarketPoint {
  readonly month: string;
  readonly headCount: number;
  readonly priceWonPerKg: number;
  readonly amountWon: number;
  readonly weightKg: number;
}

export interface PigMarketSnapshot {
  readonly points: readonly PigMarketPoint[];
  readonly filters: {
    readonly skinType: string;
    readonly sex: string;
    readonly grade: string;
    readonly region: string;
  };
  readonly sourceFile: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly asOf: string;
  readonly sha256: string;
  readonly limitation: string;
}

export interface PigAsfEvent {
  readonly occurredAt: string;
  readonly region: string;
}

export const PIG_DART_BASE = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=";

export const dartDocumentUrl = (rceptNo: string): string =>
  `${PIG_DART_BASE}${rceptNo}`;

export const PIG_DISCLOSURE_PRODUCTS: readonly PigDisclosureProduct[] = [
  {
    id: "round-3",
    round: 3,
    productName: "가축투자계약증권 제3호",
    statusLabel: "발행 완료",
    offering: {
      heads: 500,
      units: 11_450,
      unitPriceWon: 20_000,
      issueAmountWon: 229_000_000,
      subscriptionPeriod: "2026-06-29~2026-07-10",
      issuedAt: "2026-07-14",
    },
    farm: {
      name: "농장 A",
      region: "전북 ○○",
      supplier: "농장 A",
      entryDate: "2026-05-28",
      participationHistory:
        "같은 농장 A가 제2호와 제3호 공시에 연속으로 기재돼 있습니다.",
    },
    pricing: {
      baselineMonth: "2026-04",
      baselinePriceWonPerKg: 6_176,
      purchaseMultiplier: 37.5,
      averagePigletPriceWon: 237_200,
      averageEntryWeightKg: 32.8,
      pigletPurchaseAmountWon: 118_600_000,
    },
    settlement: {
      completed: false,
      shippedHeads: null,
      totalSaleWon: null,
      profitWon: null,
      realizedReturnPercent: null,
      publicSummary:
        "DART에서는 발행 완료까지 확인됩니다. 실제 판매단가와 최종 수익률은 수집한 DART 문서에 공개된 숫자가 없습니다.",
      sourceUrl: dartDocumentUrl("20260714000008"),
    },
    documents: [
      { label: "최초 신고서", rceptNo: "20260605000175", filedAt: "2026-06-05" },
      { label: "기재정정 신고서", rceptNo: "20260624000508", filedAt: "2026-06-24" },
      { label: "투자설명서", rceptNo: "20260626000400", filedAt: "2026-06-26" },
      { label: "발행실적보고서", rceptNo: "20260714000008", filedAt: "2026-07-14" },
    ],
  },
  {
    id: "round-2",
    round: 2,
    productName: "가축투자계약증권 제2호",
    statusLabel: "발행 완료",
    offering: {
      heads: 500,
      units: 10_640,
      unitPriceWon: 20_000,
      issueAmountWon: 212_800_000,
      subscriptionPeriod: "2026-05-14~2026-05-27",
      issuedAt: "2026-05-29",
    },
    farm: {
      name: "농장 A",
      region: "전북 ○○",
      supplier: "농장 A",
      entryDate: "2026-04-15",
      participationHistory:
        "수집한 공시에서 농장 A가 발행사 한돈 STO에 참여한 첫 회차는 제2호입니다.",
    },
    pricing: {
      baselineMonth: "2026-03",
      baselinePriceWonPerKg: 5_229,
      purchaseMultiplier: 37.5,
      averagePigletPriceWon: 198_208,
      averageEntryWeightKg: 31.06,
      pigletPurchaseAmountWon: 99_103_750,
    },
    settlement: {
      completed: false,
      shippedHeads: null,
      totalSaleWon: null,
      profitWon: null,
      realizedReturnPercent: null,
      publicSummary:
        "DART에서는 발행 완료까지 확인됩니다. 실제 판매단가와 최종 수익률은 수집한 DART 문서에 공개된 숫자가 없습니다.",
      sourceUrl: dartDocumentUrl("20260528001031"),
    },
    documents: [
      { label: "최초 신고서", rceptNo: "20260420000157", filedAt: "2026-04-20" },
      { label: "기재정정 신고서", rceptNo: "20260506000437", filedAt: "2026-05-06" },
      { label: "투자설명서", rceptNo: "20260514000004", filedAt: "2026-05-14" },
      { label: "발행실적보고서", rceptNo: "20260528001031", filedAt: "2026-05-28" },
    ],
  },
  {
    id: "round-1",
    round: 1,
    productName: "가축투자계약증권 제1호",
    statusLabel: "정산 완료",
    offering: {
      heads: 500,
      units: 10_812,
      unitPriceWon: 20_000,
      issueAmountWon: 216_240_000,
      subscriptionPeriod: "2026-01-29~2026-02-11",
      issuedAt: "2026-02-13",
    },
    farm: {
      name: "농장 B·C",
      region: "전북 ○○",
      supplier: "농장 A",
      entryDate: "2025-12-11",
      participationHistory: "발행사가 발행한 첫 한돈 투자계약증권 회차입니다.",
    },
    pricing: {
      baselineMonth: "2025-11",
      baselinePriceWonPerKg: 5_657,
      purchaseMultiplier: 37.5,
      averagePigletPriceWon: 209_058,
      averageEntryWeightKg: 28.4,
      pigletPurchaseAmountWon: 104_528_750,
    },
    settlement: {
      completed: true,
      completedAt: "2026-05-11",
      shippedHeads: 484,
      totalSaleWon: 255_946_891,
      profitWon: 28_260_808,
      realizedReturnPercent: 13.1,
      publicSummary:
        "2026년 5월 11일 정산, 수익금 28,260,808원, 세전 단순수익률 13.1%로 제3호 신고서에 기재돼 있습니다. 계좌 입금 원장까지 독립적으로 확인한 값은 아닙니다.",
      sourceUrl: dartDocumentUrl("20260624000508"),
    },
    documents: [
      { label: "최초 신고서", rceptNo: "20251215000259", filedAt: "2025-12-15" },
      { label: "기재정정 신고서", rceptNo: "20260107000209", filedAt: "2026-01-07" },
      { label: "투자설명서", rceptNo: "20260129000008", filedAt: "2026-01-29" },
      { label: "발행실적보고서", rceptNo: "20260213000150", filedAt: "2026-02-13" },
    ],
  },
];

export const PIG_MARKET: PigMarketSnapshot = {
  points: [
    { month: "2026-05", headCount: 29_415, priceWonPerKg: 6_388.00473, amountWon: 16_188_609_355, weightKg: 2_534_220 },
    { month: "2026-06", headCount: 33_504, priceWonPerKg: 6_342.50262, amountWon: 18_191_382_084, weightKg: 2_868_171 },
    { month: "2026-07", headCount: 34_374, priceWonPerKg: 6_235.70217, amountWon: 18_091_530_476, weightKg: 2_901_282 },
  ],
  filters: { skinType: "탕박", sex: "전체", grade: "등외제외", region: "전국(제주제외)" },
  sourceFile: "pig_price_20260815021618.csv",
  sourceUrl: "https://www.data.go.kr/data/15148902/fileData.do",
  retrievedAt: "2026-08-15 02:16:18 KST",
  asOf: "2026-07",
  sha256: "673a3ca60df390f1df2c623306e7bf846784958736ded9c29aee175162dcd13d",
  limitation:
    "월별 시장 집계로 개별 상품의 돼지·출하 로트·실제 정산가격을 확인할 수 없습니다.",
};

export const PIG_ASF_MAP_URL = "https://www.mafra.go.kr/FMD-AI2/map/ASF/ASF_map.jsp";
export const PIG_ASF_SNAPSHOT_URL =
  "https://www.mafra.go.kr/bbs/FMD-AI2/404/577369/artclView.do";
export const PIG_ASF_SNAPSHOT_ASOF = "2026-03-20";
export const PIG_ASF_EVENTS: readonly PigAsfEvent[] = [
  { occurredAt: "2026-02-01", region: "전북 고창군" },
  { occurredAt: "2026-02-12", region: "전북 정읍시" },
];

export const getPigProduct = (
  productId?: string,
): PigDisclosureProduct =>
  PIG_DISCLOSURE_PRODUCTS.find((product) => product.id === productId) ??
  PIG_DISCLOSURE_PRODUCTS[0];

// --- 사용자 대면 문안 (단일 진실). 전 문자열이 출력 필터를 통과해야 한다. ---

export const PIG_AXES = {
  eyebrow: "두 축으로 나눠 봅니다",
  title: "공시 축은 채우고, 원장 축은 대조 불가를 그대로 둡니다",
  disclosureLabel: "공시 축",
  disclosureBody:
    "발행사가 DART에 낸 회차 카드·가격 산식·정산 실측·시장 참고값·원문 링크를 그대로 정리했습니다.",
  ledgerLabel: "원장 축",
  ledgerVerdict: "대조 불가",
  ledgerBody:
    "개체 식별번호(이력번호)가 발행사 서면 제공 전이라 공공 원장 조회가 불가합니다. 공시 숫자를 축산물이력제 원장과 대조하는 단계는 아직 열지 못했습니다.",
} as const;

export const PIG_GALLERY = {
  label: "최근 상품",
  badge: "DART 공시 기준",
  title: "최근 발행된 한돈 STO 3개 회차",
  description: "회차를 선택하면 농장·가격·질병 맥락·발행사 이력이 한 화면에서 바뀝니다.",
  headsLabel: "기초자산",
  amountLabel: "발행금액",
  ctaSelected: "선택됨",
  ctaOpen: "상세 보기",
  noReturn: "최종 매각금액·수익률은 DART에서 확인되지 않음",
} as const;

export const PIG_OVERVIEW = {
  label: "선택 상품",
  description: "공시 속 상품 조건과 그 밖의 공식 자료를 같은 기준일로 나눠 보여줍니다.",
  subscription: "청약 기간",
  amount: "발행금액",
  unit: "발행 단위",
  heads: "기초자산",
} as const;

export const PIG_FARM = {
  label: "농장과 정산 이력",
  title: "이 농장은 이전에도 참여했나요?",
  description:
    "공시에 공개된 농장 표기는 익명 라벨로 바꿨고 지역은 시·군을 가린 도 단위로만 둡니다.",
  badge: "공시 기재 정보",
  farmDt: "참여 농장",
  entryDt: "입식일",
  supplierDt: "자돈 공급",
  supplierNote: "발행사 신고서 기재",
  priorDt: "이전 참여",
  priorRound3: "제2호 참여 확인",
  priorRound2: "첫 확인 회차",
  priorRound1: "첫 발행 회차",
  headsSuffix: "두 공시",
  saleLabel: "실제 출하·매각",
  saleEmpty: "공개 숫자 없음",
  returnLabel: "DART 기재 수익률",
  returnEmpty: "공개 숫자 없음",
  sourceLink: "근거 공시 보기",
} as const;

export const PIG_DISEASE = {
  label: "질병 지역 맥락",
  title: "공시 농장이 속한 도에 ASF 공개 발생이 있었나요?",
  description:
    "공시 농장 지역은 시·군을 가린 도 단위(전북)라 같은 시·군 대조는 불가합니다. 전북에서 공개된 2026년 발생 지역만 도 단위 맥락으로 함께 둡니다.",
  badge: "도 단위 맥락",
  regionLabel: "공시 농장 지역",
  regionValue: "전북 ○○",
  eventsHeading: "전북에서 공개된 2026년 발생 지역",
  snapshotPrefix: "정적 공개본",
  officialLabel: "농림축산식품부 공식 자료",
  noticeHeading: "자료 해석",
  noticeBody:
    "같은 시·군 공개 발생이 0건이라도 농장 감염이 없거나 문제가 없다는 뜻은 아닙니다. 공식 자료는 개인정보 보호를 위해 발생 지역을 읍·면·동·리 단위로 공개하며, 원 지도의 좌표도 관공서 기준이라 실제 발생 농장 위치와 다를 수 있습니다.",
  noticeBody2:
    "공시 농장과 질병 사건을 잇는 공공 식별자가 없어 상세 위치, 실제 거리, 감염 여부 또는 손익 영향은 판단하지 않습니다.",
  mapLink: "ASF 공식 지도 새 창에서 보기",
  snapshotLink: "2026년 ASF 발생현황 공개본",
} as const;

export const PIG_PRICE = {
  label: "가격 비교",
  title: "공시 기준가격과 최근 시장 흐름",
  description:
    "같은 탕박·등외제외·제주제외 조건의 월별 공식 통계를 시장 참고값으로 사용합니다.",
  badge: "시장 참고값",
  chartEyebrow: "시장 흐름 · 2026.05–07",
  chartTitle: "최근 3개월 돼지 경락가격",
  latestLabel: "7월 월평균",
  perKg: "원/kg",
  scaleNotePrefix: "가격 차이를 보기 위한 확대 축",
  caption:
    "공식 월별 집계이며 개별 돼지의 실제 판매가격이 아닙니다. 가격선과 경락두수 막대는 서로 다른 단위를 사용합니다.",
  selectedEyebrow: "선택 상품과 비교",
  selectedTag: "선택",
  baselineSuffix: "기준",
  marketAvgLabel: "2026-07 시장 월평균",
  gapLabel: "참고 차이",
  caution: "기준월이 달라 가격 적정성이나 회차의 유불리를 가르는 비교가 아닙니다.",
  pigletFormula: "자돈 산식",
  pigletAvg: "자돈 평균가",
  entryWeight: "평균 입식체중",
  purchaseAmount: "실제 매입액",
  perHead: "원/두",
  roundEyebrow: "회차별 기준가격",
  roundTitle: "공시에 사용된 시장 기준가",
  roundNote: "기준월 서로 다름",
  sourceLink: "축산물 등급별 경락가격 공식 자료",
} as const;

export const PIG_FILING = {
  label: "공시 사실 카드",
  title: "선택 회차 신고서 기재 사실",
  description:
    "발행사가 DART 신고서에 기재한 공모 사실을 항목별로 정리했습니다. 접수번호는 공시 좌표이며, 농장·지역 표기는 익명 라벨·도 단위입니다.",
} as const;

export const PIG_ISSUER = {
  label: "발행사 이력",
  title: "발행사의 한돈 STO 발행 이력",
  descriptionPrefix: "DART",
  descriptionSuffix:
    "기준 발행 3회, 최종 정산 결과 확인 1회입니다. 같은 상품의 최초·정정·발행실적 문서를 회차별로 묶었습니다.",
  badge: "3개 회차",
  completedNote: "정산 · 수익금",
  pendingNote: "발행실적 확인 · 최종 정산 숫자는 DART에 없음",
  differenceHeading: "원문 간 금액 차이",
  differenceBody:
    "제3호 신고서의 과거 발행내역에는 제2호 모집금액이 218,800,000원으로 적혀 있지만, 제2호 정정신고서와 발행실적보고서는 모두 212,800,000원입니다. 이 화면은 발행실적보고서의 212,800,000원을 사용합니다.",
  diffLinkA: "제3호 정정신고서",
  diffLinkB: "제2호 발행실적",
  documentsHeading: "선택 회차 공시 원문",
  documentLink: "원문 보기",
} as const;

// 감사·회귀 테스트가 참조하는 전 문안 집합.
export const pigCopyStrings = (): readonly string[] => {
  const literals: string[] = [
    ...Object.values(PIG_AXES),
    ...Object.values(PIG_GALLERY),
    ...Object.values(PIG_OVERVIEW),
    ...Object.values(PIG_FARM),
    ...Object.values(PIG_DISEASE),
    ...Object.values(PIG_PRICE),
    ...Object.values(PIG_ISSUER),
    ...Object.values(PIG_FILING),
    PIG_MARKET.limitation,
  ];
  for (const product of PIG_DISCLOSURE_PRODUCTS) {
    literals.push(
      product.productName,
      product.statusLabel,
      product.farm.name,
      product.farm.region,
      product.farm.supplier,
      product.farm.participationHistory,
      product.settlement.publicSummary,
      ...product.documents.map((document) => document.label),
    );
  }
  for (const event of PIG_ASF_EVENTS) literals.push(event.region);
  return literals.filter((text) => text.length > 0);
};
