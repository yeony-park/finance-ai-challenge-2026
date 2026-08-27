import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { LAYERS_SECTION_TITLE } from "@/lib/content/category-landing";

import { CategoryAboutView } from "./CategoryAboutView";

const renderAboutView = (title: string): string =>
  renderToStaticMarkup(
    createElement(CategoryAboutView, {
      title,
      lead: `${title} 설명`,
      descriptor: null,
      categoryHref: `/${title}`,
      activeTab: "about",
      heroImage: null,
      descriptionContent: null,
      descriptionContentTitle: "카테고리 안내",
    }),
  );

describe("카테고리 설명 바로가기", () => {
  test.each(["한우", "한돈", "부동산", "미술품"])(
    "%s 설명페이지에 공통 대조 바로가기를 표시한다",
    (title) => {
      const html = renderAboutView(title);

      expect(html).toContain(`href="#${title}-layers"`);
      expect(html).toContain(LAYERS_SECTION_TITLE);
    },
  );
});
