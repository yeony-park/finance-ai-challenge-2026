import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  isNarrativeFresh,
  loadNarrative,
  loadNarrativeForReport,
  narrativeFileName,
  writeNarrative,
} from "../narrative/cache";
import { createFakeNarrativeClient } from "../narrative/client";
import { generateNarrative } from "../narrative/generate";
import { buildNarrativeDigest } from "../narrative/source";
import { NARRATIVE_LAYERS, NARRATIVE_TAGS } from "../narrative/types";
import type { ReportSnapshot } from "../report/snapshot";

const LONG_DIGITS = /\d{9,}/;
const FARM_LIKE = /[가-힣]{2,}(농장|목장|축산)/;
const FULL_SIDO = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

const expectMasked = (text: string): void => {
  expect(text).not.toMatch(LONG_DIGITS);
  expect(text).not.toMatch(FARM_LIKE);
  for (const sido of FULL_SIDO) expect(text).not.toContain(sido);
};

const RAW_FARM = "학산농장";
const RAW_ADDRESS = "서울특별시 강남구 역삼동 123-45";
const RAW_TRACE_NO = "002123456789";

const claimOf = (kind: "livestock_trace_no" | "custody_location", value: string) =>
  ({
    id: `${kind}:${RAW_FARM} 24호`,
    kind,
    subject: `${RAW_FARM} 24호`,
    field: kind === "livestock_trace_no" ? "이력번호" : "보관장소",
    value,
    document: { offerId: "test-offer", rcpNo: "20260806000159", submittedOn: "2026-08-06" },
    location: { section: "제1부", table: "표1", row: 24 },
    verifiability: "verifiable",
  }) as const;

const evidenceOf = (claimed: string, observed: string) => ({
  sourceId: "trace",
  sourceName: "축산물이력제",
  url: "https://example.invalid/trace",
  observedAt: "2026-08-14T00:00:00.000Z",
  field: "보관장소",
  claimed,
  observed,
  stance: "contradicts" as const,
});

const rawReport: ReportSnapshot = {
  offerId: "test-offer",
  assetKind: "livestock",
  document: { offerId: "test-offer", rcpNo: "20260806000159", submittedOn: "2026-08-06" },
  generatedAt: "2026-08-14T05:00:00.000Z",
  mode: "live",
  sources: ["축산물이력제 개체정보"],
  summary: { total: 2, match: 1, mismatch: 1, unverifiable: 0 },
  bySubject: [{ subject: `${RAW_FARM} 24호`, verdict: "mismatch", judgementCount: 2 }],
  judgements: [
    {
      verdict: "match",
      claim: claimOf("livestock_trace_no", RAW_TRACE_NO),
      evidence: [evidenceOf(RAW_TRACE_NO, RAW_TRACE_NO)],
      rationale: `${RAW_FARM} 24호의 이력번호가 원장과 같습니다.`,
    },
    {
      verdict: "mismatch",
      claim: claimOf("custody_location", RAW_ADDRESS),
      evidence: [evidenceOf(RAW_ADDRESS, "경상북도 상주시")],
      rationale: `${RAW_FARM} 24호의 보관장소(${RAW_ADDRESS})가 확인되지 않습니다.`,
    },
  ],
  unjudged: [],
  pricePlacements: [],
  realEstatePlacements: [],
  notes: [`${RAW_FARM}에서 옮겨 적은 기초자료입니다.`],
};

const flatten = (
  document: Awaited<ReturnType<typeof generateNarrative>>["document"],
): readonly { readonly tag: string; readonly text: string }[] =>
  (["easy", "pro"] as const).flatMap((level) => [
    ...document.levels[level].overall,
    ...NARRATIVE_LAYERS.flatMap((layer) => document.levels[level].layers[layer]),
  ]);

describe("서술 입력은 마스킹본으로만 만들어진다", () => {
  test("원본 실명·주소·이력번호는 다이제스트에 남지 않는다", () => {
    const digest = JSON.stringify(buildNarrativeDigest(rawReport, 1));

    expect(digest).not.toContain(RAW_FARM);
    expect(digest).not.toContain(RAW_ADDRESS);
    expect(digest).not.toContain(RAW_TRACE_NO);
    expect(digest).not.toMatch(/\d{9,}/);
  });

  test("마스킹된 별칭으로 바뀌어 들어간다", () => {
    const digest = buildNarrativeDigest(rawReport, 1);

    expect(digest.reality.flagged[0]?.subject).toBe("개체 24호");
  });
});

