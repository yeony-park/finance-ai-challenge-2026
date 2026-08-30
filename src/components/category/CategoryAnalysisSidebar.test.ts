import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import type { CategoryId } from "@/lib/content/categories";

import {
  CategoryAnalysisSidebar,
  buildAnalysisFilterHref,
} from "./CategoryAnalysisSidebar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const renderSidebar = ({
  categoryId = "pig",
  hasFilterableOffers = true,
  selectedVerdict = null,
}: {
  readonly categoryId?: CategoryId;
  readonly hasFilterableOffers?: boolean;
  readonly selectedVerdict?: "match" | "mismatch" | "unverifiable" | null;
} = {}): string =>
  renderToStaticMarkup(
    createElement(CategoryAnalysisSidebar, {
      categoryId,
      categoryHref: `/${categoryId}`,
      selectedPhase: null,
      selectedVerdict,
      hasFilterableOffers,
      sections: [
        {
          id: `${categoryId}-review`,
          label: `${categoryId} 검토`,
          keywords: ["공시", "정산"],
        },
      ],
    }),
  );

describe("카테고리 분석 사이드바 URL", () => {
  test("청약 상태를 바꿔도 기존 query와 hash를 보존한다", () => {
    expect(
      buildAnalysisFilterHref({
        categoryHref: "/pig",
        currentSearch: "?product=round-1&tab=analysis&verdict=unverifiable",
        currentHash: "#pig-review",
        filter: "status",
        nextValue: "closed",
      }),
    ).toBe(
      "/pig?product=round-1&tab=analysis&verdict=unverifiable&status=closed#pig-review",
    );
  });

  test("판정을 해제할 때 verdict만 제거한다", () => {
    expect(
      buildAnalysisFilterHref({
        categoryHref: "/pig",
        currentSearch:
          "?product=round-2&tab=analysis&status=closed&verdict=unverifiable&view=compact",
        currentHash: "pig-review",
        filter: "verdict",
        nextValue: null,
      }),
    ).toBe(
      "/pig?product=round-2&tab=analysis&status=closed&view=compact#pig-review",
    );
  });
});

describe("분석 사이드바 구성", () => {
  test.each<CategoryId>(["art", "cattle", "pig", "real-estate"])(
    "%s 카테고리는 같은 기본 구조를 사용한다",
    (categoryId) => {
      const html = renderSidebar({ categoryId });
      const headings = [
        ">검색</span>",
        "<legend>판정 필터</legend>",
        "<legend>청약 상태</legend>",
        ">분석 항목</h2>",
      ];
      const positions = headings.map((heading) => html.indexOf(heading));

      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(html).not.toContain("공모 선택");
      expect(html).not.toContain("공개 공모 리포트가 연결되면");
      expect(html).toContain(`href="#${categoryId}-review"`);
    },
  );

  test("판정 필터는 전체 버튼 없이 세 판정만 표시한다", () => {
    const html = renderSidebar();

    expect(html).not.toContain(">전체<");
    expect(html).toContain(">일치<");
    expect(html).toContain(">원장 불일치<");
    expect(html).toContain(">대조 불가<");
  });

  test("URL의 판정 선택 상태를 데스크톱과 모바일에 반영한다", () => {
    const html = renderSidebar({ selectedVerdict: "unverifiable" });

    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
  });

  test("필터링할 공모 카드가 없으면 구조는 유지하고 버튼을 비활성화한다", () => {
    const html = renderSidebar({ hasFilterableOffers: false });

    expect(html).toContain("판정 필터");
    expect(html).toContain("청약 상태");
    expect(html.match(/ disabled=""/g)).toHaveLength(12);
  });
});
