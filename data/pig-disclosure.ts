export type PigDisclosureProduct = {
  id: `round-${1 | 2 | 3}`;
  round: 1 | 2 | 3;
  productName: string;
  issuer: string;
  statusLabel: "정산 완료" | "발행 완료";
  offering: {
    heads: number;
    units: number;
    unitPriceWon: number;
    issueAmountWon: number;
    subscriptionPeriod: string;
    issuedAt: string;
  };
  farm: {
    name: string;
    region: string;
    supplier: string;
    entryDate: string;
    participationHistory: string;
  };
  pricing: {
    baselineMonth: string;
    baselinePriceWonPerKg: number;
    purchaseMultiplier: number;
    averagePigletPriceWon: number;
    averageEntryWeightKg: number;
    pigletPurchaseAmountWon: number;
  };
  settlement: {
    completed: boolean;
    completedAt?: string;
    shippedHeads: number | null;
    totalSaleWon: number | null;
    profitWon: number | null;
    realizedReturnPercent: number | null;
    publicSummary: string;
    sourceUrl: string;
  };
  documents: Array<{
    label: string;
    rceptNo: string;
    filedAt: string;
  }>;
};

function dartUrl(rceptNo: string) {
  return `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;
}

export const pigDisclosureProducts: PigDisclosureProduct[] = [
  {
    id: "round-3",
    round: 3,
    productName: "가축투자계약증권 제3호",
    issuer: "데이터젠",
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
      name: "무주농장",
      region: "전북 무주군",
      supplier: "무주팜",
      entryDate: "2026-05-28",
      participationHistory: "같은 무주농장이 제2호와 제3호 공시에 연속으로 기재돼 있습니다.",
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
      publicSummary: "DART에서는 발행 완료까지 확인됩니다. 실제 판매단가와 최종 수익률은 수집한 DART 문서에 공개된 숫자가 없습니다.",
      sourceUrl: dartUrl("20260714000008"),
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
    issuer: "데이터젠",
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
      name: "무주농장",
      region: "전북 무주군",
      supplier: "무주팜",
      entryDate: "2026-04-15",
      participationHistory: "수집한 공시에서 무주농장이 데이터젠 한돈 STO에 참여한 첫 회차는 제2호입니다.",
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
      publicSummary: "DART에서는 발행 완료까지 확인됩니다. 실제 판매단가와 최종 수익률은 수집한 DART 문서에 공개된 숫자가 없습니다.",
      sourceUrl: dartUrl("20260528001031"),
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
    issuer: "데이터젠",
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
      name: "옥산1·2농장",
      region: "전북 군산시",
      supplier: "무주팜",
      entryDate: "2025-12-11",
      participationHistory: "데이터젠이 발행한 첫 한돈 투자계약증권 회차입니다.",
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
      publicSummary: "2026년 5월 11일 정산, 수익금 28,260,808원, 세전 단순수익률 13.1%로 제3호 신고서에 기재돼 있습니다. 계좌 입금 원장까지 독립적으로 확인한 값은 아닙니다.",
      sourceUrl: dartUrl("20260624000508"),
    },
    documents: [
      { label: "최초 신고서", rceptNo: "20251215000259", filedAt: "2025-12-15" },
      { label: "기재정정 신고서", rceptNo: "20260107000209", filedAt: "2026-01-07" },
      { label: "투자설명서", rceptNo: "20260129000008", filedAt: "2026-01-29" },
      { label: "발행실적보고서", rceptNo: "20260213000150", filedAt: "2026-02-13" },
    ],
  },
];

export function getPigDisclosureProduct(productId?: string) {
  return pigDisclosureProducts.find((product) => product.id === productId) ?? pigDisclosureProducts[0];
}

export function getDartDocumentUrl(rceptNo: string) {
  return dartUrl(rceptNo);
}
