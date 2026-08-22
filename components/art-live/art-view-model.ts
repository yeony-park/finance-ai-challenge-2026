import type { ProductView, Evidence } from "@/lib/art/types";
import { historicalOfferingRepository, productRepository } from "@/lib/repositories/art-repositories";

export type ArtVerdict = "match" | "unverifiable";
export type ArtSource = { label: string; rcpNo: string; asOf: string; url: string };
export type ArtFact = {
  id: string; label: string; realId: string; verdict: ArtVerdict; statusNote: string; offeringAmount: number | null;
  acquisition: number | null; issuanceCost: number | null; asOf: string; lifecycle: string; priceChain: string;
  finding: string; limitation: string; sources: ArtSource[]; sourceNote: string | null;
};
export type ArtViewModel = { facts: ArtFact[]; historicalTotal: number; historicalByPlatform: number[] };
type SourcePayload = { art_price?: Record<string, unknown>; sources?: Array<{ url?: unknown }>; status?: unknown; status_detail?: unknown };

const numberOf = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const textOf = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const isHttpUrl = (value: unknown): value is string => typeof value === "string" && /^https?:\/\//i.test(value);
const rcpNo = (url: string) => new URL(url).searchParams.get("rcpNo")?.match(/^\d{14}$/)?.[0] ?? null;
const dateFor = (receipt: string) => `${receipt.slice(0, 4)}-${receipt.slice(4, 6)}-${receipt.slice(6, 8)}`;
const money = (value: number | null) => { if (value == null) return "미확인"; const eok = value / 100_000_000; const short = eok >= 1 ? `${Number(eok.toFixed(2))}억원` : `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`; return `${short} (${value.toLocaleString("ko-KR")}원)`; };
const shortMoney = (value: number) => { const eok = value / 100_000_000; return eok >= 1 ? `${Number(eok.toFixed(2))}억원` : `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`; };
const documentLabel = (receipt: string, index: number) => receipt.slice(6, 8) === "12" ? "DART 정정신고서" : receipt.slice(6, 8) === "29" || (index > 0 && receipt.slice(0, 6) < "202500") ? "DART 발행실적보고서" : "DART 투자설명서";

function payload(product: ProductView): SourcePayload { return (product.offering.sourcePayload && typeof product.offering.sourcePayload === "object" ? product.offering.sourcePayload : {}) as SourcePayload; }
function dartEvidence(product: ProductView): ArtSource[] {
  return product.evidence.flatMap((item: Evidence) => {
    if (!isHttpUrl(item.sourceUrl) || !/dart\.fss\.or\.kr/i.test(item.sourceUrl)) return [];
    const receipt = rcpNo(item.sourceUrl); return receipt ? [{ label: "", rcpNo: receipt, asOf: dateFor(receipt), url: item.sourceUrl }] : [];
  }).filter((source, index, all) => all.findIndex((candidate) => candidate.rcpNo === source.rcpNo) === index).sort((a, b) => a.rcpNo.localeCompare(b.rcpNo));
}
function warningFor(product: ProductView) {
  const price = payload(product).art_price ?? {}; const status = textOf(payload(product).status) ?? "";
  if (numberOf(price.acquisition) == null) return "비교 대상으로 제시된 7억원 낙찰 사례는 다른 작품이며, 저장된 DART 접수번호도 원문 재확인이 필요합니다.";
  if (numberOf(price.hammer) != null) return "작품명이 일반명이고 lot 번호와 소장 이력이 없어 동일 작품이라는 연결을 확정할 수 없습니다.";
  if (status.includes("STORED")) return product.offering.id.includes("condo") ? "독립 비교거래가 부족하고 플랫폼 상태 표기만으로 현재 소유·보관·미처분을 확인할 수 없습니다." : "플랫폼의 저장 상태 표기는 현재 소유권·보관 상태·미처분을 독립적으로 증명하지 않습니다.";
  if (product.offering.disclosedCosts.length) return "가격 구성의 산술 일치는 작품 가치나 처분 가능성을 보장하지 않습니다.";
  return textOf(price.warning) ?? "공개 자료의 범위만 확인했으며, 현재 상태나 투자 결과를 별도로 보장하지 않습니다.";
}
function chainFor(product: ProductView, acquisition: number | null, cost: number | null, total: number | null) {
  const price = payload(product).art_price ?? {}; const hammer = numberOf(price.hammer);
  if (hammer != null && acquisition != null && total != null) return `보고 낙찰가 ${shortMoney(hammer)} → 취득가 ${shortMoney(acquisition)} → 공모가 ${shortMoney(total)}`;
  if (acquisition != null && cost != null && total != null) return `취득가 ${acquisition.toLocaleString("ko-KR")}원 + ${product.offering.disclosedCosts[0]?.label ?? "비용"} ${cost.toLocaleString("ko-KR")}원 = 공모가 ${total.toLocaleString("ko-KR")}원`;
  return total != null ? `공모가 ${total.toLocaleString("ko-KR")}원 · 취득가 미확인` : "공모가 미확인";
}
function relatedDartSources(product: ProductView, all: ProductView[]) {
  const own = dartEvidence(product); const family = own.some((item) => item.rcpNo.startsWith("202605"));
  const sources = family ? all.flatMap(dartEvidence).filter((item) => item.rcpNo.startsWith("202605")) : own;
  return sources.filter((item, index, values) => values.findIndex((value) => value.rcpNo === item.rcpNo) === index).sort((a, b) => a.rcpNo.localeCompare(b.rcpNo)).map((item, index) => ({ ...item, label: documentLabel(item.rcpNo, index) }));
}
function earliestDate(product: ProductView) { return dartEvidence(product)[0]?.rcpNo ?? "99999999999999"; }

