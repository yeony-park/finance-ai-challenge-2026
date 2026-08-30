import Link from "next/link";
import { DataModeBadge, PageContainer } from "@/components/art/ui";
import { formatKrw, latestAnnualSellThroughRate, medianAuctionPrice } from "@/lib/domain/calculations";
import { artistRepository } from "@/lib/repositories/art-repositories";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

const value = (raw: string | string[] | undefined) => Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
const normalized = (raw: string) => raw.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

export default async function ArtistsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const query = value(raw.q);
  const needle = normalized(query);
  const allArtists = artistRepository.getList();
  const artists = allArtists.filter((artist) => !needle || normalized(`${artist.nameKo} ${artist.nameEn ?? ""}`).includes(needle));
  const totalHistory = allArtists.reduce((sum, artist) => sum + artistRepository.getHistoricalProducts(artist.id).length, 0);

  return <main id="main-content" className="listing-page"><PageContainer>
    <header className="page-title"><p className="section-kicker">SYNTHETIC ARTISTS</p><h1>가상 작가별 연결 이력</h1><p>가상 작가명으로 현재 합성 상품과 합성 플랫폼 이력을 함께 찾습니다. 실제 작가나 거래 기록을 나타내지 않습니다.</p></header>
    <div className="entity-summary-row"><span>가상 작가 {allArtists.length}명</span><span>합성 과거 이력 {totalHistory}건</span><span>검색 결과 {artists.length}명</span></div>
    <form className="simple-search" role="search"><label htmlFor="artist">작가명 검색</label><input id="artist" name="q" defaultValue={query} placeholder="예 : 가상 작가" /><button className="button button-primary">검색</button></form>
    <div className="artist-grid">{artists.map((artist) => {
      const current = artistRepository.getCurrentProducts(artist.id);
      const history = artistRepository.getHistoricalProducts(artist.id);
      const operating = history.filter((item) => item.lifecycle === "operating" || item.lifecycle === "exit_in_progress");
      const platformReportedReturn = history.filter((item) => item.trackRecord.sourceReportedReturnPct != null);
      const calculatedSettlementReturn = history.filter((item) => item.trackRecord.calculatedSettlementReturnPct != null);
      const auctions = artistRepository.getAuctions(artist.id);
      const metrics = artistRepository.getAnnualMetrics(artist.id);
      const rate = latestAnnualSellThroughRate(metrics, auctions);
      const platforms = [...new Set([...current.map((product) => product.platform.name), ...history.map((item) => item.platform.name)])];
      const isDemo = current.length > 0 && current.every((product) => product.offering.isDemo);
      return <Link className="artist-card artist-card-expanded" href={`/artists/${artist.id}`} key={artist.id}>
        <div className="avatar-art" aria-hidden="true">{artist.nameKo.slice(-1)}</div>
        <div>
          <DataModeBadge isDemo={isDemo} />
          <h2>{artist.nameKo}</h2>
          {artist.nameEn ? <p>{artist.nameEn}</p> : null}
          <dl>
            <div><dt>현재 합성 상품</dt><dd>{current.length}건</dd></div>
            <div><dt>운용·매각 진행</dt><dd>{operating.length}건</dd></div>
            <div><dt>합성 이력</dt><dd>{history.length}건</dd></div>
            <div><dt>시뮬레이션 수익률</dt><dd>{platformReportedReturn.length}건</dd></div>
            <div><dt>계산 수익률</dt><dd>{calculatedSettlementReturn.length}건</dd></div>
            <div><dt>낙찰률</dt><dd>{rate == null ? "미기재" : `${rate.toFixed(1)}%`}</dd></div>
            <div><dt>중위 낙찰가</dt><dd>{formatKrw(medianAuctionPrice(auctions))}</dd></div>
          </dl>
          <p className="entity-platforms">가상 플랫폼 : {platforms.length ? platforms.join(" · ") : "미기재"}</p>
        </div>
      </Link>;
    })}</div>
    {artists.length === 0 ? <p className="state-panel">검색어와 일치하는 가상 작가가 없습니다.</p> : null}
  </PageContainer></main>;
}
