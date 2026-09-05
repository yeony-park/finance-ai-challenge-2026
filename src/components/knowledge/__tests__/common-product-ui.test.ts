import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import type { CommonKnowledgeScope } from "@/lib/knowledge/loader";
import type { CommonProductRecord } from "@/lib/knowledge/schema";
import {
  commonProductHref,
  commonProductStaticParams,
  findCommonProduct,
  isCommonProductCategory,
} from "@/lib/knowledge/common-route";

import {
  COMMON_EVIDENCE_EXAMPLES,
  EvidenceQuery,
  evidenceRequestBody,
} from "@/components/ai-assistant/EvidenceQuery";
import {
  CommonProductDetail,
  commonEvidenceScope,
  commonProductMetadata,
} from "../CommonProductDetail";

const CATEGORIES = ["cattle", "pig", "art", "real-estate"] as const;
const CATEGORY_LABEL = { cattle: "한우", pig: "돼지", art: "미술품", "real-estate": "부동산" } as const;
const HASH = "a".repeat(64);

const productFixture = (categoryId: typeof CATEGORIES[number]): CommonProductRecord => ({
  schemaVersion: 1,
  categoryId,
  productId: `${categoryId}-common-fixture`,
  title: `${CATEGORY_LABEL[categoryId]} 공통 상품`,
  aliases: [],
  dataNature: "observed",
  asOf: "2026-08-29",
  status: "public",
  phase: "subscription-open",
  approvedForPublic: true,
});

const scopeFixture = (product: CommonProductRecord): CommonKnowledgeScope => ({
  product,
  documents: [{
    schemaVersion: 1,
    categoryId: product.categoryId,
    productId: product.productId,
    documentId: `${product.categoryId}-document`,
    title: `${CATEGORY_LABEL[product.categoryId]} 상품설명서`,
    publisher: "공개 문서 발행기관",
    sourceKind: "official-document",
    sourceUrl: `https://example.com/${product.categoryId}/evidence.pdf`,
    asOf: "2026-08-28",
    collectedAt: "2026-08-29T00:00:00.000Z",
    dataNature: "observed",
    rightsStatus: "permission-confirmed",
    approvedForPublic: true,
    sourceHash: HASH,
    status: "partial",
    pages: [
      { page: 1, quality: "ready", limitations: [] },
      { page: 2, quality: "unsupported_scan", limitations: ["2쪽은 OCR 적용 전입니다."] },
    ],
    limitations: ["부분 처리 문서입니다."],
  }],
  chunks: [],
});

