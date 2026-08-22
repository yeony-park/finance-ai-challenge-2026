import {
  type DartFieldCandidateRequest,
  type GroundedNarrativeRequest,
  type GroundedQaRequest,
  groundedLimits,
} from "./contracts.ts";

type JsonSchema = Record<string, unknown>;

const id = { type: "string", minLength: 1, maxLength: groundedLimits.idLength, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*$" };
const outputText = { type: "string", minLength: 1, maxLength: groundedLimits.outputTextLength };
const quote = { type: "string", minLength: 1, maxLength: groundedLimits.quoteLength };

function identity(request: { productId: string; productVersion: string }): JsonSchema {
  return {
    productId: { const: request.productId },
    productVersion: { const: request.productVersion },
  };
}

/** Strict Responses API schema for DART-derived field proposals. */
export function dartFieldCandidateSchema(request: DartFieldCandidateRequest): JsonSchema {
  const chunkIds = request.chunks.map((chunk) => chunk.id);
  const cellIds = request.chunks.flatMap((chunk) => chunk.cells.map((cell) => cell.id));
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      ...identity(request),
      candidates: {
        type: "array",
        maxItems: groundedLimits.maxCandidates,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            field: { type: "string", enum: request.allowedFields },
            value: outputText,
            citations: {
              type: "array",
              minItems: 1,
              maxItems: groundedLimits.maxCitations,
              items: {
                type: "object",
                additionalProperties: false,
                properties: { chunkId: { ...id, enum: chunkIds }, cellId: { enum: [...cellIds, null] }, quote },
                required: ["chunkId", "cellId", "quote"],
              },
            },
          },
          required: ["field", "value", "citations"],
        },
      },
    },
    required: ["productId", "productVersion", "candidates"],
  };
}

function allowedIdArray(values: string[]): JsonSchema {
  return { type: "array", maxItems: Math.min(groundedLimits.maxCitations, values.length), items: values.length ? { ...id, enum: values } : id };
}

function narrativeBlock(request: GroundedNarrativeRequest): JsonSchema {
  const citations: JsonSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      factIds: allowedIdArray(request.facts.map((item) => item.id)),
      signalIds: allowedIdArray(request.signals.map((item) => item.id)),
      diffIds: allowedIdArray(request.diffs.map((item) => item.id)),
    },
    required: ["factIds", "signalIds", "diffIds"],
  };
  return { type: "object", additionalProperties: false, properties: { text: outputText, citations }, required: ["text", "citations"] };
}

/** Strict Responses API schema for correction and risk prose. */
export function groundedNarrativeSchema(request: GroundedNarrativeRequest): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      ...identity(request),
      corrections: { type: "array", maxItems: groundedLimits.maxNarrativeBlocks, items: narrativeBlock(request) },
      risks: { type: "array", maxItems: groundedLimits.maxNarrativeBlocks, items: narrativeBlock(request) },
    },
    required: ["productId", "productVersion", "corrections", "risks"],
  };
}

/** Strict Responses API schema for a Q&A response whose every prose block is cited. */
export function groundedQaSchema(request: GroundedQaRequest): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      ...identity(request),
      answerBlocks: {
        type: "array",
        maxItems: groundedLimits.maxAnswerBlocks,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: outputText,
            citations: {
              type: "array",
              minItems: 1,
              maxItems: groundedLimits.maxCitations,
              items: {
                type: "object",
                additionalProperties: false,
                properties: { blockId: { ...id, enum: request.blocks.map((block) => block.id) }, quote },
                required: ["blockId", "quote"],
              },
            },
          },
          required: ["text", "citations"],
        },
      },
    },
    required: ["productId", "productVersion", "answerBlocks"],
  };
}
