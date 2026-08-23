import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

const port = 3223;
const baseUrl = process.env.TEST_BASE_URL ?? `http://127.0.0.1:${port}`;
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const standaloneServer = join(repoRoot, ".next", "standalone", "server.js");
let server: ChildProcess | undefined;

const DEMO_IDS = [
  "demo-art-001",
  "demo-art-002",
  "demo-art-003",
  "demo-art-004",
] as const;

const ORIGINAL_OFFER_IDS = [
  ...Array.from({ length: 9 }, (_, index) => `livestock-${index + 1}`),
  "real-estate-a",
] as const;

const AXIS_KEYS = ["price", "artist", "exit", "platform"] as const;
const VERDICT_KEYS = [
  "worth_considering",
  "conditional",
  "caution",
  "danger",
] as const;
const VERDICT_LABELS = ["해볼 만함", "조건부 해볼 만함", "주의", "위험"] as const;
const SOURCE_PRIORITY = [
  "법정 공시",
  "공공기관",
  "공식 공모 문서",
  "경매사 기록",
  "작가·기관 공식 자료",
  "신뢰 가능한 제3자",
] as const;

async function waitForServer() {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/methodology`);
      if (response.ok) return;
    } catch {
      // The standalone or development server needs a short warm-up.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`local Next.js server did not start at ${baseUrl}`);
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.ok, true, `${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

function htmlText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hrefsOf(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) =>
    (match[1] ?? "").replaceAll("&amp;", "&"),
  );
}

/** Return one complete section, including nested sections, by any descendant id. */
function sectionWithId(html: string, id: string): string {
  const marker = `id="${id}"`;
  const markerIndex = html.indexOf(marker);
  assert.ok(markerIndex >= 0, `methodology must expose #${id}`);
  const start = html.lastIndexOf("<section", markerIndex);
  assert.ok(start >= 0, `#${id} must be inside a section`);

  const tagPattern = /<\/?section\b[^>]*>/gi;
  tagPattern.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(html)) !== null) {
    if (match[0].startsWith("</")) depth -= 1;
    else depth += 1;
    if (depth === 0) return html.slice(start, tagPattern.lastIndex);
  }
  throw new Error(`unterminated section containing #${id}`);
}

function textItems(html: string, tag: "h2" | "h4" | "dt" | "li"): string[] {
  const expression = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  return [...html.matchAll(expression)].map((match) => htmlText(match[1] ?? ""));
}

function sourcePriorityItems(appendix: string): string[] {
  const sourceList = appendix.match(/출처 우선순위<\/strong>[\s\S]*?<ol\b[^>]*>([\s\S]*?)<\/ol>/);
  assert.ok(sourceList, "DEMO methodology must expose a source-priority ordered list");
  return textItems(sourceList[1] ?? "", "li");
}

type MethodologyResponse = {
  methodologyVersion: string;
  axes: string[];
  verdicts: string[];
  sourcePriority: string[];
};

type CurrentProduct = {
  offering: { id: string; isDemo: boolean; minimumInvestment: number | null };
  recordScope: "current";
};

type ProductListResponse = {
  items: CurrentProduct[];
  pagination: { total: number };
};

before(async () => {
  if (process.env.TEST_BASE_URL) return;
  if (existsSync(standaloneServer)) {
    server = spawn(process.execPath, [standaloneServer], {
      cwd: join(repoRoot, ".next", "standalone"),
      stdio: "ignore",
      env: {
        ...process.env,
        HOSTNAME: "127.0.0.1",
        PORT: String(port),
        NEXT_TELEMETRY_DISABLED: "1",
      },
    });
  } else {
    server = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: repoRoot,
      stdio: "ignore",
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    });
  }
  await waitForServer();
});

after(() => {
  server?.kill("SIGTERM");
});

