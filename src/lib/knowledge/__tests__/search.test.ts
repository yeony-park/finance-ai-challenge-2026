import { describe, expect, it } from "vitest";
import { buildDeterministicCachedAnswer, answerFromEvidence } from "../evidence";
import { loadKnowledgeScope } from "../loader";
import { isRankingRequest, normalizeSearchQuery, searchChunks } from "../search";
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

  it("승인 표준 질문을 실제 PDF의 관련 쪽에 연결하고 재생성 cache를 사용한다", async () => {
    const scope = await loadKnowledgeScope("re-scenario-01", "re-offer-01");
    const cases = [
      ["최소투자금은 얼마인가요?", 4],
      ["예상배당과 분배 주기는 어떻게 되나요?", 5],
      ["수수료는 어떻게 되나요?", 5],
      ["운용기간과 매각조건은 무엇인가요?", 6],
      ["건물정보는 어디까지 확인됐나요?", 9],
      ["운영그룹의 과거이력은 무엇인가요?", 8],
    ] as const;

    for (const [q, page] of cases) {
      const query = { scenarioId: "re-scenario-01", offerId: "re-offer-01", q, limit: 5 };
      const hits = searchChunks(scope.chunks, q, 5);
      expect(hits.length, q).toBeGreaterThan(0);
      expect(hits.map((hit) => hit.page), q).toContain(page);

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

    const history = searchChunks(scope.chunks, cases[5][0], 5);
    expect(history[0]).toMatchObject({
      chunkId: "re-scenario-01-product-description-p8",
      page: 8,
    });
  });
});
