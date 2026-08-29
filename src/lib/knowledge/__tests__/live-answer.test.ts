import { describe, expect, it } from "vitest";
import {
  checkLiveAnswerLimit,
  containsCredentialLikeSecret,
  isLiveEvidenceEnabled,
  validateLiveAnswerDraft,
  type LiveAnswerInput,
} from "../live-answer";

const input = (): LiveAnswerInput => ({
  question: "제곱미터를 설명해 주세요",
  evidence: [{
    sourceId: "document-001",
    chunkId: "chunk-001",
    documentId: "document-001",
    categoryId: "real-estate",
    productId: "offer-001",
    scenarioId: "scenario-001",
    title: "건축물대장",
    page: 1,
    excerpt: "연면적은 1,000 제곱미터입니다.",
    sourceUrl: "https://example.com/document",
    asOf: "2026-08-24",
    dataNature: "observed",
    sourceKind: "official-document",
    sourceHash: "a".repeat(64),
    chunkHash: "b".repeat(64),
    status: "ready",
    approvedForExternalAi: true,
    piiReviewStatus: "passed",
    limitations: [],
    score: 10,
  }],
});

describe("live evidence answer guardrails", () => {
  it("분당 10회와 rolling day 100회 비용 한도를 순수하게 판정한다", () => {
    const now = 1_800_000_000_000;
    const minuteFull = { calls: Array.from({ length: 10 }, (_, index) => now - index) };
    expect(checkLiveAnswerLimit(minuteFull, now).allowed).toBe(false);

    const dayFull = { calls: Array.from({ length: 100 }, (_, index) => now - 120_000 - index) };
    expect(checkLiveAnswerLimit(dayFull, now).allowed).toBe(false);
    expect(checkLiveAnswerLimit({ calls: [] }, now)).toMatchObject({ allowed: true });
    expect(isLiveEvidenceEnabled("true")).toBe(true);
    expect(isLiveEvidenceEnabled("TRUE")).toBe(false);
    expect(isLiveEvidenceEnabled(undefined)).toBe(false);
  });

  it("credential은 name=value 문맥에서만 차단하고 일반 문장은 허용한다", () => {
    for (const question of [
      "client_secret=value",
      "access_key=value",
      "key=value",
      "sig=value",
      "password=value",
    ]) {
      expect(containsCredentialLikeSecret(question)).toBe(true);
    }
    expect(containsCredentialLikeSecret("비밀번호 정책과 접근 키 관리 방법을 설명해 주세요")).toBe(false);
    expect(containsCredentialLikeSecret("rcept_no=20260830000001 page=2 category=art")).toBe(false);
  });

  it("실제 excerpt의 page+exact quote와 일치하는 추출형 답변만 허용한다", () => {
    const value = input();
    expect(validateLiveAnswerDraft({
      answer: "연면적은 1,000 제곱미터입니다.",
      citations: [{
        chunkId: "chunk-001",
        page: 1,
        exactQuote: "연면적은 1,000 제곱미터입니다.",
      }],
    }, value)).toEqual({
      answer: "연면적은 1,000 제곱미터입니다.",
      citedChunkIds: ["chunk-001"],
      citations: [{
        chunkId: "chunk-001",
        page: 1,
        exactQuote: "연면적은 1,000 제곱미터입니다.",
      }],
    });
    expect(validateLiveAnswerDraft({
      answer: "신뢰할 수 있는 건물입니다.",
      citations: [{ chunkId: "chunk-001", page: 1, exactQuote: "신뢰할 수 있는 건물입니다." }],
    }, value)).toBeNull();
    expect(validateLiveAnswerDraft({
      answer: "연면적은 1,000 제곱미터입니다.",
      citations: [{ chunkId: "chunk-001", page: 2, exactQuote: "연면적은 1,000 제곱미터입니다." }],
    }, value)).toBeNull();
    expect(validateLiveAnswerDraft({
      answer: "연면적은 1,000 제곱미터입니다.",
      citations: [{
        chunkId: "other-chunk",
        page: 1,
        exactQuote: "연면적은 1,000 제곱미터입니다.",
      }],
    }, value)).toBeNull();
  });

  it("서로 다른 dataNature 근거는 실시간 합성하지 않는다", () => {
    const value = input();
    expect(validateLiveAnswerDraft({
      answer: "연면적은 1,000 제곱미터입니다.",
      citations: [{
        chunkId: "chunk-001",
        page: 1,
        exactQuote: "연면적은 1,000 제곱미터입니다.",
      }],
    }, {
      ...value,
      evidence: [...value.evidence, {
        ...value.evidence[0],
        chunkId: "scenario-chunk",
        dataNature: "scenario",
        sourceKind: "scenario-input",
      }],
    })).toBeNull();
  });

  it("원문에 있더라도 투자 행동을 지시하는 답변은 출력 필터로 차단한다", () => {
    const value = input();
    const recommendation = "이 상품을 지금 반드시 매수하세요.";
    expect(validateLiveAnswerDraft({
      answer: recommendation,
      citations: [{ chunkId: "chunk-001", page: 1, exactQuote: recommendation }],
    }, {
      ...value,
      evidence: [{ ...value.evidence[0], excerpt: recommendation }],
    })).toBeNull();
  });
});
