import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import OfferReportPage, { generateMetadata, generateStaticParams } from "@/app/offers/[id]/page";
import { loadApprovedScenarios } from "@/lib/knowledge/loader";
import { loadApprovedCattleFilingArtifact } from "@/lib/knowledge/cattle-filing-artifact";
import { loadApprovedPigFilingArtifact } from "@/lib/knowledge/pig-filing-artifact";
import { SCENARIO_DEMO_DISCLOSURE } from "@/lib/knowledge/schema";

import { ScenarioDetail } from "../ScenarioDetail";
import {
  cattleFilingEvidenceScope,
  CattleFilingEvidenceQuery,
  CattleMinimumFilingEvidenceQuery,
  directLimitations,
  evidenceRequestBody,
  EvidenceQuery,
  EvidenceResultPanel,
  evidenceResultTitle,
  evidenceSourceLabel,
  PIG_FILING_EVIDENCE_EXAMPLES,
  pigFilingEvidenceScope,
  PigFilingEvidenceQuery,
  safeCitationUrl,
  StructuredSourceList,
} from "../ScenarioEvidenceQuery";

describe("부동산 시나리오 상세", () => {
  test("합성 미술품 내부 근거 링크만 엄격하게 허용한다", () => {
    expect(safeCitationUrl("/art?product=synthetic-offering-01"))
      .toBe("/art?product=synthetic-offering-01");
    expect(safeCitationUrl("/art?product=synthetic-offering-1"))
      .toBeNull();
    expect(safeCitationUrl("/art?product=synthetic-offering-01&next=https://example.com"))
      .toBeNull();
  });

  test("모든 상세 화면에서 내부 구현 문구를 노출하지 않는다", async () => {
    const offers = await loadApprovedScenarios();
    for (const offer of offers) {
      const markup = renderToStaticMarkup(createElement(ScenarioDetail, {
        offer,
        operatorHistory: offers.filter(
          (entry) => entry.operatorGroupId === offer.operatorGroupId && entry.offering.phase === "settled",
        ),
      }));
      expect(markup).not.toMatch(/어떤 건물을 대상으로 하나요|공공원장 레코드|후보 주소|조건과 가정|상품 범위 근거 질문|승인된 답변|구조화 관측|답변 방식|scenario-input|근거 대조|데모 규칙 v1|완료 모집단|원장 대조|검증 규칙|데모 데이터 안내|IRR|운영그룹 [ABC] 시나리오 플랫폼 과거 완료 이력|\(파생\)|파생 계산|가상 운영주체은|과거이력|입력 일정상|화면에 등록된 검토 데이터/);
      expect(markup).not.toContain("<main");
      expect(markup).toContain('aria-label="시나리오 데이터 안내"');
    }
  });

  test("근거 유형을 생성 경로별 사용자 문구로 구분한다", () => {
    expect(evidenceResultTitle({ outcome: "answer", answerSource: "structured", structuredSources: [] }))
      .toBe("상품 조건에서 확인");
    expect(evidenceResultTitle({
      outcome: "answer",
      answerSource: "structured",
      structuredSources: [{ label: "공식 원장", url: "https://example.com", asOf: "2026-08-24", dataNature: "observed" }],
    })).toBe("공식 공개정보에서 확인");
    expect(evidenceResultTitle({ outcome: "answer", answerSource: "approved_cache" }))
      .toBe("연결된 상품 문서에서 확인");
    expect(evidenceResultTitle({ outcome: "answer", answerSource: "live_llm" }))
      .toBe("상품 원문을 바탕으로 생성한 답변");
    expect(evidenceResultTitle({ outcome: "evidence_only", answerSource: "none" }))
      .toBe("관련 문서만 확인됨");
    expect(evidenceResultTitle({ outcome: "abstain", answerSource: "none", responseKind: "scope-guidance" }))
      .toBe("검색 범위 안내");

    const base = {
      outcome: "answer" as const,
      answer: "확인한 답변",
      limitations: [] as const,
      evidence: [] as const,
    };
    expect(evidenceSourceLabel({ ...base, answerSource: "structured", structuredSources: [] }))
      .toBe("상품 조건");
    expect(evidenceSourceLabel({
      ...base,
      answerSource: "structured",
      structuredSources: [{ label: "공식 원장", url: "https://example.com", asOf: "2026-08-24", dataNature: "observed" }],
    })).toBe("공식 공개정보");
    expect(evidenceSourceLabel({
      ...base,
      answerSource: "approved_cache",
      evidence: [{
        chunkId: "chunk-1",
        title: "상품 문서",
        page: 1,
        sourceUrl: "/scenario-documents/sample.pdf",
        asOf: "2026-08-24",
        excerpt: "문서 인용",
        dataNature: "scenario",
        sourceKind: "issuer-claim",
      }],
    })).toBe("문서 근거");
  });

  test("Copilot 결과를 답변·근거·한계로 나누고 직접 연결된 한계만 표시한다", () => {
    const result = {
      outcome: "answer" as const,
      answer: "발행수량은 문서에서 확인했습니다.",
      answerSource: "approved_cache" as const,
      evidence: [{
        chunkId: "chunk-1",
        title: "상품 문서",
        page: 2,
        sourceUrl: "/scenario-documents/sample.pdf",
        asOf: "2026-08-24",
        excerpt: "발행수량 관련 문장",
        dataNature: "scenario" as const,
        sourceKind: "issuer-claim",
        limitations: ["추가 계약서는 확인하지 않았습니다.", "추가 계약서는 확인하지 않았습니다."],
      }],
      limitations: [
        "발행수량은 문서에서 확인했습니다.",
        "질문과 무관한 공통 한계",
      ],
    };
    const markup = renderToStaticMarkup(createElement(EvidenceResultPanel, { result }));

    expect(markup).toContain(">답변<");
    expect(markup).toContain(">확인 근거<");
    expect(markup).toContain(">확인 한계<");
    expect(markup).toContain("근거 유형 · 문서 근거");
    expect(markup.match(/추가 계약서는 확인하지 않았습니다/g)).toHaveLength(1);
    expect(markup).not.toContain("질문과 무관한 공통 한계");
    expect(directLimitations(result)).toEqual(["추가 계약서는 확인하지 않았습니다."]);
    expect(directLimitations({
      ...result,
      answerSource: "structured",
      evidence: [],
      limitations: ["질문과 무관한 공통 한계"],
    })).toEqual([]);

    const structuredMarkup = renderToStaticMarkup(createElement(EvidenceResultPanel, {
      result: {
        ...result,
        answer: "연면적 공개 확인값은 132,792.56㎡입니다.",
        answerSource: "structured",
        evidence: [],
        structuredSources: [{
          label: "건축물대장 공개정보",
          url: "https://example.com/building",
          asOf: "2026-08-24",
          dataNature: "observed",
        }],
        limitations: [
          "변동금리 부채상환여력은 가정값입니다.",
          "투자자 보호구조는 계약서 확인이 필요합니다.",
        ],
      },
    }));
    expect(structuredMarkup).toContain("연면적 공개 확인값은 132,792.56㎡입니다");
    expect(structuredMarkup).toContain("건축물대장 공개정보");
    expect(structuredMarkup).not.toContain("변동금리 부채상환여력은 가정값입니다");
    expect(structuredMarkup).not.toContain("투자자 보호구조는 계약서 확인이 필요합니다");
  });

  test("답변과 같은 보류 한계를 반복하지 않고 제출 버튼과 상태 영역을 유지한다", () => {
    const abstain = {
      outcome: "abstain" as const,
      answer: "현재 자료만으로 확인할 수 없습니다.",
      answerSource: "none" as const,
      evidence: [] as const,
      limitations: ["현재 자료만으로 확인할 수 없습니다."],
    };
    const resultMarkup = renderToStaticMarkup(createElement(EvidenceResultPanel, { result: abstain }));
    expect(resultMarkup.match(/현재 자료만으로 확인할 수 없습니다/g)).toHaveLength(1);
    expect(resultMarkup).toContain("추가로 구분해 표시할 확인 한계가 없습니다");

    const queryMarkup = renderToStaticMarkup(createElement(EvidenceQuery, {
      scope: { scenarioId: "scenario-1", offerId: "offer-1" },
      examples: ["핵심 조건은 무엇인가요?"],
      lead: "연결된 범위에서만 확인합니다.",
    }));
    expect(queryMarkup).toContain("Copilot에게 묻기");
    expect(queryMarkup).toContain('aria-busy="false"');
    expect(queryMarkup).toContain('role="status"');
    expect(queryMarkup).toContain('aria-live="polite"');
  });

  test("공개 한우 공시 artifact가 있는 상품만 exact 공시 Copilot 범위를 사용한다", async () => {
    await expect(loadApprovedCattleFilingArtifact("cattle", "livestock-9")).resolves.not.toBeNull();
    await expect(loadApprovedCattleFilingArtifact("cattle", "livestock-1")).resolves.not.toBeNull();
    expect(evidenceRequestBody(cattleFilingEvidenceScope("livestock-9"), " 공모가격 ")).toEqual({
      categoryId: "cattle",
      productId: "livestock-9",
      dataNature: "observed",
      namespace: "published-offer",
      q: "공모가격",
      limit: 5,
    });

    const markup = renderToStaticMarkup(createElement(CattleFilingEvidenceQuery, {
      productId: "livestock-9",
    }));
    for (const question of ["공모가격", "예상 사업기간", "수수료", "투자자보호기금"]) {
      expect(markup).toContain(question);
    }
    expect(markup).toContain("DART 공시와 축산물이력 외부 대조를 구분해 확인");
    expect(markup).toContain("투자 판단이나 생성 답변을 만들지 않습니다");
    expect(markup).not.toContain("청약 미달");

    const minimumMarkup = renderToStaticMarkup(createElement(CattleMinimumFilingEvidenceQuery, {
      productId: "livestock-1",
    }));
    expect(minimumMarkup).toContain("원금 미보장");
    expect(minimumMarkup).toContain("정정 관계, 최신 조건, 개체 실재성은 답으로 만들지 않습니다");
    expect(evidenceRequestBody(cattleFilingEvidenceScope("livestock-1"), "원금 미보장"))
      .toMatchObject({
        categoryId: "cattle",
        productId: "livestock-1",
        dataNature: "observed",
        namespace: "published-offer",
        q: "원금 미보장",
        limit: 5,
      });
  });

  test("한우 1~8호는 승인 artifact 최소 근거로 상세을 렌더한다", async () => {
    for (const id of Array.from({ length: 8 }, (_, index) => `livestock-${index + 1}`)) {
      const artifact = await loadApprovedCattleFilingArtifact("cattle", id);
      if (!artifact) throw new Error(`${id} 승인 artifact가 없습니다`);
      const page = await OfferReportPage({ params: Promise.resolve({ id }) });
      const markup = renderToStaticMarkup(page);

      expect(artifact.chunks).toHaveLength(1);
      expect(artifact.chunks[0]?.title).toBe("원금 미보장");
      expect(markup).toContain(`한우 투자계약증권 · ${id}`);
      expect(markup).toContain(artifact.document.title);
      expect(markup).toContain(artifact.registry.rcpNo);
      expect(markup).toContain(`href="${artifact.registry.source.exactPublicUrl}"`);
      expect(markup).toContain(artifact.chunks[0]!.text);
      expect(markup).toContain("공시 간 정정·보충 관계와 현재 최신값은 확정하지 않았습니다");
      expect(markup).toContain("개체의 실제 존재 여부나 사육 이력은 이 공시 문단만으로 확인할 수 없습니다");
      expect(markup.match(/<article/g)).toHaveLength(1);
      expect(markup).not.toMatch(/품종|성별|취득시기|일치 \d+건|\bRAG\b|hash|registry|최신값으로 확정|개체 실재 확인/);
    }
  });

  test("한우 9호는 기존 검증 리포트 상세을 유지한다", async () => {
    const page = await OfferReportPage({ params: Promise.resolve({ id: "livestock-9" }) });
    const markup = renderToStaticMarkup(page);
    expect(markup).toContain("한우 9호 · 한우 사육 투자계약증권");
    expect(markup).not.toContain("DART 공시에서 확인한 최소 사실");
  });

  test("승인된 한돈 artifact와 1호 exact 공시 Copilot 범위를 사용한다", async () => {
    await expect(loadApprovedPigFilingArtifact("pig", "pig-1")).resolves.not.toBeNull();
    await expect(loadApprovedPigFilingArtifact("pig", "pig-2")).resolves.not.toBeNull();
    await expect(loadApprovedPigFilingArtifact("pig", "pig-3")).resolves.not.toBeNull();
    expect(evidenceRequestBody(pigFilingEvidenceScope("pig-1"), " 공모가격과 최소 투자금 ")).toEqual({
      categoryId: "pig",
      productId: "pig-1",
      dataNature: "observed",
      namespace: "published-offer",
      q: "공모가격과 최소 투자금",
      limit: 5,
    });

    const markup = renderToStaticMarkup(createElement(PigFilingEvidenceQuery, {
      productId: "pig-1",
    }));
    for (const example of PIG_FILING_EVIDENCE_EXAMPLES) {
      expect(markup).toContain(example.label);
      expect(evidenceRequestBody(pigFilingEvidenceScope("pig-1"), example.q)).toMatchObject({
        categoryId: "pig",
        productId: "pig-1",
        dataNature: "observed",
        namespace: "published-offer",
        q: example.q,
        limit: 5,
      });
    }
    expect(markup).not.toMatch(/청약·납입 일정|투자자보상장치|수수료와 비용/);
    expect(markup).toContain("DART 공시의 상품 조건과 축산물이력 외부 대조를 구분해 확인");
    expect(markup).toContain("투자 판단이나 생성 답변을 만들지 않습니다");
    expect(markup).not.toMatch(/RAG|hash|registry/);
  });

  test("한돈 1호 상세은 승인 artifact 문단만 표시한다", async () => {
    const artifact = await loadApprovedPigFilingArtifact("pig", "pig-1");
    if (!artifact) throw new Error("한돈 1호 승인 artifact가 없습니다");
    const page = await OfferReportPage({ params: Promise.resolve({ id: "pig-1" }) });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("한돈 투자계약증권 · pig-1");
    expect(markup).toContain("공시 기준일");
    expect(markup).toContain(artifact.document.asOf);
    expect(markup).toContain(`href="${artifact.document.sourceUrl}"`);
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(artifact.chunks).toHaveLength(5);
    expect(markup).toContain("승인된 5개 문단만 보여줍니다");
    for (const chunk of artifact.chunks) {
      expect(markup).toContain(chunk.title);
      expect(markup).toContain(chunk.text);
    }
    expect(markup.match(/<article/g)).toHaveLength(5);
    expect(markup).toContain("DART 원문에서 승인된 한돈 상품 확인 문단만 구조화했습니다");
    expect(markup).toContain("원천은 XML이므로 PDF 페이지 대신 논리 페이지 1로 기록했습니다");
    expect(markup).not.toMatch(/가축투자계약증권 제[23]호|20260420000157|20260506000437|20260514000004|20260528001031|20260605000175|20260624000508|20260626000400|20260714000008|정산 완료|세전 단순수익률|28,260,808원|농장 A|농장 B·C|filing-facts|\bRAG\b|hash|registry/);
  });

  test("새로 승인된 한돈 2·3호도 artifact 상세 경로를 유지한다", async () => {
    for (const id of ["pig-2", "pig-3"]) {
      const artifact = await loadApprovedPigFilingArtifact("pig", id);
      if (!artifact) throw new Error(`${id} 승인 artifact가 없습니다`);
      const page = await OfferReportPage({ params: Promise.resolve({ id }) });
      const markup = renderToStaticMarkup(page);
      expect(markup).toContain(`한돈 투자계약증권 · ${id}`);
      expect(markup).toContain(artifact.registry.rcpNo);
      expect(markup).toContain(artifact.chunks[0]!.text);
      expect(artifact.chunks).toHaveLength(1);
      expect(markup).toContain("승인된 1개 문단만 보여줍니다");
    }
  });

  test("공식 공개정보 답변은 안전한 출처와 기준일을 표시한다", () => {
    const markup = renderToStaticMarkup(createElement(StructuredSourceList, {
      sources: [{
        label: "국토교통부 건축HUB",
        url: "https://example.com/building",
        asOf: "2026-08-24",
        dataNature: "observed" as const,
      }, {
        label: "허용하지 않는 주소",
        url: "javascript:alert(1)",
        asOf: "2026-08-24",
        dataNature: "observed" as const,
      }],
    }));

    expect(markup).toContain("공식 공개정보 출처");
    expect(markup).toContain('href="https://example.com/building"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain("2026-08-24 기준 · 공식 공개정보");
    expect(markup).not.toContain('href="javascript:');
  });

  test("종료 상품은 현금흐름, 건물, 당시 조건, 과거 검증 순서로 표시한다", async () => {
    const offers = await loadApprovedScenarios();
    const offer = offers.find((entry) => entry.offerId === "re-offer-05");
    if (!offer) throw new Error("상세 테스트 시나리오가 없습니다");
    const history = offers.filter(
      (entry) => entry.operatorGroupId === offer.operatorGroupId && entry.offering.phase === "settled",
    );
    const markup = renderToStaticMarkup(
      createElement(ScenarioDetail, { offer, operatorHistory: history }),
    );

    const basic = markup.indexOf('id="scenario-basic-title"');
    const building = markup.indexOf('id="scenario-building-title"');
    const completion = markup.indexOf("매수부터 종료까지 입력값 한눈에 보기");
    const protection = markup.indexOf('id="scenario-protection-title"');
    const review = markup.indexOf("가상 운영주체의 과거 종료 사례 검토");
    const query = markup.indexOf("AI Copilot");
    expect(basic).toBeGreaterThan(-1);
    expect(completion).toBeGreaterThan(-1);
    expect(building).toBeGreaterThan(completion);
    expect(basic).toBeGreaterThan(building);
    expect(basic).toBeGreaterThan(completion);
    expect(protection).toBeGreaterThan(basic);
    expect(review).toBeGreaterThan(basic);
    expect(query).toBeGreaterThan(review);
    expect(markup).toContain("건축물대장 공개정보와 연결된 주소 및 확인값입니다");
    expect(markup.match(/id="scenario-building-title"/g)).toHaveLength(1);
    expect(markup).toContain("1단위 권리");
    expect(markup).toContain("배당 산식");
    expect(markup).toContain("대출 조건");
    expect(markup).toContain("임대 조건 (시나리오)");
    for (const label of ["매수금액", "누적배당", "매각회수", "환급", "수수료", "추가납입"]) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain("투자기준금액 · 입력값으로 계산");
    expect(markup).toContain("세전 순회수액 · 입력값으로 계산");
    expect(markup).toContain("세전 손익 · 입력값으로 계산");
    expect(markup).toContain("단순 총수익률 · 입력값으로 계산");
    expect(markup).toContain("75.5억원");
    expect(markup).toContain("2.5억원 · 이익");
    expect(markup).toContain("3.42%");
    expect(markup.indexOf("투자기준금액 · 입력값으로 계산")).toBeLessThan(markup.indexOf("<span>매수금액</span>"));
    expect(markup).toContain("목표 종료일");
    expect(markup).toContain("실제 종료일");
    expect(markup).toContain("일정 결과");
    expect(markup).toContain("시나리오 가정 원인");
    expect(markup).toContain("단순 총수익률은 연환산 수익률이 아닙니다");
    expect(markup).toContain("현재 투자 추천이 아니라 가상 운영주체의 과거 시나리오 이력과 확인 기준을 살펴보는 사례입니다");
    expect(markup).toContain("가상 운영주체 A의 과거 종료 사례 · 2건");
    expect(markup).not.toContain(`<h4>${offer.asset.publicName}</h4>`);
    expect(markup).toContain("투자 조건은 등록된 시나리오 조건에서 확인하고");
    expect(markup).toContain("문서 질문은 해당 상품에 연결된 공개 문서 범위에서만 찾습니다");
    expect(markup).toContain("확인 자료가 없으면 답을 만들지 않고 보류합니다");
    expect(markup.split("검토용 시나리오 · 실제 청약·판매 상품이 아닙니다.")).toHaveLength(2);
    expect(markup).toContain("최소투자금은 얼마인가요?");
    expect(markup).toContain("운용기간과 매각조건은 무엇인가요?");
    expect(markup).toContain("가상 운영주체의 과거 이력은 무엇인가요?");
    expect(markup.split(SCENARIO_DEMO_DISCLOSURE)).toHaveLength(2);
    expect(markup).not.toMatch(/scenario-input|공공원장 레코드|데모 규칙 v1|완료 모집단|상품 범위 근거 질문|조건과 가정/);
  });

  test("현재 상품은 건물, 투자조건, 한눈에 보기, 보호구조, 5영역 순서로 표시한다", async () => {
    const offers = await loadApprovedScenarios();
    const offer = offers.find((entry) => entry.offerId === "re-offer-01");
    if (!offer) throw new Error("현재 상품 테스트 시나리오가 없습니다");
    const history = offers.filter(
      (entry) => entry.operatorGroupId === offer.operatorGroupId && entry.offering.phase === "settled",
    );
    const markup = renderToStaticMarkup(
      createElement(ScenarioDetail, { offer, operatorHistory: history }),
    );

    const building = markup.indexOf('id="scenario-building-title"');
    const basic = markup.indexOf('id="scenario-basic-title"');
    const glance = markup.indexOf('id="scenario-glance-title"');
    const protection = markup.indexOf('id="scenario-protection-title"');
    const review = markup.indexOf("공개정보 기반 검토 결과");
    const remaining = markup.indexOf("남은 확인 범위와 운영 이력");
    expect(building).toBeGreaterThan(-1);
    expect(basic).toBeGreaterThan(building);
    expect(glance).toBeGreaterThan(basic);
    expect(protection).toBeGreaterThan(glance);
    expect(review).toBeGreaterThan(basic);
    expect(review).toBeGreaterThan(protection);
    expect(remaining).toBeGreaterThan(review);
    expect(markup.match(/<section class="[^"]*areaCard/g)).toHaveLength(5);
    expect(markup).toContain("판단 근거");
    expect(markup).toContain("영향");
    expect(markup).toContain("다음 확인 질문");
    expect(markup).not.toMatch(/building-name|main-use|gross-floor-area|land-area|use-approval-date/);
    expect(markup).toContain("투자 적합성·안전성·수익성을 평가한 결과가 아닙니다");
    expect(markup).toContain("연결된 공개정보에서 핵심 불일치 미발견");
    expect(markup).toContain("연결된 공개정보에서 핵심 불일치를 찾지 못했다는 뜻이며, 안전성 보장이나 투자 추천이 아닙니다");
    expect(markup.match(/id="scenario-building-title"/g)).toHaveLength(1);
    expect(markup).toContain("권리와 투자자 보호구조");
    expect(markup.match(/class="[^"]*protectionItem/g)).toHaveLength(6);
    expect(markup).not.toMatch(/scenario-input|공공원장 레코드|데모 규칙 v1|완료 모집단|상품 범위 근거 질문|조건과 가정/);
  });

  test("센터원 핵심 불일치와 정정 전 판단 보류를 상단에 표시한다", async () => {
    const offers = await loadApprovedScenarios();
    const offer = offers.find((entry) => entry.offerId === "re-offer-02");
    if (!offer) throw new Error("센터원 테스트 시나리오가 없습니다");
    const markup = renderToStaticMarkup(createElement(ScenarioDetail, {
      offer,
      operatorHistory: offers.filter((entry) => entry.operatorGroupId === offer.operatorGroupId && entry.offering.phase === "settled"),
    }));

    const glance = markup.slice(markup.indexOf('id="scenario-glance-title"'), markup.indexOf('id="scenario-protection-title"'));
    expect(glance).toContain("중요한 불일치가 확인됐습니다");
    expect(glance).toContain("연면적 시나리오 조건 150,000㎡ · 건축물대장 공개정보 168,050.01㎡ · 공개정보 대비 10.74% 차이");
    expect(glance).toContain("정정 자료를 확인할 때까지 판단을 보류하세요");
    expect(glance.match(/<li/g)?.length).toBeLessThanOrEqual(4);
  });

  test("페럼과 서울파이낸스센터의 주의·미확인 상태를 사용자 문구로 표시한다", async () => {
    const offers = await loadApprovedScenarios();
    const ferrum = offers.find((entry) => entry.offerId === "re-offer-03");
    const sfc = offers.find((entry) => entry.offerId === "re-offer-04");
    if (!ferrum || !sfc) throw new Error("주의·미확인 테스트 시나리오가 없습니다");
    const render = (offer: typeof ferrum) => renderToStaticMarkup(createElement(ScenarioDetail, {
      offer,
      operatorHistory: offers.filter((entry) => entry.operatorGroupId === offer.operatorGroupId && entry.offering.phase === "settled"),
    }));
    const ferrumMarkup = render(ferrum);
    const sfcMarkup = render(sfc);

    expect(ferrumMarkup.match(/주의해서 볼 조건이 있습니다 · 금리상승 가정 부채상환여력은 [\d.]+배입니다/g)).toHaveLength(2);
    expect(ferrumMarkup).toContain("발행·유통 역할 분리");
    expect(ferrumMarkup).toContain("주의 필요");
    expect(ferrumMarkup).toContain("발행·유통 역할 분리 항목은 상품에 표시된 조건을 추가로 확인해야 합니다");
    expect(ferrumMarkup).toContain("운영주체와의 재산 분리 조건을 별도 절차로 정한 가정입니다");
    expect(ferrumMarkup).toContain("운용·분배 절차의 구분을 별도 절차로 정한 가정입니다");
    expect(ferrumMarkup).not.toMatch(/조건를|구분를/);
    expect(sfcMarkup).toContain("핵심 근거가 부족해 판단을 보류합니다");
    expect(sfcMarkup).toContain("동일 건물 미확인 · 값을 추정하지 않음");
    expect(sfcMarkup.match(/>미확인</g)).toHaveLength(6);
  });

  test("건축물대장 공개정보가 모두 미확인이면 동일 건물 확인 전으로 표시한다", async () => {
    const offers = await loadApprovedScenarios();
    const offer = offers.find((entry) => entry.asset.facts.every((fact) => fact.status === "unknown"));
    if (!offer) throw new Error("미확인 건물 시나리오가 없습니다");
    const history = offers.filter(
      (entry) => entry.operatorGroupId === offer.operatorGroupId && entry.offering.phase === "settled",
    );
    const markup = renderToStaticMarkup(
      createElement(ScenarioDetail, { offer, operatorHistory: history }),
    );

    expect(markup).toContain("주소 · 동일 건물 확인 전");
    expect(markup).toContain("같은 건물의 건축물대장 공개정보인지 확인되지 않았습니다");
    expect(markup).not.toMatch(/공공원장 레코드|후보 주소|scenario-input|상품 범위 근거 질문|조건과 가정/);
  });

  test("운영그룹 검토는 전체 완료 이력을 쓰고 화면에는 최근 3건만 표시한다", async () => {
    const offers = await loadApprovedScenarios();
    const offer = offers.find((entry) => entry.offerId === "re-offer-01");
    if (!offer) throw new Error("현재 상품 테스트 시나리오가 없습니다");
    const history = offers.filter(
      (entry) => entry.operatorGroupId === offer.operatorGroupId && entry.offering.phase === "settled",
    );
    if (!history[0] || !history[2]) throw new Error("운영그룹 이력 테스트 데이터가 부족합니다");
    const extra = {
      ...history[0],
      scenarioId: "re-scenario-extra",
      offerId: "re-offer-extra",
      asset: { ...history[0].asset, publicName: "가장 최근 추가 사례" },
      completion: { ...history[0].completion!, actualExitOn: "2026-08-01" },
    };
    const markup = renderToStaticMarkup(
      createElement(ScenarioDetail, { offer, operatorHistory: [extra, ...history] }),
    );
    const excluded = [extra, ...history]
      .toSorted((left, right) =>
        right.completion!.actualExitOn.localeCompare(left.completion!.actualExitOn),
      )
      .at(-1)!;

    expect(markup).toContain("완료 4건 중");
    expect(markup).toContain("과거 종료 사례 · 4건");
    expect(markup).toContain("최근 종료일 순 최대 3건을 표시합니다");
    expect(markup.match(/<article/g)).toHaveLength(3);
    expect(markup).toContain("가장 최근 추가 사례");
    expect(markup).not.toContain(`<h4>${excluded.asset.publicName}</h4>`);
  });

  test("승인 ID를 정적 경로에 넣고 검색 차단 메타데이터를 반환한다", async () => {
    const params = await generateStaticParams();
    expect(params).toContainEqual({ id: "re-offer-01" });
    for (let round = 1; round <= 8; round += 1) {
      expect(params).toContainEqual({ id: `livestock-${round}` });
    }
    expect(params).toContainEqual({ id: "pig-1" });
    expect(params).toContainEqual({ id: "pig-2" });
    expect(params).toContainEqual({ id: "pig-3" });
    expect(params).not.toContainEqual({ id: "real-estate-a" });

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "re-offer-01" }) });
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe("서울스퀘어");

    const pigMetadata = await generateMetadata({ params: Promise.resolve({ id: "pig-1" }) });
    expect(pigMetadata.title).toBe("한돈 투자계약증권 · pig-1");

    const cattleMetadata = await generateMetadata({ params: Promise.resolve({ id: "livestock-1" }) });
    expect(cattleMetadata.title).toBe("한우 투자계약증권 · livestock-1");
  });
});
