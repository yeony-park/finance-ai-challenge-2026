import { createHash } from "node:crypto";

import {
  CommonChunkRecordSchema,
  CommonDocumentRecordSchema,
  DerivedScenarioProductEnvelopeSchema,
  ParsedDocumentArtifactSchema,
  SourceManifestSchema,
  type DerivedFieldCitation,
  type DerivedScenarioProductEnvelope,
  type ParsedDocumentArtifact,
  type ScenarioOffer,
} from "./schema";

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const calculateCommonChunkHash = (value: {
  readonly page: number;
  readonly text: string;
  readonly canonicalText: string;
  readonly positions: readonly unknown[];
  readonly pageQuality: "ready";
}): string => sha256(JSON.stringify({
  page: value.page,
  text: value.text,
  canonicalText: value.canonicalText,
  positions: value.positions,
  pageQuality: value.pageQuality,
}));

export const calculateExtractionManifestHash = (manifestInput: unknown): string =>
  sha256(JSON.stringify(SourceManifestSchema.parse(manifestInput)));

const compact = (value: string): string => value.normalize("NFKC").replace(/[\s,]/g, "");
const numericValue = /^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/;
const canonicalNumber = (value: string): string | null => {
  const normalized = value.replaceAll(",", "");
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const negative = normalized.startsWith("-");
  const unsigned = normalized.replace(/^[+-]/, "");
  const [integer, fraction = ""] = unsigned.split(".");
  const canonicalInteger = integer.replace(/^0+(?=\d)/, "");
  const canonicalFraction = fraction.replace(/0+$/, "");
  const magnitude = `${canonicalInteger}${canonicalFraction}`.replace(/^0+$/, "");
  return `${negative && magnitude ? "-" : ""}${canonicalInteger}${canonicalFraction ? `.${canonicalFraction}` : ""}`;
};

export const isExtractionValueInQuote = (
  value: string | number,
  unit: string | null,
  quote: string,
): boolean => {
  const source = compact(quote);
  const numericExpected = typeof value === "number"
    ? canonicalNumber(String(value))
    : numericValue.test(value) ? canonicalNumber(value) : null;
  if (numericExpected !== null) {
    const quoteNumbers = [...quote.normalize("NFKC").matchAll(
      /(?<![\d.,])[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\d.,])/g,
    )].map(([token]) => canonicalNumber(token));
    if (!quoteNumbers.includes(numericExpected)) return false;
  } else if (typeof value === "number" || !source.includes(compact(value))) {
    return false;
  }
  if (!unit) return true;
  const units: Readonly<Record<string, readonly string[]>> = {
    krw: ["krw", "won", "원"],
    won: ["krw", "won", "원"],
    percent: ["percent", "%", "퍼센트"],
    "%": ["percent", "%", "퍼센트"],
    m2: ["m2", "㎡", "제곱미터"],
    months: ["months", "개월"],
    units: ["units", "개"],
  };
  const unitSource = source.toLocaleLowerCase();
  return (units[unit.toLocaleLowerCase()] ?? [unit]).some((item) =>
    item === "개"
      ? /개(?!월)/.test(unitSource)
      : unitSource.includes(compact(item).toLocaleLowerCase()));
};

export const parsedArtifactHash = (artifactInput: unknown): string => {
  const parsed = ParsedDocumentArtifactSchema.parse(artifactInput);
  const canonical = Object.fromEntries(
    Object.entries(parsed).filter(([key]) => key !== "createdAt"),
  );
  return sha256(JSON.stringify(canonical));
};

export const buildKnowledgeRecordsFromParsedDocument = (
  artifactInput: unknown,
  manifestInput: unknown,
) => {
  const artifact = ParsedDocumentArtifactSchema.parse(artifactInput);
  const manifest = SourceManifestSchema.parse(manifestInput);
  if (
    artifact.categoryId !== manifest.categoryId ||
    artifact.productId !== manifest.productId ||
    artifact.scenarioId !== manifest.scenarioId ||
    artifact.documentId !== manifest.documentId ||
    artifact.dataNature !== manifest.dataNature ||
    artifact.sourceKind !== manifest.sourceKind ||
    artifact.manifestHash !== calculateExtractionManifestHash(manifest) ||
    (manifest.sourceHash !== undefined && artifact.sourceHash !== manifest.sourceHash)
  ) throw new Error("parsed artifact와 manifest 범위가 일치하지 않습니다.");
  const base = {
    schemaVersion: 1 as const,
    categoryId: manifest.categoryId,
    productId: manifest.productId,
    ...(manifest.scenarioId ? { scenarioId: manifest.scenarioId } : {}),
    documentId: manifest.documentId,
    title: manifest.title,
    sourceKind: manifest.sourceKind,
    sourceUrl: manifest.sourceUrl,
    asOf: manifest.asOf,
    dataNature: manifest.dataNature,
    sourceHash: artifact.sourceHash,
    approvedForPublic: manifest.approvedForPublic,
    approvedForExternalAi: manifest.approvedForExternalAi,
    piiReviewStatus: manifest.piiReviewStatus,
    limitations: [...new Set([...manifest.limitations, ...artifact.limitations])],
  };
  const document = CommonDocumentRecordSchema.parse({
    ...base,
    publisher: manifest.publisher,
    collectedAt: manifest.collectedAt,
    rightsStatus: manifest.rightsStatus,
    status: artifact.status,
    pages: artifact.pages.map((page) => ({
      page: page.page,
      quality: page.native.quality,
      reasonCodes: page.native.reasonCodes,
      metrics: page.native.metrics,
      limitations: page.limitations,
    })),
  });
  const chunks = artifact.pages.flatMap((page) => {
    if (page.selected.origin === "none" || !page.selected.text.trim()) return [];
    const chunk = {
      ...base,
      chunkId: `${manifest.documentId}-p${page.page}`,
      page: page.page,
      text: page.selected.text,
      canonicalText: page.selected.canonicalText,
      positions: [],
      pageQuality: "ready" as const,
      status: "ready" as const,
      limitations: page.limitations,
    };
    return [CommonChunkRecordSchema.parse({
      ...chunk,
      chunkHash: calculateCommonChunkHash(chunk),
    })];
  });
  return { document, chunks };
};