export function buildArtViewModel(): ArtViewModel {
  const products = productRepository.getList().filter((product) => !product.offering.isDemo && product.offering.sourcePayload != null);
  const facts = products.map((product) => {
    const raw = payload(product).art_price ?? {}; const acquisition = product.offering.acquisitionPrice; const offeringAmount = product.offering.totalOfferingAmount;
    const issuanceCost = product.offering.disclosedCosts.reduce((sum, item) => sum + item.amount, 0) || null;
    const ownDart = dartEvidence(product); const sources = relatedDartSources(product, products);
    const hasCorrectedFilingAndResult = ownDart.some((item) => item.rcpNo.slice(6, 8) === "12") && ownDart.some((item) => item.rcpNo.slice(6, 8) === "29");
    const hasHammer = numberOf(raw.hammer) != null; const stale = acquisition == null;
    const verdict: ArtVerdict = hasCorrectedFilingAndResult ? "match" : "unverifiable";
    const statusNote = stale ? "기준일 갱신 필요" : hasHammer ? "작품 식별 대조 필요" : hasCorrectedFilingAndResult ? "공모가격 구성 확인" : "현재 보유 상태 미확인";
    const lifecycle = stale ? "현재 상태 재확인 필요" : "청약 완료 · 작품보관";
    const difference = acquisition != null && issuanceCost != null && offeringAmount != null ? offeringAmount - acquisition - issuanceCost : null;
    const finding = stale ? "공모금액과 청약 배정 정보는 저장본에서 확인되지만 취득가는 연결되지 않았습니다." : hasHammer && acquisition != null && offeringAmount != null ? `공개 낙찰가·취득가·공모가의 순서는 연결했으며 공모가는 보고 낙찰가보다 ${Math.floor((offeringAmount / numberOf(raw.hammer)! - 1) * 10) * 10}% 이상 높습니다.` : difference === 0 ? `공시된 취득가와 ${hasCorrectedFilingAndResult ? "발행비용" : "비용"}의 합계가 총 공모금액과 일치합니다.` : "공시 기재값 사이의 산술 관계를 확인할 수 없습니다.";
    return { id: product.offering.id, label: "", realId: product.offering.id, verdict, statusNote, offeringAmount, acquisition, issuanceCost, asOf: product.offering.asOfDate, lifecycle, priceChain: chainFor(product, acquisition, issuanceCost, offeringAmount), finding, limitation: warningFor(product), sources: stale ? [] : sources, sourceNote: stale ? "원문 DART 접수번호는 재확인 절차가 진행 중이라, 확인 전까지 공개 링크를 싣지 않습니다." : null, _sort: stale ? "99999999999999" : earliestDate(product) };
  }).sort((a, b) => a._sort.localeCompare(b._sort) || a.realId.localeCompare(b.realId)).map((fact, index) => ({ ...fact, id: `art-${index + 1}`, label: `상품 ${index + 1}` }));
  const history = historicalOfferingRepository.getList();
  const historicalByPlatform = [...new Map(history.map((item) => [item.platform.id, 0])).keys()].map((id) => history.filter((item) => item.platform.id === id).length).sort((a, b) => b - a);
  return { facts, historicalTotal: history.length, historicalByPlatform };
}

export { money, shortMoney };
