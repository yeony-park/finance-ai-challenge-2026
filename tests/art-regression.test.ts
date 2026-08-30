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

test("라이브 공시 분석은 검증된 DART artifact와 grounded AI 경계에 연결됨", () => {
  const server = read("lib/art/ai/server.ts");
  const route = read("app/api/ai/analyze-product/route.ts");
  assert.match(server, /store: false/);
  assert.match(server, /No tools are supplied/);
  assert.match(route, /getDartDocumentArtifacts/);
  assert.match(route, /proposeDartFieldCandidates/);
  assert.match(route, /published: false/);
  assert.doesNotMatch(route, /researchProductLive|web_search_preview/);
  assert.doesNotMatch(server, /NEXT_PUBLIC_OPENAI/);
});

type SyntheticData = {
  offerings: Array<{ id: string; isDemo: boolean; recordScope: string; platformId: string }>;
  artists: Array<{ id: string }>;
  analyses: Array<{ offeringId: string; verdict: string }>;
  annualMetrics: Record<string, Array<{ offered: number }>>;
  trackRecords: Array<{ id: string; platformId: string; status: string; delayDays: number | null }>;
};

test("synthetic fixture connects the current catalog and historical cohorts", () => {
  const data = JSON.parse(read("data/synthetic/art-investment.json")) as SyntheticData;
  assert.equal(data.offerings.length, 9);
  assert.equal(data.trackRecords.length, 318);
  assert.ok(data.offerings.every((item) => item.id.startsWith("synthetic-") && item.isDemo && item.recordScope === "current"));
  assert.ok(data.trackRecords.every((item) => item.id.startsWith("synthetic-")));
  assert.equal(data.analyses.length, data.offerings.length);
  assert.ok(data.analyses.every((item) => item.offeringId.startsWith("synthetic-")));
  assert.ok(data.artists.every((artist) => data.annualMetrics[artist.id]?.length));
  assert.ok(data.trackRecords.some((item) => item.status === "delayed" && (item.delayDays ?? 0) > 0));
});