export const MANIFEST_ASSIGNED_PRODUCT_PATHS = new Set([
  "schemaVersion",
  "categoryId",
  "scenarioId",
  "offerId",
  "dataNature",
  "sourceKind",
  "approvedForPublic",
  "status",
]);

export const scalarLeafPaths = (value: unknown, prefix = ""): string[] => {
  if (value === null || typeof value !== "object") return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, child]) =>
    scalarLeafPaths(child, prefix ? `${prefix}.${key}` : key));
};

export const valueAtPath = (value: unknown, fieldPath: string): unknown =>
  fieldPath.split(".").reduce<unknown>((current, part) => {
    if (current === null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, value);

export const isCitationValueExplicitInQuote = (
  value: DerivedFieldCitation["value"],
  unit: string | null,
  quote: string,
): boolean => {
  if (value === null) return /미확인|해당\s*없음|없음/.test(quote);
  if (typeof value === "boolean") {
    const normalized = quote.normalize("NFKC");
    const asserted = normalized.includes(":")
      ? normalized.slice(normalized.lastIndexOf(":") + 1)
      : normalized;
    const expression = value
      ? /(?:^|[\s:,(])(?:true|예|있음|적용)(?=$|[\s.,)])/i
      : /(?:^|[\s:,(])(?:false|아니오|없음|미적용)(?=$|[\s.,)])/i;
    return expression.test(asserted);
  }
  return isExtractionValueInQuote(value, unit, quote);
};

export const citationMatches = (
  citation: DerivedFieldCitation,
  product: ScenarioOffer,
  artifact: ParsedDocumentArtifact,
): boolean => {
  const page = artifact.pages.find((item) => item.page === citation.page);
  const actual = valueAtPath(product, citation.fieldPath);
  const normalizedPage = page?.selected.text.normalize("NFKC").replace(/\s+/g, "");
  const normalizedQuote = citation.exactQuote.normalize("NFKC").replace(/\s+/g, "");
  const quoteIsPresent = page?.selected.text.includes(citation.exactQuote) ||
    (normalizedQuote.length > 0 && normalizedPage?.includes(normalizedQuote));
  return page?.selected.origin === citation.origin && quoteIsPresent === true &&
    Object.is(actual, citation.value) &&
    isCitationValueExplicitInQuote(citation.value, citation.unit, citation.exactQuote);
};

export const citationsCoverProduct = (
  citations: readonly DerivedFieldCitation[],
  product: ScenarioOffer,
): boolean => {
  const paths = citations.map((citation) => citation.fieldPath);
  const required = scalarLeafPaths(product).filter((field) => !MANIFEST_ASSIGNED_PRODUCT_PATHS.has(field));
  return paths.length === new Set(paths).size && paths.length === required.length &&
    required.every((field) => paths.includes(field));
};

export const isValidAutoApprovedEnvelope = (
  envelopeInput: unknown,
  artifactInput: unknown,
): envelopeInput is DerivedScenarioProductEnvelope => {
  const envelope = DerivedScenarioProductEnvelopeSchema.safeParse(envelopeInput);
  const artifact = ParsedDocumentArtifactSchema.safeParse(artifactInput);
  if (!envelope.success || !artifact.success || envelope.data.status !== "auto-approved") return false;
  const value = envelope.data;
  const parsed = artifact.data;
  if (!value.manifest || !value.product || !value.document) return false;
  if (value.manifestHash !== calculateExtractionManifestHash(value.manifest)) return false;
  let rebuilt: ReturnType<typeof buildKnowledgeRecordsFromParsedDocument>;
  try {
    rebuilt = buildKnowledgeRecordsFromParsedDocument(parsed, value.manifest);
  } catch {
    return false;
  }
  return value.sourceHash === parsed.sourceHash &&
    parsed.dataNature === "scenario" && parsed.sourceKind === "scenario-input" &&
    parsed.manifestHash === value.manifestHash &&
    value.scenarioId === parsed.scenarioId && value.productId === parsed.productId &&
    value.documentId === parsed.documentId && value.parsedArtifactHash === parsedArtifactHash(parsed) &&
    value.productHash === sha256(JSON.stringify(value.product)) &&
    JSON.stringify(value.document) === JSON.stringify(rebuilt.document) &&
    JSON.stringify(value.chunks) === JSON.stringify(rebuilt.chunks) &&
    value.chunks.length > 0 && value.chunks.every((chunk) =>
      value.chunkHashes[chunk.chunkId] === chunk.chunkHash &&
      calculateCommonChunkHash(chunk) === chunk.chunkHash
    ) && value.fieldCitations.every((citation) =>
      citationMatches(citation, value.product!, parsed)
    ) && citationsCoverProduct(value.fieldCitations, value.product);
};
