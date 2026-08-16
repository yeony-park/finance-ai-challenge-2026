import { describe, expect, test } from "vitest";

import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import { CATEGORY_REGISTRY } from "../categories";
import {
  CHECKLIST_BRIDGE_NOTE,
  CHECKLIST_NOTICE,
  checklistBridgeLabel,
  TRUST_CHECKLIST,
} from "../checklist";
import { VERDICT_CAPTIONS } from "../verdict-captions";
import {
  TIMELINE_AMENDED,
  TIMELINE_FILED,
  TIMELINE_LEAD,
  TIMELINE_REPORT_LINK,
  TIMELINE_REVERIFIED,
  TIMELINE_REVERIFY_PENDING,
  TIMELINE_TITLE_SUFFIX,
} from "../event-timeline";
import {
  MARKET_DISCLAIMER,
  MARKET_GAP_NOTE,
  MARKET_LEGEND_AVG,
  MARKET_LEGEND_BAND,
  MARKET_LEGEND_EDGE,
  MARKET_SECTION_LEAD,
  MARKET_SECTION_TITLE,
  MARKET_SOURCE_LINE,
  MARKET_TABLE_TOGGLE,
} from "../market-context";
import {
  AI_ROLE_SENTENCE,
  coverageSentence,
  EXAMPLE_QUESTIONS,
  FOLLOW_UP_LABEL,
  followUpQuestions,
  HOME_HERO_LEAD,
  HOME_HERO_TITLE,
  INTRO_CARDS,
  METHOD_LAYERS,
  SCAFFOLD_NOTICE,
  SEARCH_PLACEHOLDER,
  VERDICT_SENTENCE,
  type FollowUpKey,
} from "../home";
import {
  ACTIVE_GROUP_EMPTY,
  ACTIVE_GROUP_TITLE,
  CLOSED_GROUP_TITLE,
  LAYER_EASY_QUESTIONS,
  LAYERS_SECTION_LEAD,
  LAYERS_SECTION_TITLE,
  OFFERS_SECTION_LEAD,
  OFFERS_SECTION_TITLE,
  VERDICT_SECTION_TITLE,
  verdictTotalsLead,
} from "../category-landing";
import {
  WATCH_BAND_LEAD,
  WATCH_BAND_TITLE,
  WATCH_DETECTION_FAILED,
  WATCH_NO_AMENDMENTS,
  WATCH_NO_RECORD,
  WATCH_REPORT_LINK_LABEL,
  watchAmendmentLine,
  watchCheckedLine,
} from "../watch-band";

