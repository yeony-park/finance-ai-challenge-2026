import {
  type DartFieldCandidateOutput,
  type DartFieldCandidateRequest,
  type DartGroundingChunk,
  type GroundedAiServerConfig,
  type GroundedNarrativeOutput,
  type GroundedNarrativeRequest,
  type GroundedQaOutput,
  type GroundedQaRequest,
  groundedLimits,
} from "./contracts.ts";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const NUMBER_TOKEN = /(?<![A-Za-z0-9_])[+-]?\d[\d,]*(?:\.\d+)?%?(?![A-Za-z0-9_])/g;
const FORBIDDEN_RECOMMENDATION = /(?:\b(?:buy|sell|hold|invest|subscribe|purchase|recommend|guarantee(?:d)?)\b|\b(?:should|must)\s+(?:buy|sell|hold|invest|subscribe|purchase)\b|매수|매도|구매|청약\s*(?:하세요|하십시오|하라|을\s*추천|를\s*추천)|(?:추천|권유|권장)(?:\s*(?:합니다|드립니다|해요|한다|하세요|하십시오|하라))?|수익\s*(?:보장|확정)|(?:반드시|무조건)\s*(?:매수|매도|구매|청약|투자))/iu;

type UnknownRecord = Record<string, unknown>;
type EvidenceText = Map<string, string>;

/** Errors intentionally contain no provider status, prompt, document, or credential. */
export class GroundedInputError extends Error {
  constructor() { super("AI request rejected"); this.name = "GroundedInputError"; }
}

/** A single invalid member invalidates the complete model result. */
export class GroundedOutputError extends Error {
  constructor() { super("AI output rejected"); this.name = "GroundedOutputError"; }
}

export class GroundedConfigError extends Error {
  constructor() { super("AI is unavailable"); this.name = "GroundedConfigError"; }
}

function rejectInput(): never { throw new GroundedInputError(); }
function rejectOutput(): never { throw new GroundedOutputError(); }
function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}
function exactKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}
function validId(value: unknown, max: number = groundedLimits.idLength): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max && SAFE_ID.test(value);
}
function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}
function unique(values: readonly string[]): boolean { return new Set(values).size === values.length; }
function stringArray(value: unknown, max: number): value is string[] {
  return Array.isArray(value) && value.length <= max && value.every((item) => validId(item)) && unique(value as string[]);
}

function sourceMap(items: ReadonlyArray<{ id: string; text: string }>): EvidenceText {
  return new Map(items.map((item) => [item.id, item.text]));
}

function ensureSourceItems(items: unknown, max: number): asserts items is Array<{ id: string; text: string }> {
  if (!Array.isArray(items) || items.length > max) rejectInput();
  const ids: string[] = [];
  for (const item of items) {
    const value = record(item);
    if (!value || !exactKeys(value, ["id", "text"]) || !validId(value.id) || !boundedText(value.text, groundedLimits.sourceTextLength)) rejectInput();
    ids.push(value.id);
  }
  if (!unique(ids)) rejectInput();
}

function exactQuote(source: string, quote: string): boolean {
  return quote.length > 0 && source.includes(quote);
}

function numericTokens(text: string): string[] {
  return text.match(NUMBER_TOKEN) ?? [];
}

/**
 * A generated numeric token must occur exactly in at least one cited source.
 * This deliberately does not normalize commas, signs, dates, or percentages:
 * changing their spelling can change a financial fact.
 */
function hasOnlySupportedNumbers(text: string, citedTexts: readonly string[]): boolean {
  const supported = new Set(citedTexts.flatMap(numericTokens));
  return numericTokens(text).every((token) => supported.has(token));
}

const FIELD_CONTEXT_TERMS: Readonly<Record<string, readonly string[]>> = {
  totalOfferingAmount: ["총 공모금액", "공모금액", "모집총액", "모집 금액", "발행총액", "청약 금액"],
  "offering.totalOfferingAmount": ["총 공모금액", "공모금액", "모집총액", "모집 금액", "발행총액", "청약 금액"],
  "offering.acquisitionPrice": ["취득가", "취득금액", "매입가", "작품 취득", "작품가격"],
  "offering.unitPrice": ["구좌가격", "구좌당", "주당", "1주당"],
  "offering.numberOfUnits": ["구좌 수", "구좌수", "발행수량", "모집수량", "증권 수"],
  "offering.subscriptionStart": ["청약 시작", "청약개시", "모집 시작"],
  "offering.subscriptionEnd": ["청약 종료", "청약종료", "모집 종료"],
  "offering.targetHoldingMonths": ["목표 보유기간", "보유기간", "존속기간"],
  "offering.disclosedCosts": ["발행비용", "공개 비용", "비용", "수수료"],
  "artwork.title": ["작품명", "미술품명"],
  "artwork.productionYear": ["제작연도", "제작년도", "제작년"],
  "artwork.medium": ["재료", "매체", "기법"],
  "artwork.width": ["너비", "가로"],
  "artwork.height": ["높이", "세로"],
};

