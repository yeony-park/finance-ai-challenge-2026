import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { EMPTY_PROFILE, useProfile } from "@/components/site/profile";
import { CATEGORY_IDS, categoryById } from "@/lib/content/categories";
import { TRUST_CHECKLIST } from "@/lib/content/checklist";

import { ChecklistBand } from "./ChecklistBand";

vi.mock("@/components/site/profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/site/profile")>();
  return { ...actual, useProfile: vi.fn(() => actual.EMPTY_PROFILE) };
});

const renderChecklist = () => renderToStaticMarkup(createElement(ChecklistBand));

const categoryHrefs = (html: string) =>
  [...html.matchAll(/href="(\/art|\/pig|\/cattle|\/real-estate)"/g)].map((match) => match[1]);

describe("관심 카테고리별 확인목록", () => {
  beforeEach(() => {
    vi.mocked(useProfile).mockReturnValue(EMPTY_PROFILE);
  });

  test("질문 제목과 공적 확인 경로를 유지한다", () => {
    const html = renderChecklist();
    expect(html.match(/<details/g)).toHaveLength(TRUST_CHECKLIST.length);
    expect(html).toContain("증권신고서가 있는가");
    expect(html).toContain("이 상품의 증권신고서가 전자공시(DART)에 제출돼 있나요?");
    expect(html).toContain('href="https://dart.fss.or.kr"');
  });

  test.each(CATEGORY_IDS)("%s만 선택하면 모든 질문에서 해당 카테고리만 연결한다", (id) => {
    vi.mocked(useProfile).mockReturnValue({ ...EMPTY_PROFILE, interests: [id] });
    const html = renderChecklist();
    const category = categoryById(id);
    expect(categoryHrefs(html)).toEqual(TRUST_CHECKLIST.map(() => category.href));
    expect(html).toContain(`${category.label} 공모에서 확인하기`);
    expect(html).not.toContain("한우 9호");
    expect(html).not.toContain("/products/");
    expect(html).not.toContain("가장 최근 공시");
  });

  test("여러 관심 카테고리를 선택하면 선택 순서대로 링크를 제공한다", () => {
    vi.mocked(useProfile).mockReturnValue({ ...EMPTY_PROFILE, interests: ["art", "pig"] });
    expect(categoryHrefs(renderChecklist())).toEqual(TRUST_CHECKLIST.flatMap(() => ["/art", "/pig"]));
  });

  test("관심 카테고리가 없으면 네 카테고리 선택 경로를 제공한다", () => {
    expect(categoryHrefs(renderChecklist())).toEqual(
      TRUST_CHECKLIST.flatMap(() => CATEGORY_IDS.map((id) => categoryById(id).href)),
    );
  });

  test("관심 질문 우선 표시와 카테고리 선택은 함께 적용된다", () => {
    vi.mocked(useProfile).mockReturnValue({ ...EMPTY_PROFILE, concern: "exit-structure", interests: ["art"] });
    const html = renderChecklist();
    expect(html.indexOf("언제 팔 수 있는지 아는가")).toBeLessThan(html.indexOf("증권신고서가 있는가"));
    expect(categoryHrefs(html)).toEqual(TRUST_CHECKLIST.map(() => "/art"));
  });
});
