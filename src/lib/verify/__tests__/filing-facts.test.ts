import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { latestOfferEntry, OFFERS } from "@/components/site/offers";
import { TRUST_CHECKLIST } from "@/lib/content/checklist";
import {
  filingFactsPath,
  loadFilingFacts,
  parseFilingFacts,
} from "../report/filing-facts";

const FILING_HEADING = "report-filing-heading";

describe("신고서 구조 정보 — 스키마·로더", () => {
  test("커밋된 livestock-9 파일이 스키마를 만족한다", () => {
    const raw = readFileSync(filingFactsPath("livestock-9"), "utf8");
    const parsed = parseFilingFacts(JSON.parse(raw));

    expect(parsed.offerId).toBe("livestock-9");
    expect(parsed.facts.length).toBeGreaterThanOrEqual(4);
    const ids = parsed.facts.map((fact) => fact.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("파일이 없는 공모는 null을 돌려준다", async () => {
    expect(await loadFilingFacts("livestock-1")).toBeNull();
  });

  test("로더는 파일 offerId와 요청 offerId 불일치를 거부한다", async () => {
    expect(await loadFilingFacts("livestock-9")).not.toBeNull();
  });
});

describe("신고서 구조 정보 — 익명화 게이트 (구조 검사)", () => {
  const raw = readFileSync(filingFactsPath("livestock-9"), "utf8");

  test("9자리 이상 숫자 연속은 공시 접수번호 외에 존재하지 않는다", () => {
    const parsed = parseFilingFacts(JSON.parse(raw));
    const longDigits = new Set(raw.match(/\d{9,}/g) ?? []);
    expect(
      [...longDigits].filter((digits) => digits !== parsed.rcpNo),
    ).toEqual([]);
  });

  test("법인명 표기·농장명·주소 패턴이 남지 않는다", () => {
    expect(raw).not.toMatch(/주식회사|㈜/);
    expect(raw).not.toMatch(/[가-힣]{2,}농장/);
    expect(raw).not.toMatch(/[가-힣]+(로|길)\s?\d/);
    expect(raw).not.toMatch(/\d+-\d+번지/);
  });
});

describe("신고서 구조 정보 — 다리 정합", () => {
  test("체크리스트가 신고서 챕터로 다리를 놓으면 최신 공모에 반드시 파일이 있다", async () => {
    const bridgesToFiling = TRUST_CHECKLIST.some(
      (item) => item.reportChapter?.headingId === FILING_HEADING,
    );
    if (!bridgesToFiling) return;

    const latest = latestOfferEntry(OFFERS);
    expect(latest).not.toBeNull();
    expect(await loadFilingFacts(latest?.id ?? "")).not.toBeNull();
  });
});
