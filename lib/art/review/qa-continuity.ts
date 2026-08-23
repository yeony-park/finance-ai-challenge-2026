export const MAX_GROUNDING_FACT_BLOCK_IDS = 12;
const MAX_GROUNDING_ID_LENGTH = 128;
const MAX_PRODUCT_VERSION_LENGTH = 96;

export type GroundingContext = {
  productVersion: string;
  factBlockIds: string[];
};

type IdentifiedBlock = { id: string };
type CitedAnswerBlock = { citations: ReadonlyArray<{ blockId: string }> };

function isBoundedId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_GROUNDING_ID_LENGTH && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
}

/** Parses only the bounded reference state. It intentionally has no field for prior answer text. */
export function parseGroundingContext(value: unknown): GroundingContext | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 2 || !("productVersion" in record) || !("factBlockIds" in record)) return null;
  if (typeof record.productVersion !== "string" || record.productVersion.length === 0 || record.productVersion.length > MAX_PRODUCT_VERSION_LENGTH) return null;
  if (!Array.isArray(record.factBlockIds) || record.factBlockIds.length > MAX_GROUNDING_FACT_BLOCK_IDS || !record.factBlockIds.every(isBoundedId)) return null;
  if (new Set(record.factBlockIds).size !== record.factBlockIds.length) return null;
  return { productVersion: record.productVersion, factBlockIds: [...record.factBlockIds] };
}

/** Validates the small client-held reference state; it never accepts answer prose. */
export function isGroundingContext(value: unknown): value is GroundingContext {
  return parseGroundingContext(value) !== null;
}

export const validateGroundingContext = parseGroundingContext;

/** A stale context is deliberately opaque: callers must reset rather than learn valid IDs. */
export function isStaleGroundingContext(context: GroundingContext, currentProductVersion: string, currentBlocks: readonly IdentifiedBlock[]): boolean {
  if (context.productVersion !== currentProductVersion) return true;
  const currentIds = new Set(currentBlocks.map((block) => block.id));
  return context.factBlockIds.some((id) => !currentIds.has(id));
}

/** Combines fresh question matches with server-verified prior IDs in a fixed small budget. */
export function eligibleGroundingBlocks<T extends IdentifiedBlock>(questionBlocks: readonly T[], verifiedPriorIds: readonly string[], currentBlocks: readonly T[]): T[] {
  const currentById = new Map(currentBlocks.map((block) => [block.id, block]));
  const selected: T[] = [];
  const add = (id: string) => {
    const block = currentById.get(id);
    if (block && !selected.some((item) => item.id === id) && selected.length < MAX_GROUNDING_FACT_BLOCK_IDS) selected.push(block);
  };
  for (const block of questionBlocks) add(block.id);
  for (const id of verifiedPriorIds) add(id);
  return selected;
}

/** Returns only IDs actually cited in this response and still eligible for this request. */
export function responseGroundingContext(productVersion: string, eligibleBlocks: readonly IdentifiedBlock[], answerBlocks: readonly CitedAnswerBlock[]): GroundingContext {
  const eligibleIds = new Set(eligibleBlocks.map((block) => block.id));
  const factBlockIds: string[] = [];
  for (const answer of answerBlocks) {
    for (const citation of answer.citations) {
      if (eligibleIds.has(citation.blockId) && !factBlockIds.includes(citation.blockId)) factBlockIds.push(citation.blockId);
      if (factBlockIds.length === MAX_GROUNDING_FACT_BLOCK_IDS) return { productVersion, factBlockIds };
    }
  }
  return { productVersion, factBlockIds };
}