/** Require the nearest preceding recognized label to belong to the proposed field. */
function hasFieldValueContext(field: string, value: string, quotes: readonly string[]): boolean {
  const targetTerms = FIELD_CONTEXT_TERMS[field];
  if (!targetTerms) return false;
  const allTerms = [...new Set(Object.values(FIELD_CONTEXT_TERMS).flat())];
  for (const quote of quotes) {
    let valueIndex = quote.indexOf(value);
    while (valueIndex >= 0) {
      let nearestIndex = -1;
      let nearestTerm = "";
      for (const term of allTerms) {
        const index = quote.lastIndexOf(term, valueIndex);
        if (index > nearestIndex) { nearestIndex = index; nearestTerm = term; }
      }
      if (nearestIndex >= 0 && valueIndex - (nearestIndex + nearestTerm.length) <= 80 && targetTerms.includes(nearestTerm)) return true;
      valueIndex = quote.indexOf(value, valueIndex + Math.max(value.length, 1));
    }
  }
  return false;
}

function safeGeneratedText(value: unknown): value is string {
  return boundedText(value, groundedLimits.outputTextLength) && !FORBIDDEN_RECOMMENDATION.test(value);
}

function assertIdentity(input: { productId: string; productVersion: string }) {
  if (!validId(input.productId) || !validId(input.productVersion, groundedLimits.versionLength)) rejectInput();
}

function assertInputByteBudget(input: unknown): void {
  let text: string;
  try { text = JSON.stringify(input); } catch { rejectInput(); }
  // Reserve space for the small transport task wrapper used by server.ts.
  if (new TextEncoder().encode(text).byteLength > groundedLimits.maxInputBytes - 2_048) rejectInput();
}

export function assertDartFieldCandidateRequest(input: DartFieldCandidateRequest): void {
  if (!record(input)) rejectInput();
  assertIdentity(input);
  if (!Array.isArray(input.allowedFields) || input.allowedFields.length < 1 || input.allowedFields.length > groundedLimits.maxFields || !input.allowedFields.every((field) => validId(field, groundedLimits.fieldNameLength)) || !unique(input.allowedFields)) rejectInput();
  if (!Array.isArray(input.chunks) || input.chunks.length < 1 || input.chunks.length > groundedLimits.maxChunks) rejectInput();
  const chunkIds: string[] = [];
  const cellIds: string[] = [];
  let sourceCharacters = 0;
  for (const chunk of input.chunks) {
    const item = record(chunk);
    if (!item || !exactKeys(item, ["id", "text", "cells"]) || !validId(item.id) || !boundedText(item.text, groundedLimits.sourceTextLength) || !Array.isArray(item.cells) || item.cells.length > groundedLimits.maxCells) rejectInput();
    chunkIds.push(item.id);
    sourceCharacters += item.text.length;
    for (const cell of item.cells) {
      const parsed = record(cell);
      if (!parsed || !exactKeys(parsed, ["id", "text"]) || !validId(parsed.id) || !boundedText(parsed.text, groundedLimits.sourceTextLength)) rejectInput();
      cellIds.push(parsed.id);
      sourceCharacters += parsed.text.length;
    }
  }
  if (!unique(chunkIds) || !unique(cellIds) || sourceCharacters > groundedLimits.maxChunks * groundedLimits.sourceTextLength) rejectInput();
  assertInputByteBudget(input);
}

export function assertGroundedNarrativeRequest(input: GroundedNarrativeRequest): void {
  if (!record(input)) rejectInput();
  assertIdentity(input);
  ensureSourceItems(input.facts, groundedLimits.maxFactsPerKind);
  ensureSourceItems(input.signals, groundedLimits.maxFactsPerKind);
  ensureSourceItems(input.diffs, groundedLimits.maxFactsPerKind);
  if (input.facts.length + input.signals.length + input.diffs.length < 1) rejectInput();
  const total = [...input.facts, ...input.signals, ...input.diffs].reduce((sum, item) => sum + item.text.length, 0);
  if (total > groundedLimits.maxFactsPerKind * groundedLimits.sourceTextLength) rejectInput();
  assertInputByteBudget(input);
}

