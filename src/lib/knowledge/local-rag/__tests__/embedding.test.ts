import { describe, expect, test } from "vitest";

import {
  embedDocumentBatches,
  isEmbeddingQueryEligible,
  validateEmbeddingVectors,
  type LocalRagEmbedder,
} from "../embedding";
import { LOCAL_RAG_VECTOR_DIMENSION } from "../types";

const vector = (first = 1): number[] => {
  const values = Array<number>(LOCAL_RAG_VECTOR_DIMENSION).fill(0);
  values[0] = first;
  return values;
};

describe("local RAG embedding boundary", () => {
  test("PII와 credential assignment 질문을 외부 임베딩 전에 차단한다", () => {
    expect(isEmbeddingQueryEligible("이 상품 수수료는?")).toBe(true);
    expect(isEmbeddingQueryEligible("test@example.com 상품 알려줘")).toBe(false);
    expect(isEmbeddingQueryEligible("client_secret=abc123456789 확인")).toBe(false);
  });

  test("응답 개수·1536차원·finite 값을 fail-closed 검증한다", () => {
    expect(validateEmbeddingVectors([vector()], 1)).toHaveLength(1);
    expect(() => validateEmbeddingVectors([], 1)).toThrow("count mismatch");
    expect(() => validateEmbeddingVectors([[1, 2]], 1)).toThrow("invalid embedding");
    const invalid = vector();
    invalid[4] = Number.NaN;
    expect(() => validateEmbeddingVectors([invalid], 1)).toThrow("invalid embedding");
  });

  test("문서 배치는 주입 embedder만 호출하고 순서를 보존한다", async () => {
    const calls: string[][] = [];
    const embedder: LocalRagEmbedder = {
      async embedDocuments(values) {
        calls.push([...values]);
        return values.map((_, index) => vector(index + 1));
      },
      async embedQuery() {
        throw new Error("not used");
      },
    };
    const result = await embedDocumentBatches(embedder, ["첫째", "둘째"]);
    expect(calls).toEqual([["첫째", "둘째"]]);
    expect(result.map((item) => item[0])).toEqual([1, 2]);
  });
});
