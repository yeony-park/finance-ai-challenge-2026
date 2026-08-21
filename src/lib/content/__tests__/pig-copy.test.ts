import { describe, expect, test } from "vitest";

import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import {
  PIG_AXES,
  PIG_DISCLOSURE_PRODUCTS,
  pigCopyStrings,
} from "../pig";

const ALL_COPY = pigCopyStrings();

// 판정·등급으로 읽히는 어휘. "등급"·"점수"는 공식 데이터셋명("축산물 등급별
// 경락가격")과 충돌하므로 문맥 인식 출력 필터(materiality-grade·aggregate-score)에
// 위임하고, 여기서는 명백한 판단 어휘만 문자열로 막는다.
const BANNED_VOCAB = ["안전", "우수", "저위험", "매수 적합", "추천"];
// 조각으로 나눠 결합한다 — 이 소스 파일 자체에 원문 실명 리터럴이 연속으로
// 남지 않게 해서 실명 grep(완료 기준)이 탐지기까지 오탐하지 않도록 한다.
const FORBIDDEN_NAME_PATTERN = new RegExp(
  [
    ["데이터", "젠"],
    ["무", "주"],
    ["옥", "산"],
    ["0193", "6340"],
    ["문", "수"],
    ["원", "준"],
    ["연", "정"],
    ["현", "석"],
  ]
    .map((parts) => parts.join(""))
    .join("|"),
);

describe("한돈 문안 — 출력 필터 전건 통과", () => {
  test.each(ALL_COPY)("필터 통과: %s", (text) => {
    const result = filterOutput(text);
    expect(result.violations, text).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("한돈 데이터 — 접수번호·회차 카운트 고정", () => {
  test("회차는 3건이다", () => {
    expect(PIG_DISCLOSURE_PRODUCTS).toHaveLength(3);
  });

  test("접수번호(rcpNo)는 총 12건이다", () => {
    const rceptNos = PIG_DISCLOSURE_PRODUCTS.flatMap((product) =>
      product.documents.map((document) => document.rceptNo),
    );
    expect(rceptNos).toHaveLength(12);
    for (const rceptNo of rceptNos) {
      expect(rceptNo, rceptNo).toMatch(/^\d{14}$/);
    }
  });

  test("접수번호는 서로 중복되지 않는다", () => {
    const rceptNos = PIG_DISCLOSURE_PRODUCTS.flatMap((product) =>
      product.documents.map((document) => document.rceptNo),
    );
    expect(new Set(rceptNos).size).toBe(12);
  });
});

describe("한돈 실명 중립화 — 원문 실명 0건", () => {
  test("전 문안·데이터에 원문 실명·식별자가 남아 있지 않다", () => {
    const serialized = JSON.stringify({
      copy: ALL_COPY,
      products: PIG_DISCLOSURE_PRODUCTS,
    });
    expect(serialized).not.toMatch(FORBIDDEN_NAME_PATTERN);
  });
});

describe("한돈 판정 어휘 — 3값 밖 어휘 금지", () => {
  test("금지 어휘가 문안에 등장하지 않는다", () => {
    for (const text of ALL_COPY) {
      for (const banned of BANNED_VOCAB) {
        expect(text.includes(banned), `${banned} in: ${text}`).toBe(false);
      }
    }
  });

  test("원장 축 상태는 대조 불가 3값 어휘만 쓴다", () => {
    expect(PIG_AXES.ledgerVerdict).toBe("대조 불가");
  });
});