export function assertGroundedQaRequest(input: GroundedQaRequest): void {
  if (!record(input)) rejectInput();
  assertIdentity(input);
  if (!boundedText(input.question, groundedLimits.questionLength)) rejectInput();
  ensureSourceItems(input.blocks, groundedLimits.maxFactsPerKind);
  if (input.blocks.length < 1) rejectInput();
  if (input.blocks.reduce((sum, item) => sum + item.text.length, 0) > groundedLimits.maxFactsPerKind * groundedLimits.sourceTextLength) rejectInput();
  assertInputByteBudget(input);
}

function outputIdentity(value: UnknownRecord, input: { productId: string; productVersion: string }): void {
  if (value.productId !== input.productId || value.productVersion !== input.productVersion) rejectOutput();
}

function citedTextsForIds(ids: string[], allowed: EvidenceText): string[] {
  const texts: string[] = [];
  for (const id of ids) {
    const text = allowed.get(id);
    if (text === undefined) rejectOutput();
    texts.push(text);
  }
  return texts;
}

function chunkIndex(chunks: DartGroundingChunk[]): Map<string, DartGroundingChunk> {
  return new Map(chunks.map((chunk) => [chunk.id, chunk]));
}

export function validateDartFieldCandidates(input: DartFieldCandidateRequest, value: unknown): DartFieldCandidateOutput {
  assertDartFieldCandidateRequest(input);
  const output = record(value);
  if (!output || !exactKeys(output, ["productId", "productVersion", "candidates"]) || !Array.isArray(output.candidates) || output.candidates.length > groundedLimits.maxCandidates) rejectOutput();
  outputIdentity(output, input);
  const chunks = chunkIndex(input.chunks);
  const fields: string[] = [];
  const candidates = output.candidates.map((candidate): DartFieldCandidateOutput["candidates"][number] => {
    const parsed = record(candidate);
    if (!parsed || !exactKeys(parsed, ["field", "value", "citations"]) || typeof parsed.field !== "string" || !input.allowedFields.includes(parsed.field) || !safeGeneratedText(parsed.value) || !Array.isArray(parsed.citations) || parsed.citations.length < 1 || parsed.citations.length > groundedLimits.maxCitations) rejectOutput();
    fields.push(parsed.field);
    const citations = parsed.citations.map((citation) => {
      const cite = record(citation);
      // Source quotations are untrusted evidence, not generated advice. They may legitimately contain words such as “청약”.
      if (!cite || !exactKeys(cite, ["chunkId", "cellId", "quote"]) || !validId(cite.chunkId) || !(typeof cite.cellId === "string" || cite.cellId === null) || (cite.cellId !== null && !validId(cite.cellId)) || !boundedText(cite.quote, groundedLimits.quoteLength)) rejectOutput();
      const chunk = chunks.get(cite.chunkId);
      if (!chunk) rejectOutput();
      const source = cite.cellId === null ? chunk.text : chunk.cells.find((cell) => cell.id === cite.cellId)?.text;
      if (source === undefined || !exactQuote(source, cite.quote)) rejectOutput();
      return { chunkId: cite.chunkId, cellId: cite.cellId, quote: cite.quote };
    });
    const sourceQuotes = citations.map((citation) => citation.quote);
    const candidateValue = parsed.value as string;
    // Candidate values remain raw extraction candidates: the exact value must occur in at least one cited quote.
    if (!sourceQuotes.some((quote) => quote.includes(candidateValue)) || !hasOnlySupportedNumbers(candidateValue, sourceQuotes) || !hasFieldValueContext(parsed.field, candidateValue, sourceQuotes)) rejectOutput();
    return { field: parsed.field, value: candidateValue, citations };
  });
  if (!unique(fields)) rejectOutput();
  return { productId: input.productId, productVersion: input.productVersion, candidates };
}

function validateNarrativeBlock(value: unknown, facts: EvidenceText, signals: EvidenceText, diffs: EvidenceText) {
  const block = record(value);
  if (!block || !exactKeys(block, ["text", "citations"]) || !safeGeneratedText(block.text)) rejectOutput();
  const citations = record(block.citations);
  if (!citations || !exactKeys(citations, ["factIds", "signalIds", "diffIds"]) || !stringArray(citations.factIds, groundedLimits.maxCitations) || !stringArray(citations.signalIds, groundedLimits.maxCitations) || !stringArray(citations.diffIds, groundedLimits.maxCitations)) rejectOutput();
  const factIds = citations.factIds as string[];
  const signalIds = citations.signalIds as string[];
  const diffIds = citations.diffIds as string[];
  if (factIds.length + signalIds.length + diffIds.length < 1) rejectOutput();
  const cited = [...citedTextsForIds(factIds, facts), ...citedTextsForIds(signalIds, signals), ...citedTextsForIds(diffIds, diffs)];
  // Narrative blocks are extractive until a semantic entailment verifier exists.
  // This prevents nonnumeric contradictions and number-to-field swaps from being labeled grounded.
  if (!cited.includes(block.text)) rejectOutput();
  return { text: block.text, citations: { factIds, signalIds, diffIds } };
}

