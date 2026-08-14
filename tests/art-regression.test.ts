import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("변경 이력이 근거 탭에 렌더링됨", () => {
  assert.match(read("components/art/ui.tsx"), /export function ChangeLogTable/);
  assert.match(read("app/products/\[id\]/page.tsx"), /<ChangeLogTable items=\{changeLogs\}/);
});

test("공개 비용 상세가 비용 항목별로 렌더링됨", () => {
  assert.match(read("components/art/ui.tsx"), /offering\.disclosedCosts\.map/);
  assert.match(read("components/art/ui.tsx"), /className="cost-list"/);
});

test("라이브 웹 조사는 Responses 웹 검색과 서버 분석 경계에 연결됨", () => {
  const ai = read("lib/art/ai.ts");
  assert.match(ai, /export async function researchProductLive/);
  assert.match(ai, /web_search_preview/);
  assert.match(read("app/api/ai/analyze-product/route.ts"), /researchProductLive/);
  assert.doesNotMatch(ai, /NEXT_PUBLIC_OPENAI/);
});

type DemoData = {
  offerings: Array<{ id: string; acquisitionPrice: number | null; disclosedCosts: unknown[] }>;
  artists: Array<{ id: string }>;
  analyses: Array<{ verdict: string }>;
  annualMetrics: Record<string, Array<{ offered: number }>>;
  trackRecords: Array<{ platformId: string; status: string; delayDays: number | null }>;
};

test("보정된 4개 데모 상품의 거래량·지연·비공개 값", () => {
  const data = JSON.parse(read("data/demo/art-investment.json")) as DemoData;
  assert.equal(data.offerings.length, 4);
  assert.deepEqual(data.analyses.map((item) => item.verdict), ["worth_considering", "conditional", "caution", "danger"]);
  assert.deepEqual(data.artists.map((artist) => data.annualMetrics[artist.id].slice(-3).reduce((sum, metric) => sum + metric.offered, 0)), [42, 26, 12, 7]);
  const betaDelays = data.trackRecords.filter((item) => item.platformId === "demo-platform-002" && item.status === "delayed").map((item) => item.delayDays);
  const gammaDelays = data.trackRecords.filter((item) => item.platformId === "demo-platform-003" && item.status === "delayed").map((item) => item.delayDays);
  assert.ok(betaDelays.every((days) => days === 120));
  assert.ok(gammaDelays.every((days) => days === 210));
  const danger = data.offerings.find((item) => item.id === "demo-art-004");
  assert.equal(danger?.acquisitionPrice, null);
  assert.equal(danger?.disclosedCosts.length, 2);
});
