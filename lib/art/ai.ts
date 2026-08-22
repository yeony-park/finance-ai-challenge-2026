import type { AnalysisResult, ParsedSearchQuery } from "@/lib/art/types";

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
        store: false,
        max_output_tokens: 1_024,
        input,
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
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const query = value as Record<string, unknown>;
  const allowed = new Set(["keyword", "offeringStatus", "verdict", "premiumMin", "premiumMax", "auctionVolumeMin", "sellThroughRateMin", "delayedExitOnly", "sort"]);
  if (!Object.keys(query).every((key) => allowed.has(key))) return false;
  const status = new Set(["upcoming", "open", "operating", "exit_in_progress", "liquidated"]);
  const verdict = new Set(["worth_considering", "conditional", "caution", "danger"]);
  if (query.keyword !== undefined && (typeof query.keyword !== "string" || query.keyword.length > 200)) return false;
  if (query.sort !== undefined && (typeof query.sort !== "string" || query.sort.length > 64)) return false;
  if (query.delayedExitOnly !== undefined && typeof query.delayedExitOnly !== "boolean") return false;
  if (query.offeringStatus !== undefined && (!Array.isArray(query.offeringStatus) || query.offeringStatus.some((item) => typeof item !== "string" || !status.has(item)))) return false;
  if (query.verdict !== undefined && (!Array.isArray(query.verdict) || query.verdict.some((item) => typeof item !== "string" || !verdict.has(item)))) return false;
  for (const key of ["premiumMin", "premiumMax", "auctionVolumeMin", "sellThroughRateMin"]) if (query[key] !== undefined && (typeof query[key] !== "number" || !Number.isFinite(query[key]))) return false;
  return true;
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

export function aiMode() {
  return config().mode;
}