describe("공통 상품 자동 상세 UI", () => {
  test("같은 productId도 category별 canonical URL과 static params를 분리한다", () => {
    const cattle = { ...productFixture("cattle"), productId: "shared-id", title: "한우 동명 상품" };
    const art = { ...productFixture("art"), productId: "shared-id", title: "미술품 동명 상품" };
    const params = commonProductStaticParams([cattle, art, cattle]);

    expect(params).toEqual([
      { categoryId: "cattle", productId: "shared-id" },
      { categoryId: "art", productId: "shared-id" },
    ]);
    expect(commonProductHref("cattle", "shared-id")).toBe("/offers/common/cattle/shared-id");
    expect(commonProductHref("art", "shared-id")).toBe("/offers/common/art/shared-id");
    expect(commonProductHref("cattle", "shared-id")).not.toBe("/offers/shared-id");
    expect(findCommonProduct([cattle, art], "cattle", "shared-id")?.title).toBe("한우 동명 상품");
    expect(findCommonProduct([cattle, art], "art", "shared-id")?.title).toBe("미술품 동명 상품");
    expect(commonProductMetadata(findCommonProduct([cattle, art], "cattle", "shared-id")!).title)
      .toBe("한우 동명 상품");
    expect(commonProductMetadata(findCommonProduct([cattle, art], "art", "shared-id")!).title)
      .toBe("미술품 동명 상품");
    expect(renderToStaticMarkup(createElement(CommonProductDetail, { scope: scopeFixture(cattle) })))
      .toContain("한우 동명 상품");
    expect(renderToStaticMarkup(createElement(CommonProductDetail, { scope: scopeFixture(art) })))
      .toContain("미술품 동명 상품");
    expect(isCommonProductCategory("unknown")).toBe(false);
  });

  test("4개 카테고리 metadata를 보수적으로 noindex 처리한다", () => {
    for (const categoryId of CATEGORIES) {
      const product = productFixture(categoryId);
      const metadata = commonProductMetadata(product);
      expect(metadata.title).toBe(product.title);
      expect(metadata.description).toContain(CATEGORY_LABEL[categoryId]);
      expect(metadata.description).toContain(product.asOf);
      expect(metadata.robots).toEqual({ index: false, follow: false });
    }
  });

  test("4개 카테고리에서 상품 개요와 partial·OCR 제외 한계를 공통 렌더한다", () => {
    for (const categoryId of CATEGORIES) {
      const product = productFixture(categoryId);
      const markup = renderToStaticMarkup(createElement(CommonProductDetail, { scope: scopeFixture(product) }));
      expect(markup).toContain(product.title);
      expect(markup).toContain(CATEGORY_LABEL[categoryId]);
      expect(markup).toContain("실제 공개정보");
      expect(markup).toContain("공개·검색 가능 문서 1건");
      expect(markup).toContain("부분 검색 가능");
      expect(markup).toContain("1/2쪽 검색 가능");
      expect(markup).toContain("2쪽 OCR이 필요한 스캔");
      expect(markup).toContain("2쪽은 OCR 적용 전입니다");
      expect(markup).toContain(`href="https://example.com/${categoryId}/evidence.pdf"`);
      expect(markup).toContain('target="_blank"');
      expect(markup).toContain('rel="noopener noreferrer"');
      expect(markup).toContain("(새 창)");
      expect(markup).not.toContain(commonProductHref(product.categoryId, product.productId));
      expect(markup).not.toMatch(/상품 범위 근거 질문|승인된 답변|구조화 관측|답변 방식|공개 승인 PDF/);
      expect(markup).not.toContain("<main");
      for (const example of COMMON_EVIDENCE_EXAMPLES) expect(markup).toContain(example);
    }
  });

  test("common 질의는 exact scope body를 쓰고 legacy scenario body는 유지한다", () => {
    for (const categoryId of CATEGORIES) {
      const product = productFixture(categoryId);
      expect(evidenceRequestBody(commonEvidenceScope(product), "  핵심 조건  ")).toEqual({
        categoryId,
        productId: product.productId,
        dataNature: "observed",
        namespace: "common",
        q: "핵심 조건",
        limit: 5,
      });
    }
    const scenarioProduct: CommonProductRecord = {
      ...productFixture("real-estate"),
      productId: "real-estate-scenario-fixture",
      scenarioId: "scenario-fixture",
      dataNature: "scenario",
    };
    expect(evidenceRequestBody(commonEvidenceScope(scenarioProduct), "위험 요인"))
      .toEqual({
        categoryId: "real-estate",
        productId: "real-estate-scenario-fixture",
        scenarioId: "scenario-fixture",
        dataNature: "scenario",
        namespace: "common",
        q: "위험 요인",
        limit: 5,
      });
    expect(evidenceRequestBody(commonEvidenceScope(productFixture("cattle")), "핵심 조건"))
      .not.toHaveProperty("scenarioId");
    expect(evidenceRequestBody({ scenarioId: "scenario-1", offerId: "offer-1" }, "수수료"))
      .toEqual({ scenarioId: "scenario-1", offerId: "offer-1", q: "수수료", limit: 5 });
    const markup = renderToStaticMarkup(createElement(EvidenceQuery, {
      scope: { categoryId: "art", productId: "art-common-fixture", dataNature: "observed", namespace: "common" },
      examples: COMMON_EVIDENCE_EXAMPLES,
      lead: "공개 승인 PDF 범위에서만 찾습니다.",
    }));
    expect(markup).toContain("공개 승인 PDF 범위에서만 찾습니다");
  });

  test("공통 문서의 비HTTP URL은 링크로 만들지 않는다", () => {
    const product = productFixture("cattle");
    const scope = scopeFixture(product);
    const unsafeScope: CommonKnowledgeScope = {
      ...scope,
      documents: [{ ...scope.documents[0], sourceUrl: "javascript:alert(1)" }],
    };
    const markup = renderToStaticMarkup(createElement(CommonProductDetail, { scope: unsafeScope }));
    expect(markup).not.toContain('href="javascript:');
    expect(markup).toContain("원문 링크 확인 불가");
  });
});
