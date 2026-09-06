import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  CATTLE_FMD_EVENTS,
  CATTLE_LSD_EVENTS,
} from "@/lib/content/livestock-disease";
import type { Claim, DocumentRef } from "@/lib/verify/types";
import type { ReportSnapshot } from "@/lib/verify/report/snapshot";

import {
  CattleDiseaseContext,
  cattleDiseaseContextForReport,
  cattleDiseaseContextForDate,
} from "./CattleDiseaseContext";

const document: DocumentRef = {
  offerId: "livestock-9",
  rcpNo: "20260806000159",
  submittedOn: "2023-10-20",
};

const custodyClaim = (id: string, value: string): Claim => ({
  id,
  kind: "custody_location",
  subject: "개체 1호",
  field: "보관장소",
  value,
  document,
  location: { section: "개체 명세", table: "보관장소", row: 1 },
  verifiability: "verifiable",
});

const report: ReportSnapshot = {
  offerId: document.offerId,
  assetKind: "livestock",
  document,
  generatedAt: "2026-08-30T00:00:00.000Z",
  mode: "fake",
  sources: ["축산물이력제 개체정보"],
  summary: { total: 2, match: 1, mismatch: 0, unverifiable: 1 },
  bySubject: [],
  judgements: [
    {
      verdict: "mismatch",
      claim: custodyClaim("custody_location:1", "경기도 테스트시 테스트읍"),
      evidence: [
        {
          sourceId: "trace",
          sourceName: "축산물이력제",
          url: "https://example.invalid/trace",
          observedAt: "2023-10-20T00:00:00.000Z",
          field: "보관장소",
          claimed: "경기도 테스트시 테스트읍",
          observed: "경상북도 관측시 관측읍",
          stance: "contradicts",
        },
      ],
      rationale: "보관장소가 일치하지 않습니다.",
    },
  ],
  unjudged: [
    {
      claim: custodyClaim("custody_location:2", "전북특별자치도 테스트군 테스트읍"),
      reason: "원장 조회 전입니다.",
    },
  ],
  pricePlacements: [],
  realEstatePlacements: [],
  notes: [],
};

describe("한우 공고별 질병 맥락", () => {
  test("지역 미연결 회차도 공시 기준일 이전 전국 지도와 미확인 상태를 제공한다", () => {
    const context = cattleDiseaseContextForDate([], "2024-02-20");
    expect(context.fmdEvents.length + context.lsdEvents.length).toBeGreaterThan(0);
    expect([...context.fmdEvents, ...context.lsdEvents].every((event) => event.occurredAt <= "2024-02-20")).toBe(true);
    const html = renderToStaticMarkup(createElement(CattleDiseaseContext, { context }));
    expect(html).toContain("전국 소 질병 공개 발생");
    expect(html).toContain("지역 미확인");
    expect(html).toContain("cattle-disease-map-heading");
  });

  test("판정·미판정 보관장소의 도를 합쳐 제출일 이전 사건만 남긴다", () => {
    const context = cattleDiseaseContextForReport(report);

    expect(context).not.toBeNull();
    if (!context) return;

    expect(context.provinces).toEqual(["경기", "경북", "전북"]);
    expect(context.disclosedProvinces).toEqual(["경기", "전북"]);
    expect(context.fmdEvents).toEqual(
      CATTLE_FMD_EVENTS.filter(
        (event) =>
          ["경기", "경북", "전북"].includes(event.province) &&
          event.occurredAt <= document.submittedOn,
      ),
    );
    expect(context.lsdEvents).toEqual(
      CATTLE_LSD_EVENTS.filter(
        (event) =>
          ["경기", "경북", "전북"].includes(event.province) &&
          event.occurredAt <= document.submittedOn,
      ),
    );
    expect(
      [...context.fmdEvents, ...context.lsdEvents].every(
        (event) => event.occurredAt <= document.submittedOn,
      ),
    ).toBe(true);
  });

  test("선택 도·제출일 기준과 비인과성 안내를 정적으로 렌더한다", () => {
    const context = cattleDiseaseContextForReport(report);

    expect(context).not.toBeNull();
    if (!context) return;

    const html = renderToStaticMarkup(
      createElement(CattleDiseaseContext, { context }),
    );

    expect(html).toContain("경기 · 경북 · 전북");
    expect(html).toContain(`공시 기준일(${context.submittedOn}) 이전의 공식 공개 발생`);
    expect(html).toContain("공고 개체나 농장과 질병 사건을 연결하지 않습니다.");
    expect(html).toContain(`구제역 ${context.fmdEvents.length}건`);
    expect(html).toContain(`럼피스킨 ${context.lsdEvents.length}건`);
    expect(html).not.toContain("경기도 테스트시");
    expect(html).not.toContain("경상북도 관측시");
    expect(html).not.toContain("전북특별자치도 테스트군");
  });
});
