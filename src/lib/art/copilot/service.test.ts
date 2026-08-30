import { describe, expect, test } from "vitest";

import type { ArtProduct } from "@/lib/art/product-model";

import {
  buildProductFactBlocks,
  productSnapshotVersion,
  safeProductEvidence,
} from "./product-facts";
import { answerProductQuestion } from "./service";

const evidence = (rcpNo: string) => ({
  id: `art-1:dart:${rcpNo}`,
  label: `DART ${rcpNo}`,
  rcpNo,
  asOf: "2026-05-13",
  url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rcpNo}`,
});

const product = (id = "art-1"): ArtProduct => ({
  id,
  label: "상품 1",
  categoryId: "art",
  provenance: "manual_verified",
  media: {
    imageUrl: null,
    imageType: "missing",
    sourcePageUrl: null,
  },
  offering: { amountWon: 1_182_000_000 },
  art: {
    acquisitionWon: 1_094_030_255,
    issuanceCostWon: 87_969_745,
    lifecycle: "청약 완료 · 작품보관",
    asOf: "2026-08-08",
  },
  assessment: {
    verdict: "unverifiable",
    statusNote: "현재 보유 상태 미확인",
    priceChain:
      "취득가 1,094,030,255원 + 비용 87,969,745원 = 공모가 1,182,000,000원",
    finding: "공시된 취득가와 비용의 합계가 총 공모금액과 일치합니다.",
    limitation: "현재 보유 상태는 독립적으로 확인하지 못했습니다.",
    sourceNote: null,
  },
  evidence: [evidence("20240116000005"), evidence("20240125000013")],
});

describe("Evidence Copilot 상품 fact", () => {
  test("art-4는 허용된 접수번호 하나만, art-5는 근거를 전혀 내보내지 않는다", () => {
    const art4 = {
      ...product("art-4"),
      evidence: [
        { ...evidence("20260512000391"), id: "art-4:dart:20260512000391" },
        { ...evidence("20260513000002"), id: "art-4:dart:20260513000002" },
        { ...evidence("20260529000528"), id: "art-4:dart:20260529000528" },
      ],
    };
    expect(safeProductEvidence(art4).map((item) => item.id)).toEqual([
      "art-4:dart:20260513000002",
    ]);
    expect(buildProductFactBlocks({ ...product("art-5"), evidence: [] })).toEqual(
      [],
    );
  });

  test("공개 상품의 canonical SHA-256 버전을 만든다", () => {
    const version = productSnapshotVersion(product());
    expect(version).toMatch(/^[a-f0-9]{64}$/);
    expect(productSnapshotVersion(product())).toBe(version);
    expect(
      productSnapshotVersion({
        ...product(),
        offering: { amountWon: 1_182_000_001 },
      }),
    ).not.toBe(version);
  });
});

describe("Evidence Copilot 답변 서비스", () => {
  test("기본 demo는 정확한 fact와 출처만 deterministic fallback으로 반환한다", async () => {
    const result = await answerProductQuestion(
      product(),
      "공모금액과 취득가는 얼마야?",
      { mode: "demo" },
    );

    expect(result.mode).toBe("demo");
    expect(result.fallback).toBe(true);
    expect(result.fallbackReason).toBe("demo_mode");
    expect(result.answer.decisionStatus).toBe("not_assessed");
    expect(result.answer.answerBlocks.length).toBeGreaterThan(0);
    for (const block of result.answer.answerBlocks) {
      expect(block.citations[0]?.quote).toBe(block.text);
      expect(block.citations[0]?.evidence.length).toBe(2);
    }
  });

  test("근거가 없는 상품과 범위 밖 질문에는 빈 block으로 abstain한다", async () => {
    const noEvidence = await answerProductQuestion(
      { ...product("art-5"), evidence: [] },
      "공모금액은 얼마야?",
      { mode: "demo" },
    );
    expect(noEvidence.answer.answerBlocks).toEqual([]);
    expect(noEvidence.fallbackReason).toBe("insufficient_context");

    const unsupported = await answerProductQuestion(
      product(),
      "작가 거래량은 얼마야?",
      { mode: "demo" },
    );
    expect(unsupported.answer.answerBlocks).toEqual([]);
    expect(unsupported.fallbackReason).toBe("insufficient_context");
  });

  test("live 출력의 block id와 quote가 다르면 200용 fallback으로 전환한다", async () => {
    const result = await answerProductQuestion(
      product(),
      "확인 근거는 뭐야?",
      {
        mode: "live",
        complete: async () => [
          {
            text: "외부에서 만든 문장",
            citations: [
              { blockId: "unknown", quote: "외부에서 만든 문장" },
            ],
          },
        ],
      },
    );

    expect(result.mode).toBe("live");
    expect(result.fallback).toBe(true);
    expect(result.fallbackReason).toBe("ai_output_rejected");
    expect(result.answer.answerBlocks.length).toBeGreaterThan(0);
  });
});