export function validateGroundedNarrative(input: GroundedNarrativeRequest, value: unknown): GroundedNarrativeOutput {
  assertGroundedNarrativeRequest(input);
  const output = record(value);
  if (!output || !exactKeys(output, ["productId", "productVersion", "corrections", "risks"]) || !Array.isArray(output.corrections) || !Array.isArray(output.risks) || output.corrections.length > groundedLimits.maxNarrativeBlocks || output.risks.length > groundedLimits.maxNarrativeBlocks) rejectOutput();
  outputIdentity(output, input);
  const facts = sourceMap(input.facts);
  const signals = sourceMap(input.signals);
  const diffs = sourceMap(input.diffs);
  const corrections = output.corrections.map((block) => validateNarrativeBlock(block, facts, signals, diffs));
  const risks = output.risks.map((block) => validateNarrativeBlock(block, facts, signals, diffs));
  return { productId: input.productId, productVersion: input.productVersion, corrections, risks };
}

export function validateGroundedQa(input: GroundedQaRequest, value: unknown): GroundedQaOutput {
  assertGroundedQaRequest(input);
  const output = record(value);
  if (!output || !exactKeys(output, ["productId", "productVersion", "answerBlocks"]) || !Array.isArray(output.answerBlocks) || output.answerBlocks.length > groundedLimits.maxAnswerBlocks) rejectOutput();
  outputIdentity(output, input);
  const blocks = sourceMap(input.blocks);
  const answerBlocks = output.answerBlocks.map((block) => {
    const parsed = record(block);
    if (!parsed || !exactKeys(parsed, ["text", "citations"]) || !safeGeneratedText(parsed.text) || !Array.isArray(parsed.citations) || parsed.citations.length < 1 || parsed.citations.length > groundedLimits.maxCitations) rejectOutput();
    const citations = parsed.citations.map((citation) => {
      const cite = record(citation);
      // Do not censor source text; recommendation checks apply only to generated prose.
      if (!cite || !exactKeys(cite, ["blockId", "quote"]) || !validId(cite.blockId) || !boundedText(cite.quote, groundedLimits.quoteLength)) rejectOutput();
      const source = blocks.get(cite.blockId);
      // Q&A citations must quote the whole bounded fact block. Substrings can invert negation or detach labels from values.
      if (source === undefined || cite.quote !== source) rejectOutput();
      return { blockId: cite.blockId, quote: cite.quote };
    });
    const answerText = parsed.text as string;
    // Q&A stays extractive until a semantic entailment verifier exists.
    if (!citations.some((citation) => citation.quote === answerText)) rejectOutput();
    return { text: answerText, citations };
  });
  return { productId: input.productId, productVersion: input.productVersion, answerBlocks };
}

/** Safe predicate forms are useful at HTTP boundaries that prefer no throws. */
export function isValidDartFieldCandidates(input: DartFieldCandidateRequest, value: unknown): value is DartFieldCandidateOutput {
  try { validateDartFieldCandidates(input, value); return true; } catch { return false; }
}
export function isValidGroundedNarrative(input: GroundedNarrativeRequest, value: unknown): value is GroundedNarrativeOutput {
  try { validateGroundedNarrative(input, value); return true; } catch { return false; }
}
export function isValidGroundedQa(input: GroundedQaRequest, value: unknown): value is GroundedQaOutput {
  try { validateGroundedQa(input, value); return true; } catch { return false; }
}

/** Validates injected configuration without ever incorporating its values in an error. */
export function assertGroundedAiServerConfig(config: GroundedAiServerConfig): void {
  if (!record(config) || typeof config.apiKey !== "string" || config.apiKey.trim().length < 1 || config.apiKey.length > 2_000 || typeof config.model !== "string" || !validId(config.model, groundedLimits.idLength) || (config.timeoutMs !== undefined && (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 100 || config.timeoutMs > 60_000)) || (config.fetcher !== undefined && typeof config.fetcher !== "function")) throw new GroundedConfigError();
}

export function isForbiddenRecommendationLanguage(text: string): boolean {
  return FORBIDDEN_RECOMMENDATION.test(text);
}
