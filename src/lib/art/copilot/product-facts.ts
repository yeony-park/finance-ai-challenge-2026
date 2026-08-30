import { createHash } from "node:crypto";

import type { ArtProduct } from "@/lib/art/product-model";

export interface CopilotEvidenceLink {
  readonly id: string;
  readonly title: string;
  readonly url: string;
}

export interface ProductFactBlock {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly evidence: readonly CopilotEvidenceLink[];
}

const RECEIPT_ALLOWLIST: Readonly<Record<string, readonly string[]>> = {
  "art-1": ["20240116000005", "20240125000013"],
  "art-2": ["20240325000139", "20240403003155"],
  "art-3": ["20260512000391", "20260513000002", "20260529000528"],
  "art-4": ["20260513000002"],
  "art-5": [],
};

const isSafeDartEvidence = (
  evidence: ArtProduct["evidence"][number],
): boolean => {
  try {
    const url = new URL(evidence.url);
    const expectedUrl = `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${evidence.rcpNo}`;
    return (
      url.protocol === "https:" &&
      url.hostname === "dart.fss.or.kr" &&
      url.pathname === "/dsaf001/main.do" &&
      url.searchParams.get("rcpNo") === evidence.rcpNo &&
      evidence.url === expectedUrl
    );
  } catch {
    return false;
  }
};

export const safeProductEvidence = (
  product: ArtProduct,
): readonly CopilotEvidenceLink[] => {
  const allowedReceipts = new Set(RECEIPT_ALLOWLIST[product.id] ?? []);
  if (allowedReceipts.size === 0) return [];

  const seen = new Set<string>();
  return product.evidence.flatMap((evidence) => {
    if (
      seen.has(evidence.id) ||
      !isSafeDartEvidence(evidence) ||
      !allowedReceipts.has(evidence.rcpNo) ||
      evidence.id !== `${product.id}:dart:${evidence.rcpNo}`
    ) {
      return [];
    }

    seen.add(evidence.id);
    return [
      {
        id: evidence.id,
        title: evidence.label,
        url: evidence.url,
      },
    ];
  });
};

const displayWon = (value: number | null): string =>
  value === null ? "기재 없음" : `${value.toLocaleString("ko-KR")}원`;

export const buildProductFactBlocks = (
  product: ArtProduct,
): readonly ProductFactBlock[] => {
  const evidence = safeProductEvidence(product);
  if (evidence.length === 0) return [];

  const sourceNames = evidence.map((item) => item.title).join(" · ");
  const facts: ProductFactBlock[] = [
    {
      id: "fact-offering-amount",
      title: "공모금액",
      text: `공모금액 ${displayWon(product.offering.amountWon)}`,
      evidence,
    },
    {
      id: "fact-acquisition",
      title: "취득가",
      text: `취득가 ${displayWon(product.art.acquisitionWon)}`,
      evidence,
    },
    {
      id: "fact-issuance-cost",
      title: "발행비용",
      text: `발행비용 ${displayWon(product.art.issuanceCostWon)}`,
      evidence,
    },
    {
      id: "fact-price-chain",
      title: "공시 기재 순서",
      text: product.assessment.priceChain,
      evidence,
    },
    {
      id: "fact-lifecycle",
      title: "상품 상태",
      text: `상품 상태 ${product.art.lifecycle}`,
      evidence,
    },
    {
      id: "fact-as-of",
      title: "데이터 기준일",
      text: `데이터 기준일 ${product.art.asOf}`,
      evidence,
    },
    {
      id: "fact-status-note",
      title: "근거 상태",
      text: product.assessment.statusNote,
      evidence,
    },
    {
      id: "fact-finding",
      title: "확인 결과",
      text: product.assessment.finding,
      evidence,
    },
    {
      id: "fact-limitation",
      title: "확인 한계",
      text: product.assessment.limitation,
      evidence,
    },
    {
      id: "fact-evidence",
      title: "연결 공시",
      text: `연결된 공시 근거 ${sourceNames}`,
      evidence,
    },
  ];

  if (product.assessment.sourceNote) {
    facts.push({
      id: "fact-source-note",
      title: "출처 메모",
      text: product.assessment.sourceNote,
      evidence,
    });
  }

  return facts;
};

const selectedIds = (
  question: string,
): readonly string[] => {
  if (
    /작가|작품명|플랫폼|거래량|경매|유찰|낙찰|청산|매각|회수|지연|수익률/i.test(
      question,
    )
  ) {
    return [];
  }

  if (/가격|금액|공모|취득|비용|구성|산식/i.test(question)) {
    return [
      "fact-offering-amount",
      "fact-acquisition",
      "fact-issuance-cost",
      "fact-price-chain",
    ];
  }
  if (/근거|출처|문서|DART|다트|공시/i.test(question)) {
    return [
      "fact-evidence",
      "fact-as-of",
      "fact-finding",
      "fact-limitation",
    ];
  }
  if (/상태|청약|보유|기준일|언제|날짜/i.test(question)) {
    return ["fact-lifecycle", "fact-as-of", "fact-status-note"];
  }
  if (/위험|판정|왜|보류|제한|한계|긍정|확인/i.test(question)) {
    return ["fact-status-note", "fact-finding", "fact-limitation"];
  }

  return [];
};

export const selectProductFactBlocks = (
  question: string,
  blocks: readonly ProductFactBlock[],
): readonly ProductFactBlock[] => {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  return selectedIds(question)
    .flatMap((id) => byId.get(id) ?? [])
    .slice(0, 4);
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0,
        )
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
};

export const productSnapshotVersion = (product: ArtProduct): string =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(product)))
    .digest("hex");