const ALL_COPY: readonly string[] = [
  HOME_HERO_TITLE,
  HOME_HERO_LEAD,
  SCAFFOLD_NOTICE,
  AI_ROLE_SENTENCE,
  SEARCH_PLACEHOLDER,
  VERDICT_SENTENCE,
  CHECKLIST_NOTICE,
  coverageSentence(3, 8, 7),
  coverageSentence(1, 8, 0),
  ...EXAMPLE_QUESTIONS.map((question) => question.label),
  ...INTRO_CARDS.flatMap((card) => [card.title, ...card.body]),
  ...INTRO_CARDS.flatMap((card) => card.sources.map((source) => source.label)),
  ...CATEGORY_REGISTRY.flatMap((entry) => [
    entry.label,
    entry.subLabel ?? "",
    entry.note,
    ...(entry.preview ?? []),
  ]),
  MARKET_SECTION_TITLE,
  MARKET_SECTION_LEAD,
  MARKET_LEGEND_AVG,
  MARKET_LEGEND_EDGE,
  MARKET_LEGEND_BAND,
  MARKET_SOURCE_LINE,
  MARKET_DISCLAIMER,
  MARKET_GAP_NOTE,
  MARKET_TABLE_TOGGLE,
  TIMELINE_TITLE_SUFFIX,
  TIMELINE_LEAD,
  TIMELINE_FILED,
  TIMELINE_AMENDED,
  TIMELINE_REVERIFIED,
  TIMELINE_REVERIFY_PENDING,
  TIMELINE_REPORT_LINK,
  ...METHOD_LAYERS.flatMap((layer) => [layer.name, layer.detail]),
  ...TRUST_CHECKLIST.flatMap((item) => [
    item.title,
    item.question,
    item.why,
    item.engineNote,
    ...item.sources.flatMap((source) => [source.label, source.note ?? ""]),
  ]),
  CHECKLIST_BRIDGE_NOTE,
  ...TRUST_CHECKLIST.filter((item) => item.reportChapter !== null).map((item) =>
    checklistBridgeLabel("가축 9호", item.reportChapter?.label ?? ""),
  ),
  ...Object.values(VERDICT_CAPTIONS),
  FOLLOW_UP_LABEL,
  WATCH_BAND_TITLE,
  WATCH_BAND_LEAD,
  WATCH_NO_RECORD,
  WATCH_NO_AMENDMENTS,
  WATCH_DETECTION_FAILED,
  WATCH_REPORT_LINK_LABEL,
  watchAmendmentLine(2, "2026. 8. 14."),
  watchAmendmentLine(1, null),
  watchCheckedLine("2026. 8. 16. 00:52"),
  OFFERS_SECTION_TITLE,
  OFFERS_SECTION_LEAD,
  ACTIVE_GROUP_TITLE,
  CLOSED_GROUP_TITLE,
  ACTIVE_GROUP_EMPTY,
  VERDICT_SECTION_TITLE,
  verdictTotalsLead(9, 2090),
  LAYERS_SECTION_TITLE,
  LAYERS_SECTION_LEAD,
  ...Object.values(LAYER_EASY_QUESTIONS),
];

describe("홈·체크리스트 카피 — 출력 필터 전건 통과", () => {
  test.each(ALL_COPY.filter((text) => text.length > 0))(
    "필터 통과: %s",
    (text) => {
      const result = filterOutput(text);
      expect(result.violations, text).toEqual([]);
      expect(result.ok).toBe(true);
    },
  );
});

describe("예시 질문 칩 — 교육·확인 절차 수준 제한", () => {
  test.each(EXAMPLE_QUESTIONS.map((question) => question.label))(
    "특정 상품·청약 지시가 없다: %s",
    (label) => {
      expect(label).not.toMatch(/\d+\s*호/);
      expect(label).not.toMatch(/추천|골라|찍어/);
      expect(label).not.toMatch(/(청약|매수|투자)하세요/);
    },
  );
});