test("/methodology keeps the original sections and three original verdict terms", async () => {
  const response = await fetch(`${baseUrl}/methodology`);
  const methodology = await response.text();
  assert.equal(response.status, 200);

  const originalSections = [
    ["methodology-title", "무엇을 어떤 기록과 대조하는가"],
    ["pipeline-title", "대조는 네 단계로 진행됩니다"],
    ["layers-title", "세 층위"],
    ["sources-title", "데이터 출처"],
    ["verdicts-title", "판정 3값"],
    ["amendment-title", "정정 재검증"],
    ["principles-title", "표현 원칙"],
    ["limits-title", "한계"],
  ] as const;

  for (const [id, heading] of originalSections) {
    const section = sectionWithId(methodology, id);
    assert.ok(htmlText(section).includes(heading), `original methodology section ${id} remains`);
    assert.equal(section.includes('id="art-analysis-demo"'), false, `${id} stays separate from the DEMO appendix`);
  }

  const verdictSection = sectionWithId(methodology, "verdicts-title");
  assert.deepEqual(textItems(verdictSection, "dt"), ["일치", "원장 불일치", "대조 불가"]);
  assert.equal((methodology.match(/id="art-analysis-demo"/g) ?? []).length, 1);
});

test("DEMO methodology appendix exposes four axes, four grades, boundaries, version, and source priority", async () => {
  const methodology = await (await fetch(`${baseUrl}/methodology`)).text();
  const appendix = sectionWithId(methodology, "art-analysis-demo");
  const appendixText = htmlText(appendix);

  assert.deepEqual(textItems(appendix, "h2"), ["미술품 분석 DEMO 방법론"]);
  assert.ok(appendixText.includes("DEMO 전용"));
  assert.match(appendixText, /실제 청약 상품|공시·공공 원장/);
  assert.match(appendixText, /커버리지/);
  assert.match(appendixText, /포함하지 않/);
  assert.match(appendixText, /투자 권유/);
  assert.match(appendixText, /수익 예측/);

  const axesSection = sectionWithId(appendix, "art-demo-axes-title");
  const axisLabels = textItems(axesSection, "h4");
  assert.equal(axisLabels.length, 4);
  assert.deepEqual(axisLabels, [
    "공모가격",
    "작가·비교표본",
    "회수·처분",
    "플랫폼 이력",
  ]);

  const gradesSection = sectionWithId(appendix, "art-demo-grades-title");
  const gradesText = htmlText(gradesSection);
  assert.deepEqual(textItems(gradesSection, "dt"), [...VERDICT_LABELS]);
  assert.match(gradesText, /일치·원장 불일치·대조 불가/);
  assert.match(gradesText, /고정된 DEMO 표시 레이블|저장된 AnalysisResult 표시값/);
  assert.match(gradesText, /분석축[\s\S]*(?:산출하거나 다시 계산하지 않습니다|자동 계산하지 않습니다)/);

  assert.ok(appendixText.includes("방법 버전 art-mvp-v1.0"));
  assert.deepEqual(sourcePriorityItems(appendix), [...SOURCE_PRIORITY]);

  // Missing, conflicting, and stale facts stay conservative and separate from the
  // four stored display verdicts and from the art-risk engine's assessment.
  const boundariesText = htmlText(sectionWithId(appendix, "art-demo-boundaries-title"));
  assert.match(boundariesText, /누락|결측/);
  assert.match(boundariesText, /확인 불가/);
  assert.match(boundariesText, /판정 보류/);
  assert.match(boundariesText, /0/);
  assert.match(boundariesText, /추정/);
  const principlesText = htmlText(sectionWithId(appendix, "art-demo-principles-title"));
  assert.match(principlesText, /충돌/);
  assert.match(principlesText, /현재성|오래된/);
  assert.match(principlesText, /별도[\s\S]*art-risk-v1/);
  assert.match(principlesText, /not_assessed/);

  // Stored facts/calculations and AI explanations remain visibly distinct.
  assert.match(boundariesText, /원문|저장본|저장된/);
  assert.match(boundariesText, /확인된 사실|계산/);
  assert.match(boundariesText, /AI[\s\S]*(?:설명|근거)[\s\S]*(?:확인되지 않은 사실|투자 결론)/);
});

