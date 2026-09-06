import { isRecord, isStringArray } from "@/lib/client-response";
import type { GlobalSearchResponse, GlobalSearchResult } from "@/lib/knowledge/global-search";
import type { GenericKnowledgeEvidence } from "@/lib/knowledge/retrieval";

export type SearchResult = Pick<GlobalSearchResult,
  "id" | "productId" | "title" | "isScenario" | "phase" | "href"
>;

export interface SearchResponse extends Pick<GlobalSearchResponse,
  "mode" | "generatedAnswer" | "generatedGeneralAnswer" | "guidance" | "genericEvidence"
> {
  readonly results: readonly SearchResult[];
}

const isSearchResult = (value: unknown): value is SearchResult =>
  isRecord(value) &&
  [value.id, value.productId, value.title].every((field) => typeof field === "string") &&
  typeof value.isScenario === "boolean" &&
  typeof value.href === "string" && /^\/(?!\/)[^\\\s]+$/.test(value.href) &&
  (value.phase === "upcoming" || value.phase === "subscription-open" || value.phase === "closed" ||
    value.phase === "listed-trading" || value.phase === "settled" || value.phase === "evidence-only");

const isGenericEvidence = (value: unknown): value is GenericKnowledgeEvidence =>
  isRecord(value) &&
  [value.sourceId, value.label, value.url, value.excerpt, value.asOf, value.hash].every((field) => typeof field === "string") &&
  value.status === "approved" && value.dataNature === "observed" && value.productId === null &&
  (value.categoryId === null || value.categoryId === "cattle" || value.categoryId === "pig" ||
    value.categoryId === "art" || value.categoryId === "real-estate") &&
  typeof value.score === "number" && Number.isFinite(value.score);

const isSearchResponse = (value: unknown): value is SearchResponse =>
  isRecord(value) && (value.mode === "matches" || value.mode === "review-guidance") &&
  Array.isArray(value.results) && value.results.every(isSearchResult) &&
  (value.generatedAnswer === undefined ||
    (isRecord(value.generatedAnswer) && typeof value.generatedAnswer.answer === "string" &&
      isStringArray(value.generatedAnswer.citedProductIds))) &&
  (value.generatedGeneralAnswer === undefined ||
    (isRecord(value.generatedGeneralAnswer) && typeof value.generatedGeneralAnswer.answer === "string" &&
      isStringArray(value.generatedGeneralAnswer.citedSourceIds))) &&
  (value.guidance === undefined ||
    (isRecord(value.guidance) && typeof value.guidance.message === "string" &&
      Array.isArray(value.guidance.reviewAreas) && value.guidance.reviewAreas.every((area: unknown) =>
        area === "asset" || area === "return-cost" || area === "financing" || area === "exit" || area === "operator-history"))) &&
  (value.mode !== "review-guidance" || value.guidance !== undefined) &&
  (value.genericEvidence === undefined ||
    (Array.isArray(value.genericEvidence) && value.genericEvidence.every(isGenericEvidence)));

export const parseSearchResponse = (value: unknown): SearchResponse => {
  if (!isSearchResponse(value)) throw new Error("invalid search response");
  return value;
};
