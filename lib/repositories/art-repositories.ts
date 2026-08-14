import demoData from "@/data/demo/art-investment.json";
import { legacyArtData, legacyDatasetSummaries, legacyIssuers, legacyPlatforms, legacyTrackRecords } from "@/lib/art/legacy-adapter";
import type { AnalysisResult, ArtDataset, Artist, Evidence, OfferingStatus, ParsedSearchQuery, Platform, ProductView, Verdict } from "@/lib/art/types";
const demo = demoData as ArtDataset;
const dataset: ArtDataset = {
  ...demo,
  offerings: [...demo.offerings, ...legacyArtData.offerings],
  artworks: [...demo.artworks, ...legacyArtData.artworks],
  artists: [...demo.artists, ...legacyArtData.artists],
  auctions: [...demo.auctions, ...legacyArtData.auctions],
  comparables: [...demo.comparables, ...legacyArtData.comparables],
  platforms: [...demo.platforms, ...legacyPlatforms],
  issuers: [...demo.issuers, ...legacyIssuers],
  trackRecords: [...demo.trackRecords, ...legacyTrackRecords],
  evidence: [...demo.evidence, ...legacyArtData.evidence],
  analyses: [...demo.analyses, ...legacyArtData.analyses],
  annualMetrics: { ...demo.annualMetrics, ...legacyArtData.annualMetrics },
};
function productView(offeringId: string): ProductView | null {
  const offering=dataset.offerings.find((x)=>x.id===offeringId); if(!offering) return null;
  const artwork=dataset.artworks.find((x)=>x.id===offering.artworkId); const artist=dataset.artists.find((x)=>x.id===offering.artistId); const platform=dataset.platforms.find((x)=>x.id===offering.platformId); const issuer=dataset.issuers.find((x)=>x.id===offering.issuerId); const analysis=dataset.analyses.find((x)=>x.offeringId===offering.id);
  if(!artwork||!artist||!platform||!issuer||!analysis) return null;
  const auctions=dataset.auctions.filter((x)=>x.artistId===artist.id);
  const comparables=dataset.comparables.filter((x)=>x.offeringId===offering.id).flatMap((x)=>{const auction=dataset.auctions.find((a)=>a.id===x.auctionRecordId);return auction?[{...x,auction}]:[]});
  return {offering,artwork,artist,platform,issuer,analysis,auctions,comparables,trackRecords:dataset.trackRecords.filter((x)=>x.platformId===platform.id),evidence:dataset.evidence.filter((x)=>analysis.evidenceIds.includes(x.id)),annualMetrics:dataset.annualMetrics[artist.id]??[]};
}
export const productRepository={ getList:():ProductView[]=>dataset.offerings.flatMap((o)=>{const p=productView(o.id);return p?[p]:[]}), getById:(id:string)=>productView(id) };
export const artistRepository={ getList:():Artist[]=>dataset.artists, getById:(id:string)=>dataset.artists.find((x)=>x.id===id)??null, getProducts:(id:string)=>productRepository.getList().filter((x)=>x.artist.id===id), getAuctions:(id:string)=>dataset.auctions.filter((x)=>x.artistId===id), getAnnualMetrics:(id:string)=>dataset.annualMetrics[id]??[] };
export const platformRepository={ getList:():Platform[]=>dataset.platforms, getById:(id:string)=>dataset.platforms.find((x)=>x.id===id)??null, getProducts:(id:string)=>productRepository.getList().filter((x)=>x.platform.id===id), getTrackRecords:(id:string)=>dataset.trackRecords.filter((x)=>x.platformId===id) };
export const analysisRepository={ getByOfferingId:(id:string):AnalysisResult|null=>dataset.analyses.find((x)=>x.offeringId===id)??null, save:async(result:AnalysisResult)=>result };
export const evidenceRepository={ getByIds:(ids:string[]):Evidence[]=>dataset.evidence.filter((x)=>ids.includes(x.id)), getByEntity:(type:string,id:string)=>dataset.evidence.filter((x)=>x.entityType===type&&x.entityId===id) };
export const changeLogRepository={ getByEntity:(type:string,id:string)=>dataset.changeLogs.filter((x)=>x.entityType===type&&x.entityId===id) };
export const datasetSummaryRepository={ getList:()=>legacyDatasetSummaries, getByPlatformId:(id:string)=>legacyDatasetSummaries.find((item)=>item.platformId===id)??null };
export function filterProducts(products:ProductView[], parsed:ParsedSearchQuery):ProductView[]{ let result=[...products];
 if(parsed.keyword){const words=parsed.keyword.toLowerCase().split(/\s+/).filter(Boolean); result=result.filter((p)=>words.every((w)=>`${p.offering.title} ${p.artist.nameKo} ${p.platform.name} ${p.artwork.title}`.toLowerCase().includes(w)));}
 if(parsed.offeringStatus?.length) result=result.filter((p)=>parsed.offeringStatus?.includes(p.offering.status));
 if(parsed.verdict?.length) result=result.filter((p)=>parsed.verdict?.includes(p.analysis.verdict));
 if(parsed.artistNames?.length) result=result.filter((p)=>parsed.artistNames?.includes(p.artist.nameKo));
 if(parsed.platformNames?.length) result=result.filter((p)=>parsed.platformNames?.includes(p.platform.name));
 if(parsed.premiumMin!=null) result=result.filter((p)=>p.offering.acquisitionPrice!=null&&((p.offering.totalOfferingAmount!-p.offering.acquisitionPrice)/p.offering.acquisitionPrice*100)>=parsed.premiumMin!);
 if(parsed.premiumMax!=null) result=result.filter((p)=>p.offering.acquisitionPrice!=null&&((p.offering.totalOfferingAmount!-p.offering.acquisitionPrice)/p.offering.acquisitionPrice*100)<=parsed.premiumMax!);
 if(parsed.auctionVolumeMin!=null) result=result.filter((p)=>p.auctions.filter((a)=>new Date(a.auctionDate)>=new Date("2023-08-15")).length>=parsed.auctionVolumeMin!);
 if(parsed.sellThroughRateMin!=null) result=result.filter((p)=>{const o=p.auctions.filter((a)=>a.result==="sold"||a.result==="unsold");return o.length>0&&o.filter((a)=>a.result==="sold").length/o.length*100>=parsed.sellThroughRateMin!});
 if(parsed.delayedExitOnly) result=result.filter((p)=>p.trackRecords.some((t)=>(t.delayDays??0)>0));
 const rank:Record<Verdict,number>={worth_considering:0,conditional:1,caution:2,danger:3};
 result.sort((a,b)=> parsed.sort==="verdict"?rank[a.analysis.verdict]-rank[b.analysis.verdict]:parsed.sort==="premium_desc"?(((b.offering.totalOfferingAmount??0)-(b.offering.acquisitionPrice??b.offering.totalOfferingAmount??0))-((a.offering.totalOfferingAmount??0)-(a.offering.acquisitionPrice??a.offering.totalOfferingAmount??0))):parsed.sort==="auction_volume_desc"?b.auctions.length-a.auctions.length:parsed.sort==="delay_desc"?Math.max(...b.trackRecords.map(t=>t.delayDays??0))-Math.max(...a.trackRecords.map(t=>t.delayDays??0)):String(a.offering.subscriptionEnd).localeCompare(String(b.offering.subscriptionEnd)));
 return result; }
export const statusLabels:Record<OfferingStatus,string>={upcoming:"청약 예정",open:"청약 중",operating:"운용 중",exit_in_progress:"매각 진행",liquidated:"청산 완료",unverified:"상태 미확인"};
export const verdictLabels:Record<Verdict,string>={worth_considering:"해볼 만함",conditional:"조건부 해볼 만함",caution:"주의",danger:"위험"};
