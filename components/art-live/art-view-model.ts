import { historicalOfferingRepository, productRepository } from "@/lib/repositories/art-repositories";

export type ArtVerdict = "match" | "unverifiable";
export type ArtSource = { label: string; rcpNo: string; asOf: string; url: string };
export type ArtFact = { id: string; label: string; realId: string; verdict: ArtVerdict; statusNote: string; offeringAmount: number | null; acquisition: number | null; issuanceCost: number | null; asOf: string; lifecycle: string; priceChain: string; finding: string; limitation: string; sources: ArtSource[]; sourceNote: string | null };
export type ArtViewModel = { facts: ArtFact[]; historicalTotal: number; historicalByPlatform: number[] };
export const money = (value: number | null) => { if (value == null) return "미확인"; const eok = value / 100_000_000; const short = eok >= 1 ? `${Number(eok.toFixed(2))}억원` : `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`; return `${short} (${value.toLocaleString("ko-KR")}원)`; };
export const shortMoney = (value: number) => { const eok = value / 100_000_000; return eok >= 1 ? `${Number(eok.toFixed(2))}억원` : `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`; };

export function buildArtViewModel(): ArtViewModel {
  const facts = productRepository.getList().map((product, index) => {
    const offeringAmount = product.offering.totalOfferingAmount; const acquisition = product.offering.acquisitionPrice; const issuanceCost = product.offering.disclosedCosts.reduce((sum, item) => sum + item.amount, 0) || null;
    const priceChain = acquisition != null && issuanceCost != null && offeringAmount != null ? `합성 취득가 ${shortMoney(acquisition)} + 합성 비용 ${shortMoney(issuanceCost)} = 합성 공모가 ${shortMoney(offeringAmount)}` : offeringAmount != null ? `합성 공모가 ${shortMoney(offeringAmount)}` : "합성 공모가 미기재";
    return { id: `art-${index + 1}`, label: `합성 상품 ${index + 1}`, realId: product.offering.id, verdict: "unverifiable" as const, statusNote: "합성 데이터", offeringAmount, acquisition, issuanceCost, asOf: product.offering.asOfDate, lifecycle: product.offering.status, priceChain, finding: "UI와 분석 흐름 검증을 위한 시뮬레이션 값입니다.", limitation: "실제 공시, 원문, 거래 또는 투자 결과와 연결되지 않습니다.", sources: [], sourceNote: "외부 원문 링크는 제공하지 않습니다." };
  });
  const history = historicalOfferingRepository.getList(); const historicalByPlatform = [...new Set(history.map((item) => item.platform.id))].map((id) => history.filter((item) => item.platform.id === id).length).sort((a, b) => b - a);
  return { facts, historicalTotal: history.length, historicalByPlatform };
}
