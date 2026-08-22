/**
 * Data contracts for the grounded AI boundary.  This module is intentionally
 * free of credentials and Node-only imports so that callers can construct and
 * validate data before crossing the server boundary.
 */

export const DART_GROUNDING_VERSION = "dart-grounding-v1" as const;
export const NARRATIVE_GROUNDING_VERSION = "grounded-narrative-v1" as const;
export const QA_GROUNDING_VERSION = "grounded-qa-v1" as const;

export const groundedLimits = {
  idLength: 128,
  versionLength: 96,
  fieldNameLength: 96,
  sourceTextLength: 2_000,
  questionLength: 2_000,
  outputTextLength: 2_000,
  quoteLength: 1_200,
  maxChunks: 24,
  maxCells: 48,
  maxFields: 32,
  maxCandidates: 32,
  maxCitations: 8,
  maxNarrativeBlocks: 16,
  maxAnswerBlocks: 12,
  maxFactsPerKind: 32,
  maxInputBytes: 256 * 1024,
  maxResponseBytes: 96 * 1024,
  maxOutputTextBytes: 64 * 1024,
  timeoutMs: 12_000,
} as const;

/** A DART chunk may have zero or more table cells belonging to that chunk. */
export type DartGroundingCell = { id: string; text: string };
export type DartGroundingChunk = { id: string; text: string; cells: DartGroundingCell[] };

export type DartFieldCandidateRequest = {
  productId: string;
  productVersion: string;
  /** Fields the caller is willing to accept. This is an allow-list, not a hint. */
  allowedFields: string[];
  chunks: DartGroundingChunk[];
};

export type DartCitation = { chunkId: string; cellId: string | null; quote: string };
export type DartFieldCandidate = { field: string; value: string; citations: DartCitation[] };
export type DartFieldCandidateOutput = {
  productId: string;
  productVersion: string;
  candidates: DartFieldCandidate[];
};

export type GroundedFact = { id: string; text: string };
export type GroundedSignal = { id: string; text: string };
export type GroundedDiff = { id: string; text: string };

export type GroundedNarrativeRequest = {
  productId: string;
  productVersion: string;
  facts: GroundedFact[];
  signals: GroundedSignal[];
  diffs: GroundedDiff[];
};

export type GroundedNarrativeCitations = {
  factIds: string[];
  signalIds: string[];
  diffIds: string[];
};
export type GroundedNarrativeBlock = { text: string; citations: GroundedNarrativeCitations };
export type GroundedNarrativeOutput = {
  productId: string;
  productVersion: string;
  corrections: GroundedNarrativeBlock[];
  risks: GroundedNarrativeBlock[];
};

export type GroundedQaContextBlock = { id: string; text: string };
export type GroundedQaRequest = {
  productId: string;
  productVersion: string;
  question: string;
  blocks: GroundedQaContextBlock[];
};
export type GroundedQaCitation = { blockId: string; quote: string };
export type GroundedQaAnswerBlock = { text: string; citations: GroundedQaCitation[] };
export type GroundedQaOutput = {
  productId: string;
  productVersion: string;
  answerBlocks: GroundedQaAnswerBlock[];
};

/**
 * This configuration is accepted only by lib/art/ai/server.ts.  Supplying it
 * explicitly also makes tests independent of the process environment.
 */
export type GroundedAiServerConfig = {
  apiKey: string;
  model: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

/** Deterministic, valid empty outputs for callers that choose a local fallback. */
export function emptyDartFieldCandidates(request: Pick<DartFieldCandidateRequest, "productId" | "productVersion">): DartFieldCandidateOutput {
  return { productId: request.productId, productVersion: request.productVersion, candidates: [] };
}

export function emptyGroundedNarrative(request: Pick<GroundedNarrativeRequest, "productId" | "productVersion">): GroundedNarrativeOutput {
  return { productId: request.productId, productVersion: request.productVersion, corrections: [], risks: [] };
}

/** An empty block list explicitly means that no answer was found in supplied context. */
export function noGroundedAnswer(request: Pick<GroundedQaRequest, "productId" | "productVersion">): GroundedQaOutput {
  return { productId: request.productId, productVersion: request.productVersion, answerBlocks: [] };
}