test("/offers preserves its ten original reports and coverage while linking the separate DEMO methodology", async () => {
  const response = await fetch(`${baseUrl}/offers`);
  const offers = await response.text();
  assert.equal(response.status, 200);
  const visibleOffers = htmlText(offers);

  assert.ok(visibleOffers.includes("2026년 투자계약증권 공모 8건 중 3건이 국가 공공데이터 대조를 거쳤습니다."));
  assert.ok(visibleOffers.includes("종료된 공모 7건의 사후 검증 리포트가 함께 공개돼 있습니다."));

  const originalLinks = hrefsOf(offers).filter((href) => href.startsWith("/offers/"));
  assert.deepEqual([...new Set(originalLinks)].sort(), ORIGINAL_OFFER_IDS.map((id) => `/offers/${id}`).sort());
  assert.equal(originalLinks.length, ORIGINAL_OFFER_IDS.length);

  const demoSection = sectionWithId(offers, "art-demo-offers");
  const demoLinks = hrefsOf(demoSection);
  assert.equal(demoLinks.filter((href) => href === "/methodology#art-analysis-demo").length, 1);
  const demoProductLinks = demoLinks.filter((href) => href.startsWith("/products/demo-art-"));
  assert.equal(demoProductLinks.length, DEMO_IDS.length);
  assert.deepEqual(
    [...new Set(demoProductLinks)].sort(),
    DEMO_IDS.map((id) => `/products/${id}`).sort(),
  );
  assert.equal(demoLinks.includes("/art?scope=current&currentStatus=upcoming"), true);
  assert.equal(demoLinks.some((href) => href.startsWith("/offers/demo-art-")), false);

  const artResponse = await fetch(`${baseUrl}/art`);
  const art = await artResponse.text();
  assert.equal(artResponse.status, 200);
  assert.ok(htmlText(art).includes("347건"));
});

test("only DEMO product details expose the methodology appendix link", async () => {
  for (const id of DEMO_IDS) {
    const response = await fetch(`${baseUrl}/products/${id}`);
    const detail = await response.text();
    assert.equal(response.status, 200, id);
    assert.equal(hrefsOf(detail).filter((href) => href === "/methodology#art-analysis-demo").length, 1, id);
    assert.ok(detail.includes("DEMO 분석 기준 보기"), id);
  }

  const products = await getJson<ProductListResponse>("/api/products?scope=current&pageSize=100");
  const real = products.items.find((item) => !item.offering.isDemo);
  assert.ok(real, "a real current product must remain available");
  const response = await fetch(`${baseUrl}/products/${encodeURIComponent(real.offering.id)}`);
  const detail = await response.text();
  assert.equal(response.status, 200);
  assert.equal(hrefsOf(detail).includes("/methodology#art-analysis-demo"), false);
  assert.equal(detail.includes("DEMO 분석 기준 보기"), false);
});

test("methodology API keeps its exact four axis and verdict keys", async () => {
  const methodology = await getJson<MethodologyResponse>("/api/methodology");
  assert.equal(methodology.methodologyVersion, "art-mvp-v1.0");
  assert.deepEqual(methodology.axes, [...AXIS_KEYS]);
  assert.deepEqual(methodology.verdicts, [...VERDICT_KEYS]);
  assert.deepEqual(methodology.sourcePriority, [...SOURCE_PRIORITY]);
});

test("all four DEMO minimum investments stay 100000 through API and detail rendering", async () => {
  const list = await getJson<ProductListResponse>("/api/products?scope=current&pageSize=100");
  const demos = list.items.filter((item) => item.offering.isDemo);
  assert.deepEqual(demos.map((item) => item.offering.id).sort(), [...DEMO_IDS].sort());
  assert.deepEqual(demos.map((item) => item.offering.minimumInvestment), [100_000, 100_000, 100_000, 100_000]);

  for (const id of DEMO_IDS) {
    const api = await getJson<CurrentProduct>(`/api/products/${id}`);
    assert.equal(api.recordScope, "current", id);
    assert.equal(api.offering.isDemo, true, id);
    assert.equal(api.offering.minimumInvestment, 100_000, id);

    const detail = await fetch(`${baseUrl}/products/${id}`).then((response) => response.text());
    assert.ok(htmlText(detail).includes("100,000원"), `${id} detail renders 100,000원`);
  }
});
