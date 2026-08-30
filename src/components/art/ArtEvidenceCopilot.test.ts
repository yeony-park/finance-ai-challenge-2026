import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import type { ArtProduct } from "@/lib/art/product-model";
import { ART_PRODUCT_MEDIA_BY_ID } from "@/lib/art/product-model";

import {
  canonicalCompareUrl,
  parseCompareParam,
} from "./ArtCompareSection";
import {
  ArtEvidenceCopilot,
  isAllowedCitationUrl,
} from "./ArtEvidenceCopilot";
import {
  ArtFactsSection,
  canonicalArtProductUrl,
  parseArtProductParam,
} from "./ArtFactsSection";

const product: ArtProduct = {
  id: "art-9",
  label: "주입된 테스트 상품",
  categoryId: "art",
  provenance: "manual_verified",
  media: {
    imageUrl: null,
    imageType: "missing",
    sourcePageUrl: null,
  },
  offering: { amountWon: 300_000_000 },
  art: {
    acquisitionWon: 270_000_000,
    issuanceCostWon: 30_000_000,
    lifecycle: "청약 완료",
    asOf: "2026-08-30",
  },
  assessment: {
    verdict: "match",
    statusNote: "공모가격 구성 확인",
    priceChain: "취득가 + 발행비용 = 공모가",
    finding: "공시 수치 합계가 일치합니다.",
    limitation: "가치와 처분 가능성을 뜻하지 않습니다.",
    sourceNote: null,
  },
  evidence: [
    {
      id: "art-9:dart:20240116000005",
      label: "DART 투자설명서",
      rcpNo: "20240116000005",
      asOf: "2024-01-16",
      url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240116000005",
    },
  ],
};

describe("미술품 분석 UI", () => {
  test("repository DTO로 카드·차트·Copilot 상품 선택을 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(ArtFactsSection, { products: [product] }),
    );

    expect(html).toContain('id="art-product-art-9"');
    expect(html).toContain("주입된 테스트 상품");
    expect(html).toContain("분석할 미술품 선택");
    expect(html).toContain("작품 이미지 미등록");
    expect(html).not.toContain("art-placeholder.svg");
    expect(html).toContain('aria-controls="art-selected-product evidence-copilot"');
    expect(html).toContain("공시 근거에 질문하기");
    expect(html).toContain('value="art-9"');
    expect(html).toContain('maxLength="1000"');
    expect(html).not.toContain("상품 1");
  });

  test("승인된 공식 작품 이미지는 자르지 않는 선택 카드와 원문 링크를 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(ArtFactsSection, {
        products: [{ ...product, media: ART_PRODUCT_MEDIA_BY_ID["art-1"] }],
      }),
    );

    expect(html).toContain('alt="주입된 테스트 상품 공식 작품 이미지"');
    expect(html).toContain("작품 원문 ↗");
    expect(html).toContain(
      "https://weshareart.com/goods/subscription/detail/169",
    );
  });

  test("Copilot은 네 가지 빠른 질문과 빈 상품 상태를 제공한다", () => {
    const html = renderToStaticMarkup(
      createElement(ArtEvidenceCopilot, { products: [] }),
    );

    expect(html.match(/aria-pressed=/g)).toHaveLength(4);
    expect(html).toContain("연결할 상품이 없습니다");
    expect(html).toContain("근거 연결형 응답");
  });

  test("출처 링크는 HTTPS DART 호스트만 허용한다", () => {
    expect(
      isAllowedCitationUrl(
        "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240116000005",
      ),
    ).toBe(true);
    expect(
      isAllowedCitationUrl(
        "http://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240116000005",
      ),
    ).toBe(false);
    expect(
      isAllowedCitationUrl("https://dart.fss.or.kr.example.com/source"),
    ).toBe(false);
    expect(isAllowedCitationUrl("javascript:alert(1)")).toBe(false);
  });

  test("비교 선택을 중복 제거·최대 3개로 정규화한다", () => {
    const validIds = new Set(["art-1", "art-2", "art-3", "art-4"]);
    expect(
      parseCompareParam(
        "?tab=analysis&compare=art-2,bad,art-2,art-1,art-3,art-4",
        validIds,
      ),
    ).toEqual(["art-2", "art-1", "art-3"]);
  });

  test("비교 URL 갱신 시 탭·상태·해시를 보존한다", () => {
    const next = canonicalCompareUrl(
      "https://example.test/art?tab=analysis&status=closed#evidence-copilot",
      "art-1,art-2",
    );

    expect(next).toBe(
      "/art?tab=analysis&status=closed&compare=art-1%2Cart-2#evidence-copilot",
    );
  });

  test("이미지 상품 선택은 유효 id만 받고 기존 URL 상태를 보존한다", () => {
    const validIds = new Set(["art-1", "art-2"]);
    expect(
      parseArtProductParam("?tab=analysis&product=art-2", validIds, "art-1"),
    ).toBe("art-2");
    expect(
      parseArtProductParam("?tab=analysis&product=bad", validIds, "art-1"),
    ).toBe("art-1");

    expect(
      canonicalArtProductUrl(
        "https://example.test/art?tab=analysis&compare=art-1%2Cart-2#evidence-copilot",
        "art-2",
      ),
    ).toBe(
      "/art?tab=analysis&compare=art-1%2Cart-2&product=art-2#evidence-copilot",
    );
  });
});
