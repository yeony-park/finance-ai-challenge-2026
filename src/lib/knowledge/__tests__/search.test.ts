import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDeterministicCachedAnswer, answerFromEvidence } from "../evidence";
import { loadKnowledgeScope } from "../loader";
import { excerptOf, isRankingRequest, normalizeSearchQuery, preferCurrentFilingChunks, searchChunks } from "../search";
import { ParsedDocumentArtifactSchema } from "../schema";
import { validChunk } from "./fixtures";

describe("knowledge chunk search", () => {
  it("자유질문 요청어를 제거해 lexical 후보를 유지한다", () => {
    expect(searchChunks([validChunk()], "제곱미터가 어떻게 되나요", 5)[0]?.chunkId).toBe("chunk-001");
  });

  it("요청어와 조사를 보수적으로 제거하고 순위 요청을 구분한다", () => {
    expect(normalizeSearchQuery("서울스퀘어를 찾아줘")).toBe("서울스퀘어");
    expect(normalizeSearchQuery("연면적을 보여주세요")).toBe("연면적");
    expect(normalizeSearchQuery("청약 중")).toBe("청약 중");
    expect(isRankingRequest("가장 안전한 최고 상품 추천해줘")).toBe(true);
    expect(isRankingRequest("부동산 청약 상품 보여줘")).toBe(false);
  });

  it("원 query 토큰별 동의어 그룹을 모두 만족한 chunk만 반환한다", () => {
    const relevant = {
      ...validChunk(),
      chunkId: "chunk-relevant",
      text: "이 건축물의 연면적은 1,000 제곱미터입니다.",
    };
    const irrelevant = {
      ...validChunk(),
      chunkId: "chunk-irrelevant",
      title: "부동산 운영그룹 안내",
      text: "운영그룹의 역할을 설명합니다.",
    };

    expect(searchChunks([irrelevant, relevant], "건물 연면적", 20).map((hit) => hit.chunkId))
      .toEqual(["chunk-relevant"]);
    expect(searchChunks([irrelevant, relevant], "건물", 20).length).toBe(2);
    expect(searchChunks([irrelevant, relevant], "연면적을 보여주세요", 20).map((hit) => hit.chunkId))
      .toEqual(["chunk-relevant"]);
  });

  it("가격 근거 검색은 다른 자산의 공모가격 특례로 치환하지 않는다", () => {
    const saleBasis = {
      ...validChunk(),
      chunkId: "sale-basis",
      title: "매각가격 근거",
      text: "매각가격 근거는 공개 감정평가입니다.",
    };
    const offeringBasis = {
      ...validChunk(),
      chunkId: "offering-basis",
      title: "공모가격 산정",
      text: "수요예측 결과를 반영했습니다.",
    };
    expect(searchChunks([offeringBasis, saleBasis], "매각가격 근거", 5).map((hit) => hit.chunkId))
      .toEqual(["sale-basis"]);
  });

  it("일반 질문은 최신 전체 공시를 우선하고 이력 질문은 이전 공시도 유지한다", () => {
    const previous = {
      ...validChunk(),
      documentId: "cattle-livestock-9-dart-full-20260814003572",
      chunkId: "previous-protection",
      title: "증권신고서(투자계약증권) > 투자자 보호장치",
      asOf: "2026-08-14",
      text: "이전 투자자 보호장치와 분쟁처리 절차입니다.",
    };
    const current = {
      ...previous,
      documentId: "cattle-livestock-9-dart-full-20260902000022",
      chunkId: "current-protection",
      asOf: "2026-09-02",
      text: "최신 투자자 보호장치와 분쟁처리 절차입니다.",
    };

    expect(searchChunks([previous, current], "투자자 보호장치 알려줘", 5).map((hit) => hit.chunkId))
      .toEqual(["current-protection"]);
    expect(preferCurrentFilingChunks([previous, current], "정정 전후 투자자 보호장치 비교").map((chunk) => chunk.chunkId))
      .toEqual(["previous-protection", "current-protection"]);
    expect(searchChunks([previous, current], "정정 전후 투자자 보호장치 비교", 5).map((hit) => hit.chunkId))
      .toEqual(["current-protection", "previous-protection"]);
    expect(searchChunks([previous, current], "이전 투자자 보호장치", 5).map((hit) => hit.chunkId))
      .toEqual(["previous-protection", "current-protection"]);
    expect(preferCurrentFilingChunks([previous, current], "비교적 낮은 보험료").map((chunk) => chunk.chunkId))
      .toEqual(["current-protection"]);
    expect(preferCurrentFilingChunks([previous, current], "축산물이력제 조회").map((chunk) => chunk.chunkId))
      .toEqual(["current-protection"]);
  });

  it("긴 근거 미리보기는 단어 중간이 아니라 문장 경계에서 생략한다", () => {
    const excerpt = excerptOf(
      `투자자 보호장치 안내입니다. ${"보호 절차와 보상 기준을 확인합니다. ".repeat(20)}후속 내용입니다.`,
    );
    expect(excerpt.length).toBeLessThanOrEqual(320);
    expect(excerpt).toMatch(/다\.$/);
  });

  it("승인 표준 질문을 실제 PDF의 관련 쪽에 연결하고 재생성 cache를 사용한다", async () => {
    const scope = await loadKnowledgeScope("re-scenario-01", "re-offer-01");
    const cases = [
      "최소투자금은 얼마인가요?",
      "예상배당과 분배 주기는 어떻게 되나요?",
      "수수료는 어떻게 되나요?",
      "운용기간과 매각조건은 무엇인가요?",
      "건물정보는 어디까지 확인됐나요?",
      "운영그룹의 과거이력은 무엇인가요?",
    ] as const;

    for (const q of cases) {
      const query = { scenarioId: "re-scenario-01", offerId: "re-offer-01", q, limit: 5 };
      const hits = searchChunks(scope.chunks, q, 5);
      expect(hits.length, q).toBeGreaterThan(0);

      const cached = buildDeterministicCachedAnswer(scope, query, {
        createdAt: "2026-08-24T09:00:00+09:00",
        approvedAt: "2026-08-24T10:00:00+09:00",
        generatorVersion: "1",
        promptVersion: "real-estate-scenario-v1",
      });
      expect(cached.outcome, q).toBe("answer");
      expect(
        await answerFromEvidence({ ...scope, cachedAnswers: [cached] }, query),
      ).toMatchObject({ outcome: "answer", answerSource: "structured" });
    }

    const minimumInvestmentHits = searchChunks(scope.chunks, cases[0], 5).filter(
      (hit) =>
        hit.categoryId === "real-estate" &&
        hit.productId === "re-offer-01" &&
        hit.scenarioId === "re-scenario-01" &&
        hit.excerpt.includes("최소투자금"),
    );
    expect(minimumInvestmentHits).not.toHaveLength(0);

    const sourceHash = minimumInvestmentHits[0]!.sourceHash;
    const artifact = ParsedDocumentArtifactSchema.parse(JSON.parse(await readFile(
      path.join(
        process.cwd(),
        "data",
        "knowledge",
        "derived",
        "real-estate",
        "re-scenario-01",
        `parsed-${sourceHash}.json`,
      ),
      "utf8",
    )));
    expect(
      minimumInvestmentHits.some((hit) =>
        artifact.pages.some(
          (page) => page.page === hit.page && page.selected.canonicalText.includes("최소투자금"),
        ),
      ),
    ).toBe(true);

    const history = searchChunks(scope.chunks, cases[5], 5);
    expect(history[0]).toMatchObject({
      categoryId: "real-estate",
      productId: "re-offer-01",
      scenarioId: "re-scenario-01",
    });
    expect(history[0]?.excerpt).toContain("운영그룹");
  });
});
