/**
 * 분석 코퍼스 접근자 — 생성 파일(generated.ts)의 조회 계층.
 * UI 상품 선택 옵션도 여기서 파생한다.
 */
import { ANALYSIS_CORPUS } from "./corpus/generated";
import type { CorpusProduct, StandardTerms } from "./types";

const productById = new Map(
  ANALYSIS_CORPUS.products.map((p) => [p.productId, p]),
);
const standardById = new Map(
  ANALYSIS_CORPUS.standards.map((s) => [s.id, s]),
);

export const findProduct = (productId: string): CorpusProduct | undefined =>
  productById.get(productId);

export const findStandard = (id: string): StandardTerms | undefined =>
  standardById.get(id);

export interface ProductOption {
  readonly productId: string;
  readonly insurer: string;
  readonly category: string;
  readonly productName: string;
  readonly demo: boolean;
}

/** UI 3탭(보험사 → 상품군 → 상품) 캐스케이드용 옵션 목록 */
export const productOptions = (): readonly ProductOption[] =>
  ANALYSIS_CORPUS.products.map((p) => ({
    productId: p.productId,
    insurer: p.insurer,
    category: p.category,
    productName: p.productName,
    demo: p.demo,
  }));
