import type { AnalysisResult, ParsedSearchQuery, ProductView } from "@/lib/art/types";

const API_URL = "https://api.openai.com/v1/responses";

function config() {
  return {
    key: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    mode: process.env.AI_MODE || "demo",
  };
}

async function responsesJson<T>(
  name: string,
  schema: Record<string, unknown>,
  input: string,
  tools?: Array<Record<string, unknown>>,
): Promise<T> {
  const { key, model } = config();
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        input,
        ...(tools ? { tools } : {}),
        text: { format: { type: "json_schema", name, strict: true, schema } },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`OpenAI Responses API ${res.status}`);
    const body = await res.json();
    const text = body.output_text ?? body.output
      ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
      .map((item: { text?: string }) => item.text ?? "")
      .join("");
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function isParsedSearchQuery(value: unknown): value is ParsedSearchQuery {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<AnalysisResult>;
  return !!result.offeringId
    && ["worth_considering", "conditional", "caution", "danger"].includes(result.verdict ?? "")
    && typeof result.headline === "string"
    && typeof result.summary === "string"
    && Array.isArray(result.keyReasons)
    && !!result.priceInsight
    && !!result.artistInsight
    && !!result.exitInsight
    && !!result.platformInsight
    && Array.isArray(result.evidenceIds);
}

export async function parseSearchLive(query: string) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      keyword: { type: ["string", "null"] },
      offeringStatus: { type: "array", items: { enum: ["upcoming", "open", "operating", "exit_in_progress", "liquidated"] } },
      verdict: { type: "array", items: { enum: ["worth_considering", "conditional", "caution", "danger"] } },
      premiumMin: { type: ["number", "null"] },
      premiumMax: { type: ["number", "null"] },
      auctionVolumeMin: { type: ["number", "null"] },
      sellThroughRateMin: { type: ["number", "null"] },
      delayedExitOnly: { type: "boolean" },
      sort: { type: ["string", "null"] },
    },
    required: ["keyword", "offeringStatus", "verdict", "premiumMin", "premiumMax", "auctionVolumeMin", "sellThroughRateMin", "delayedExitOnly", "sort"],
  };
  const output = await responsesJson<Record<string, unknown>>(
    "parsed_art_product_search",
    schema,
    `미술품 조각투자 상품 검색어를 구조화하라. 모호한 표현은 keyword로 남기고 임의 필터를 만들지 마라. 검색어: ${query}`,
  );
  return Object.fromEntries(Object.entries(output).filter(([, value]) => value !== null)) as ParsedSearchQuery;
}

export type ProductAnswer = {
  answer: string;
  facts: string[];
  meaning: string;
  impact: string;
  evidenceIds: string[];
};

export async function askProductLive(product: ProductView, question: string) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      answer: { type: "string" },
      facts: { type: "array", items: { type: "string" } },
      meaning: { type: "string" },
      impact: { type: "string" },
      evidenceIds: { type: "array", items: { type: "string" } },
    },
    required: ["answer", "facts", "meaning", "impact", "evidenceIds"],
  };
  return responsesJson<ProductAnswer>(
    "art_product_answer",
    schema,
    `저장된 사실만 사용해 초보자에게 직접 답하라. 직접 답변→근거 수치→의미→청약 판단 영향 순서로 작성하고 사용자가 직접 찾아보라고 하지 마라. 질문: ${question}\n상품 JSON: ${JSON.stringify({ offering: product.offering, analysis: product.analysis, evidence: product.evidence })}`,
  );
}

export async function compareLive(products: ProductView[]) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
      summary: { type: "string" },
      productFindings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { productId: { type: "string" }, finding: { type: "string" } },
          required: ["productId", "finding"],
        },
      },
    },
    required: ["headline", "summary", "productFindings"],
  };
  return responsesJson<{ headline: string; summary: string; productFindings: Array<{ productId: string; finding: string }> }>(
    "art_product_comparison",
    schema,
    `최고 상품, 무조건 선택, 수익 보장 표현 없이 상대 비교하라. 데이터: ${JSON.stringify(products.map((product) => ({ id: product.offering.id, title: product.offering.title, analysis: product.analysis })))}`,
  );
}

export type ResearchEvidenceCandidate = {
  claim: string;
  value: string;
  sourceTitle: string;
  sourceUrl: string;
  asOfDate: string | null;
  sourceType: string;
};

export async function researchProductLive(product: ProductView) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      evidence: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            claim: { type: "string" },
            value: { type: "string" },
            sourceTitle: { type: "string" },
            sourceUrl: { type: "string" },
            asOfDate: { type: ["string", "null"] },
            sourceType: { type: "string" },
          },
          required: ["claim", "value", "sourceTitle", "sourceUrl", "asOfDate", "sourceType"],
        },
      },
    },
    required: ["evidence"],
  };
  return responsesJson<{ evidence: ResearchEvidenceCandidate[] }>(
    "art_product_research",
    schema,
    `공식 자료 우선순위에 따라 이 미술품 조각투자 상품의 공개 근거를 조사하라. 접근하지 못한 자료는 확인했다고 쓰지 말고, 충돌하는 값은 모두 유지하라. 상품: ${JSON.stringify({ offering: product.offering, artwork: product.artwork, artist: product.artist, platform: product.platform, issuer: product.issuer })}`,
    [{ type: "web_search_preview" }],
  );
}

export function aiMode() {
  return config().mode;
}

export const researchToolInterfaces = [
  "searchWebSources",
  "getProductFacts",
  "getArtworkFacts",
  "getArtistAuctionRecords",
  "getComparableWorks",
  "getPlatformTrackRecord",
  "calculatePriceMetrics",
  "calculateArtistMetrics",
  "calculateExitMetrics",
  "saveEvidence",
  "saveAnalysis",
] as const;
