import { describe, expect, it } from "vitest";

import { isRegisteredSource } from "../../../spine/rag/corpus";
import type { Verdict, Verifiability } from "../../types";
import { CATTLE_CATEGORY } from "../cattle";
import { REAL_ESTATE_CATEGORY } from "../real-estate";
import {
  REQUIRED_PAGE_SLOTS,
  declaresAllLayers,
  layerSourcesSatisfied,
  unknownSourceIds,
} from "../category";
import {
  EVIDENCE_STATUS_LABELS,
  VERDICT_LABELS,
  projectEvidenceStatus,
} from "../vocabulary";
import type { EvidenceStatus } from "../vocabulary";

const ALL_VERIFIABILITY: readonly Verifiability[] = [
  "verifiable",
  "no_reference_data",
  "structurally_impossible",
  "unparsed",
  "cross_check_conflict",
  "llm_only",
];

const ALL_VERDICTS: readonly Verdict[] = ["match", "mismatch", "unverifiable"];

const ALL_STATUSES: readonly EvidenceStatus[] = [
  "verified",
  "mismatch",
  "review",
  "missing",
  "stale",
];

describe("어휘 프로젝션 (02-vocabulary)", () => {
  it("판정 일치 + 신선 → 근거 확인", () => {
    expect(
      projectEvidenceStatus({ verifiability: "verifiable", verdict: "match" }),
    ).toBe("verified");
  });

  it("원장 불일치는 현재성 초과보다 우선한다", () => {
    expect(
      projectEvidenceStatus({
        verifiability: "verifiable",
        verdict: "mismatch",
        isStale: true,
      }),
    ).toBe("mismatch");
  });

  it("현재성 초과는 일치 판정을 덮는다", () => {
    expect(
      projectEvidenceStatus({
        verifiability: "verifiable",
        verdict: "match",
        isStale: true,
      }),
    ).toBe("stale");
  });

  it("대조 불가 판정과 근거 없음·구조 불가는 자료 미확인으로 표시된다", () => {
    expect(
      projectEvidenceStatus({
        verifiability: "verifiable",
        verdict: "unverifiable",
      }),
    ).toBe("missing");
    expect(projectEvidenceStatus({ verifiability: "no_reference_data" })).toBe(
      "missing",
    );
    expect(
      projectEvidenceStatus({ verifiability: "structurally_impossible" }),
    ).toBe("missing");
  });

  it("판정 전 상태(미파싱·교차 충돌·LLM 단독·검증 가능)는 추가 대조로 표시된다", () => {
    expect(projectEvidenceStatus({ verifiability: "unparsed" })).toBe("review");
    expect(
      projectEvidenceStatus({ verifiability: "cross_check_conflict" }),
    ).toBe("review");
    expect(projectEvidenceStatus({ verifiability: "llm_only" })).toBe("review");
    expect(projectEvidenceStatus({ verifiability: "verifiable" })).toBe(
      "review",
    );
  });

  it("검증가능성 6값 전수가 판정 유무와 무관하게 예외 없이 프로젝션된다", () => {
    for (const verifiability of ALL_VERIFIABILITY) {
      expect(() => projectEvidenceStatus({ verifiability })).not.toThrow();
      for (const verdict of ALL_VERDICTS) {
        expect(() =>
          projectEvidenceStatus({ verifiability, verdict }),
        ).not.toThrow();
      }
    }
  });

  it("판정 3값·상태 5상태의 한글 라벨이 전수 존재한다", () => {
    for (const verdict of ALL_VERDICTS) {
      expect(VERDICT_LABELS[verdict].length).toBeGreaterThan(0);
    }
    for (const status of ALL_STATUSES) {
      expect(EVIDENCE_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });
});

describe("cattle 실증 디스크립터 (01-category-contract)", () => {
  it("실재성·가격·이행 3층 전부를 선언한다", () => {
    expect(declaresAllLayers(CATTLE_CATEGORY)).toBe(true);
  });

  it("어댑터와 층 선언의 출처가 스파인 코퍼스에 등록돼 있다", () => {
    for (const adapter of CATTLE_CATEGORY.adapters) {
      expect(isRegisteredSource(adapter.sourceId)).toBe(true);
    }
    for (const layer of CATTLE_CATEGORY.layers) {
      expect(layer.publicSourceIds.length).toBeGreaterThan(0);
      for (const sourceId of layer.publicSourceIds) {
        expect(isRegisteredSource(sourceId)).toBe(true);
      }
    }
  });

  it("claim kinds가 비어 있지 않고 중복이 없다", () => {
    expect(CATTLE_CATEGORY.claimKinds.length).toBeGreaterThan(0);
    expect(new Set(CATTLE_CATEGORY.claimKinds).size).toBe(
      CATTLE_CATEGORY.claimKinds.length,
    );
  });

  it("모든 층 선언이 근거 서술과 신선도 기준을 갖는다", () => {
    for (const layer of CATTLE_CATEGORY.layers) {
      expect(layer.basis.length).toBeGreaterThan(0);
    }
    expect(CATTLE_CATEGORY.freshnessNote.length).toBeGreaterThan(0);
  });

  it("필수 페이지 슬롯은 5종이며 custom을 포함하지 않는다", () => {
    expect(REQUIRED_PAGE_SLOTS).toHaveLength(5);
    expect(REQUIRED_PAGE_SLOTS).not.toContain("custom");
  });

  it("인용 출처는 전부 코퍼스 등록분 또는 proposedSources 선언분이다", () => {
    expect(unknownSourceIds(CATTLE_CATEGORY, isRegisteredSource)).toEqual([]);
  });

  it("unsupported가 아닌 층은 출처를 1개 이상 갖는다", () => {
    expect(layerSourcesSatisfied(CATTLE_CATEGORY)).toBe(true);
  });

  it("구현 완료 어댑터만 선언돼 있다 (계획 어댑터는 fake 트윈 포팅 후 전환)", () => {
    for (const adapter of CATTLE_CATEGORY.adapters) {
      expect(adapter.status).toBe("implemented");
    }
  });
});

describe("real-estate 디스크립터 (01-category-contract)", () => {
  it("실재성·가격·이행 3층 전부를 선언한다", () => {
    expect(declaresAllLayers(REAL_ESTATE_CATEGORY)).toBe(true);
  });

  it("어댑터와 층 선언의 출처가 스파인 코퍼스에 등록돼 있다", () => {
    for (const adapter of REAL_ESTATE_CATEGORY.adapters) {
      expect(isRegisteredSource(adapter.sourceId)).toBe(true);
    }
    for (const layer of REAL_ESTATE_CATEGORY.layers) {
      expect(layer.publicSourceIds.length).toBeGreaterThan(0);
      for (const sourceId of layer.publicSourceIds) {
        expect(isRegisteredSource(sourceId)).toBe(true);
      }
    }
  });

  it("claim kinds가 비어 있지 않고 중복이 없다", () => {
    expect(REAL_ESTATE_CATEGORY.claimKinds.length).toBeGreaterThan(0);
    expect(new Set(REAL_ESTATE_CATEGORY.claimKinds).size).toBe(
      REAL_ESTATE_CATEGORY.claimKinds.length,
    );
  });

  it("모든 층 선언이 근거 서술과 신선도 기준을 갖는다", () => {
    for (const layer of REAL_ESTATE_CATEGORY.layers) {
      expect(layer.basis.length).toBeGreaterThan(0);
    }
    expect(REAL_ESTATE_CATEGORY.freshnessNote.length).toBeGreaterThan(0);
  });

  it("인용 출처는 전부 코퍼스 등록분 또는 proposedSources 선언분이다", () => {
    expect(unknownSourceIds(REAL_ESTATE_CATEGORY, isRegisteredSource)).toEqual([]);
  });

  it("unsupported가 아닌 층은 출처를 1개 이상 갖는다", () => {
    expect(layerSourcesSatisfied(REAL_ESTATE_CATEGORY)).toBe(true);
  });

  it("구현 완료 어댑터만 선언돼 있다", () => {
    for (const adapter of REAL_ESTATE_CATEGORY.adapters) {
      expect(adapter.status).toBe("implemented");
    }
  });

  it("층·호 단위 한계가 실재성 층 근거에 적혀 있다 (과대 표기 방지)", () => {
    const existence = REAL_ESTATE_CATEGORY.layers.find(
      (layer) => layer.layer === "existence",
    );
    expect(existence?.level).toBe("partial");
    expect(existence?.basis).toContain("층·호");
  });
});
