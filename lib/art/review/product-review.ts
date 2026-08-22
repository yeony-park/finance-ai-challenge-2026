import { createHash } from "node:crypto";
import dartManifestJson from "@/data/art/dart-filing-manifest.json";
import type { ProductView } from "@/lib/art/types";
import type { DartDocumentArtifact } from "@/lib/art/dart/types";
import type { DartGroundingChunk, GroundedFact, GroundedQaContextBlock } from "@/lib/art/ai/contracts";
import { groundedLimits } from "@/lib/art/ai/contracts";
import { evaluateArtRisk, RISK_FACT_KEYS, type AcceptedFact, type CorrectionDiff, type RiskAssessment } from "@/lib/art/risk";

export const DART_REVIEW_FIELDS = [
  "offering.totalOfferingAmount",
  "offering.acquisitionPrice",
  "offering.unitPrice",
  "offering.numberOfUnits",
  "offering.subscriptionStart",
  "offering.subscriptionEnd",
  "offering.targetHoldingMonths",
  "offering.disclosedCosts",
  "artwork.title",
  "artwork.productionYear",
  "artwork.medium",
  "artwork.width",
  "artwork.height",
] as const;

export type DartReviewField = typeof DART_REVIEW_FIELDS[number];
export type ProductFactBlock = GroundedQaContextBlock & { title: string; evidenceIds: string[] };
type ManifestEntry = {
  productId: string;
  sourceId: string;
  receiptNo: string;
  declaredRole: "unknown" | "final" | "correction" | "result";
  sourceLabel: string;
  expectedSeries: { artist: string | null; artworkTitle: string | null };
  lineageReviewStatus: "unreviewed";
  allowAutomaticPublication: false;
};
const manifest = dartManifestJson as { schemaVersion: string; entries: ManifestEntry[] };

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
function compareCodeUnits(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

function evidenceIds(product: ProductView): string[] {
  const available = new Set(product.evidence.map((item) => item.id));
  return unique(product.offering.sourceIds.filter((id) => available.has(id)));
}

function acceptedFact(id: string, key: string, value: unknown, asOfDate: string | null, provenanceIds: string[]): AcceptedFact | null {
  if (!provenanceIds.length) return null;
  return { id, key, value, asOfDate, provenanceIds };
}

export function buildStoredRiskFacts(product: ProductView): AcceptedFact[] {
  const provenanceIds = evidenceIds(product);
  const facts: Array<AcceptedFact | null> = [];
  const { offering } = product;
  if (offering.totalOfferingAmount != null) facts.push(acceptedFact("fact-offering-total", RISK_FACT_KEYS.offeringTotal, offering.totalOfferingAmount, offering.asOfDate, provenanceIds));
  if (offering.acquisitionPrice != null) facts.push(acceptedFact("fact-acquisition-price", RISK_FACT_KEYS.acquisitionPrice, offering.acquisitionPrice, offering.asOfDate, provenanceIds));
  if (offering.disclosedCosts.length) facts.push(acceptedFact("fact-disclosed-cost-total", RISK_FACT_KEYS.disclosedCostTotal, offering.disclosedCosts.reduce((sum, item) => sum + item.amount, 0), offering.asOfDate, provenanceIds));
  if (offering.identityStatus === "exact_match") facts.push(acceptedFact("fact-artwork-identity", RISK_FACT_KEYS.artworkIdentity, "verified", offering.asOfDate, provenanceIds));
  const independentlyVerified = product.comparables.filter((item) => item.auction.verificationStatus === "verified");
  if (independentlyVerified.length) {
    const comparableEvidence = unique(independentlyVerified.flatMap((item) => item.auction.sourceIds).filter((id) => product.evidence.some((evidence) => evidence.id === id)));
    if (comparableEvidence.length) facts.push(acceptedFact("fact-comparable-sufficiency", RISK_FACT_KEYS.comparableSufficiency, independentlyVerified.length >= 3, offering.asOfDate, comparableEvidence));
  }
  return facts.filter((item): item is AcceptedFact => item !== null);
}

export function buildStoredRiskAssessment(product: ProductView, assessmentDate: string): RiskAssessment {
  const facts = buildStoredRiskFacts(product);
  const corrections: CorrectionDiff[] = [];
  for (const entry of manifestEntries(product.offering.id).filter((item) => item.declaredRole === "correction" && item.lineageReviewStatus === "unreviewed")) {
    // The curated manifest is itself provenance for the existence of an unreviewed correction.
    // Missing projection into public product.evidence must block assessment rather than erase the correction.
    const provenanceIds = [entry.sourceId];
    const factId = `fact-correction-lineage-${entry.receiptNo}`;
    facts.push({ id: factId, key: `lineage.correction.${entry.receiptNo}`, value: "unreviewed", asOfDate: product.offering.asOfDate, provenanceIds });
    corrections.push({ id: `correction-review-${entry.receiptNo}`, targetFactId: factId, previousValue: "unreviewed", nextValue: "unreviewed", provenanceIds, approvalStatus: "pending" });
  }
  return evaluateArtRisk({ asOfDate: assessmentDate, maxFactAgeDays: 365, facts, corrections });
}

function displayNumber(value: number | null | undefined, unit = "원"): string {
  return value == null ? "미확인" : `${value.toLocaleString("ko-KR")}${unit}`;
}

export function buildProductFactBlocks(product: ProductView, risk: RiskAssessment): ProductFactBlock[] {
  const ids = evidenceIds(product);
  const blocks: ProductFactBlock[] = [
    { id: "fact-offering-total", title: "총 공모금액", text: `총 공모금액 ${displayNumber(product.offering.totalOfferingAmount)}`, evidenceIds: ids },
    { id: "fact-acquisition-price", title: "작품 취득가", text: `작품 취득가 ${displayNumber(product.offering.acquisitionPrice)}`, evidenceIds: ids },
    { id: "fact-unit-price", title: "구좌가격", text: `구좌가격 ${displayNumber(product.offering.unitPrice)}`, evidenceIds: ids },
    { id: "fact-artwork", title: "작품 식별", text: `작가 ${product.artist.nameKo}, 작품 ${product.artwork.title}, 제작연도 ${product.artwork.productionYear ?? "미확인"}`, evidenceIds: ids },
    { id: "fact-issuer", title: "법적 발행사", text: `법적 발행사 ${product.issuer.legalName}`, evidenceIds: ids },
    { id: "fact-data-date", title: "데이터 기준일", text: `데이터 기준일 ${product.offering.asOfDate}`, evidenceIds: ids },
  ];
  for (const blocker of risk.blockers.slice(0, 8)) blocks.push({ id: `blocker-${blocks.length + 1}`, title: "판정 제한", text: blocker.message, evidenceIds: blocker.evidenceIds });
  for (const signal of risk.signals.slice(0, 8)) blocks.push({ id: `signal-${signal.id}`, title: "위험 규칙", text: signal.message, evidenceIds: signal.evidenceIds });
  return blocks.filter((block) => block.text.length <= groundedLimits.sourceTextLength).slice(0, groundedLimits.maxFactsPerKind);
}

export function narrativeFacts(blocks: ProductFactBlock[]): GroundedFact[] {
  return blocks.map(({ id, text }) => ({ id, text }));
}

export function productSnapshotVersion(product: ProductView, risk: RiskAssessment, documentHashes: readonly string[] = []): string {
  const input = JSON.stringify({ productId: product.offering.id, updatedAt: product.offering.updatedAt, asOfDate: product.offering.asOfDate, risk: risk.snapshotHash, documents: [...documentHashes].sort() });
  return `snapshot-${createHash("sha256").update(input).digest("hex")}`;
}

export function manifestEntries(productId: string): ManifestEntry[] {
  return manifest.entries.filter((entry) => entry.productId === productId);
}

export type GroundingChunkMetadata = {
  id: string;
  receiptNo: string;
  memberPath: string;
  documentSha256: string;
  memberSha256: string;
  sourceChunkIndex: number;
};

const searchTerms = ["공모", "모집", "취득", "구좌", "발행비용", "청약", "작품", "작가", "보유기간", "처분"];

export function buildDartGroundingChunks(product: ProductView, artifacts: readonly DartDocumentArtifact[]): { chunks: DartGroundingChunk[]; metadata: Map<string, GroundingChunkMetadata> } {
  const candidates: Array<{ score: number; chunk: DartGroundingChunk; metadata: GroundingChunkMetadata }> = [];
  const identityTerms = [product.artist.nameKo, product.artist.nameEn, product.artwork.title].filter((value): value is string => Boolean(value));
  for (const artifact of artifacts) {
    for (const sourceChunk of artifact.chunks) {
      for (let offset = 0; offset < sourceChunk.text.length; offset += groundedLimits.sourceTextLength) {
        const text = sourceChunk.text.slice(offset, offset + groundedLimits.sourceTextLength);
        if (!text.trim()) continue;
        const id = `dart-${artifact.receiptNo}-${artifact.memberSha256.slice(0, 12)}-${sourceChunk.index}-${Math.floor(offset / groundedLimits.sourceTextLength)}`;
        const score = [...searchTerms, ...identityTerms].reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
        candidates.push({
          score,
          chunk: { id, text, cells: [] },
          metadata: { id, receiptNo: artifact.receiptNo, memberPath: artifact.memberPath, documentSha256: artifact.documentSha256, memberSha256: artifact.memberSha256, sourceChunkIndex: sourceChunk.index },
        });
      }
    }
  }
  candidates.sort((left, right) => right.score - left.score || compareCodeUnits(left.metadata.receiptNo, right.metadata.receiptNo) || compareCodeUnits(left.metadata.memberPath, right.metadata.memberPath) || left.metadata.sourceChunkIndex - right.metadata.sourceChunkIndex);
  const selected = candidates.slice(0, groundedLimits.maxChunks);
  return { chunks: selected.map((item) => item.chunk), metadata: new Map(selected.map((item) => [item.metadata.id, item.metadata])) };
}

export function safeEvidenceLinks(product: ProductView, ids: readonly string[]): Array<{ id: string; title: string; url: string | null }> {
  const allowed = new Set(ids);
  return product.evidence.filter((item) => allowed.has(item.id)).map((item) => ({ id: item.id, title: item.sourceTitle, url: item.sourceUrl }));
}