describe("확인 체크리스트 v1 — 항목별 공적 출처 의무", () => {
  test("전 항목이 https 공적 출처를 1개 이상 가진다", () => {
    for (const item of TRUST_CHECKLIST) {
      expect(item.sources.length, item.id).toBeGreaterThan(0);
      for (const source of item.sources) {
        expect(source.url, `${item.id}: ${source.label}`).toMatch(/^https:\/\//);
      }
    }
  });

  test("체크리스트 고지는 투자판단이 아님을 밝힌다", () => {
    expect(CHECKLIST_NOTICE).toContain("투자판단이 아닙니다");
  });

  test("집계·등급 없는 구성 — 항목은 질문 형식이다", () => {
    for (const item of TRUST_CHECKLIST) {
      expect(item.question.endsWith("?"), item.id).toBe(true);
    }
  });
});

describe("확인 질문 → 리포트 챕터 다리", () => {
  test("8개 항목 전부가 리포트 챕터 다리를 가진다 (신고서 정보 챕터 신설 후)", () => {
    for (const item of TRUST_CHECKLIST) {
      expect(item.reportChapter, item.id).not.toBeNull();
    }
  });

  test("다리의 앵커는 리포트 헤딩 id 형식이며 라벨이 비어 있지 않다", () => {
    for (const item of TRUST_CHECKLIST) {
      if (item.reportChapter === null) continue;
      expect(item.reportChapter.headingId, item.id).toMatch(/^report-.+-heading$/);
      expect(item.reportChapter.label.length, item.id).toBeGreaterThan(0);
    }
  });

  test("다리 문안은 공모명·챕터명을 그대로 병기한다", () => {
    const label = checklistBridgeLabel("가축 9호", "실재 확인");
    expect(label).toContain("가축 9호");
    expect(label).toContain("실재 확인");
  });

  test("다리 규칙 고지는 선별·추천이 아님을 밝힌다", () => {
    expect(CHECKLIST_BRIDGE_NOTE).toContain("선별·추천이 아닙니다");
  });
});

describe("판정어 쉬운 병기 캡션", () => {
  test("판정 3값 전부에 캡션이 있고 등급·권유 어휘가 없다", () => {
    const captions = Object.values(VERDICT_CAPTIONS);
    expect(captions).toHaveLength(3);
    for (const caption of captions) {
      expect(caption.length).toBeGreaterThan(0);
      expect(caption).not.toMatch(/추천|안전|위험합니다|등급|점수/);
    }
  });

  test("대조 불가 캡션은 실패가 아님을 밝힌다", () => {
    expect(VERDICT_CAPTIONS.unverifiable).toContain("틀렸다는 뜻이 아니라");
  });
});

describe("후속 질문 칩 — 커리큘럼 불변식", () => {
  const KEYS: readonly FollowUpKey[] = [
    "intro",
    "protection",
    "lifecycle",
    "checklist",
    "reports",
    "category",
  ];

  test.each(KEYS)("%s: 후속 질문이 비어 있지 않다", (key) => {
    expect(followUpQuestions(key).length).toBeGreaterThan(0);
  });

  test.each(KEYS)("%s: 후속 질문은 전부 예시 질문 레지스트리의 원소다", (key) => {
    for (const question of followUpQuestions(key)) {
      expect(EXAMPLE_QUESTIONS).toContain(question);
    }
  });

  test.each(KEYS)("%s: 같은 목적지로 되돌아가는 후속 질문이 없다", (key) => {
    for (const question of followUpQuestions(key)) {
      expect(question.target, `${key} → ${question.label}`).not.toBe(key);
    }
  });
});

describe("카테고리 착지 — 입문 어휘 정합", () => {
  test("층 3종 전부에 쉬운 확인 질문이 있고 질문 형식이다", () => {
    const questions = Object.values(LAYER_EASY_QUESTIONS);
    expect(questions).toHaveLength(3);
    for (const question of questions) {
      expect(question.endsWith("가"), question).toBe(true);
    }
  });

  test("대조 결과 리드는 공모·기재 건수를 그대로 병기한다", () => {
    const leadText = verdictTotalsLead(9, 2090);
    expect(leadText).toContain("9건");
    expect(leadText).toContain("2,090건");
  });

  test("청약 그룹 어휘는 /offers 목록과 동일하다", () => {
    expect(ACTIVE_GROUP_TITLE).toBe("청약 예정·진행 중");
    expect(CLOSED_GROUP_TITLE).toBe("청약 종료 · 사후 검증");
  });
});

describe("정정 감시 밴드 — 상태 문안 정직성", () => {
  test("기록 없음·정정 없음·감시 실패가 서로 구분되는 문장이다", () => {
    const states = [WATCH_NO_RECORD, WATCH_NO_AMENDMENTS, WATCH_DETECTION_FAILED];
    expect(new Set(states).size).toBe(3);
  });

  test("정정 접수 문안은 건수를 그대로 병기한다", () => {
    expect(watchAmendmentLine(3, "2026. 8. 14.")).toContain("3건");
    expect(watchAmendmentLine(1, null)).not.toContain("최근");
  });

  test("밴드 리드는 로컬 저장 사실을 밝힌다", () => {
    expect(WATCH_BAND_LEAD).toContain("이 브라우저");
  });
});