describe("fake 클라이언트는 키 없이 완주한다", () => {
  test("두 눈높이·세 층위·종합이 모두 채워진다", async () => {
    const { document } = await generateNarrative({
      report: rawReport,
      reportFileName: "report-2026-08-14T05-00-00-000Z.json",
      versionCount: 1,
      client: createFakeNarrativeClient(),
    });

    expect(document.generator).toBe("fake");
    expect(document.filter.discarded).toBe(0);
    for (const level of ["easy", "pro"] as const) {
      expect(document.levels[level].overall.length).toBeGreaterThan(0);
      for (const layer of NARRATIVE_LAYERS) {
        expect(document.levels[level].layers[layer].length).toBeGreaterThan(0);
      }
    }
  });

  test("생성된 모든 문장이 4종 태그와 마스킹 불변식을 지킨다", async () => {
    const { document } = await generateNarrative({
      report: rawReport,
      reportFileName: "report-2026-08-14T05-00-00-000Z.json",
      versionCount: 1,
      client: createFakeNarrativeClient(),
    });

    for (const sentence of flatten(document)) {
      expect(NARRATIVE_TAGS).toContain(sentence.tag);
      expect(sentence.text).not.toContain(RAW_FARM);
      expectMasked(sentence.text);
    }
  });
});

describe("캐시 파일 이름은 접수번호를 따르고 없으면 latest다", () => {
  test("접수번호가 있으면 접수번호를 쓴다", () => {
    expect(narrativeFileName("20260806000159")).toBe(
      "narrative-20260806000159.json",
    );
  });

  test("접수번호가 없으면 latest를 쓴다", () => {
    expect(narrativeFileName("")).toBe("narrative-latest.json");
  });

  test("접수번호 형식이 아니면 거부한다", () => {
    expect(() => narrativeFileName("../../etc")).toThrow();
  });
});

describe("캐시 부재·불일치는 폴백으로 이어진다", () => {
  const writeTo = async (dataDir: string) => {
    const { document } = await generateNarrative({
      report: rawReport,
      reportFileName: "report-2026-08-14T05-00-00-000Z.json",
      versionCount: 1,
      client: createFakeNarrativeClient(),
    });
    await writeNarrative(document, dataDir);
    return document;
  };

  test("캐시 파일이 없으면 null을 돌려준다", async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), "narrative-"));

    expect(await loadNarrative("test-offer", "20260806000159", dataDir)).toBeNull();
  });

  test("저장한 캐시는 다시 읽힌다", async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), "narrative-"));
    const written = await writeTo(dataDir);

    const loaded = await loadNarrative("test-offer", "20260806000159", dataDir);

    expect(loaded?.reportFileName).toBe(written.reportFileName);
  });

  test("캐시가 다른 리포트에서 나왔으면 쓰지 않는다", async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), "narrative-"));
    await writeTo(dataDir);

    const stale: ReportSnapshot = {
      ...rawReport,
      generatedAt: "2026-08-15T05:00:00.000Z",
    };

    expect(
      await loadNarrativeForReport(stale, "report-2026-08-15T05-00-00-000Z.json", dataDir),
    ).toBeNull();
  });

  test("같은 리포트에서 나온 캐시는 신선하다고 본다", async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), "narrative-"));
    const written = await writeTo(dataDir);

    expect(
      isNarrativeFresh(written, rawReport, "report-2026-08-14T05-00-00-000Z.json"),
    ).toBe(true);
  });

  test("깨진 캐시는 조용히 넘기지 않고 오류를 낸다", async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), "narrative-"));
    await writeTo(dataDir);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      path.join(dataDir, "public", "test-offer", "narrative-20260806000159.json"),
      '{"offerId":"test-offer"}',
      "utf8",
    );

    await expect(
      loadNarrative("test-offer", "20260806000159", dataDir),
    ).rejects.toThrow(/서술 캐시 형식/);
  });
});

describe("커밋된 서술 캐시에는 실명·이력번호가 없다", () => {
  test("공개 디렉터리의 서술 JSON이 마스킹 불변식을 지킨다", async () => {
    const publicDir = path.join(process.cwd(), "data", "public");
    const offers = await readdir(publicDir);
    let checked = 0;

    for (const offerId of offers) {
      const files = (await readdir(path.join(publicDir, offerId))).filter((file) =>
        file.startsWith("narrative-"),
      );
      for (const file of files) {
        const raw = await readFile(path.join(publicDir, offerId, file), "utf8");
        const document = JSON.parse(raw);
        for (const level of ["easy", "pro"] as const) {
          const sentences = [
            ...document.levels[level].overall,
            ...NARRATIVE_LAYERS.flatMap(
              (layer: string) => document.levels[level].layers[layer],
            ),
          ];
          for (const sentence of sentences) {
            expect(NARRATIVE_TAGS).toContain(sentence.tag);
            expectMasked(sentence.text);
            checked += 1;
          }
        }
      }
    }

    expect(checked).toBeGreaterThan(0);
  });
});
