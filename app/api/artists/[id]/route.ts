import { NextResponse } from "next/server";
import { serializeArtist, serializeCurrentProduct, serializeHistoricalProduct, syntheticDataMode } from "@/lib/art/dtos";
import { artistRepository } from "@/lib/repositories/art-repositories";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const artist = artistRepository.getById(id);
  if (!artist) return NextResponse.json({ error: "not found" }, { status: 404 });
  const current = artistRepository.getCurrentProducts(id); const historical = artistRepository.getHistoricalProducts(id); const operating = historical.filter((item) => item.lifecycle === "operating" || item.lifecycle === "exit_in_progress"); const completed = historical.filter((item) => item.lifecycle !== "operating" && item.lifecycle !== "exit_in_progress");
  return NextResponse.json({ dataMode: syntheticDataMode, artist: serializeArtist(artist), groups: { current: current.map(serializeCurrentProduct), operating: operating.map(serializeHistoricalProduct), historical: completed.map(serializeHistoricalProduct) }, counts: { current: current.length, operating: operating.length, historical: historical.length, reportedReturn: historical.filter((item) => item.trackRecord.sourceReportedReturnPct != null).length, calculatedSettlementReturn: historical.filter((item) => item.trackRecord.calculatedSettlementReturnPct != null).length }, auctions: artistRepository.getAuctions(id).map((auction) => ({ artworkTitle: auction.artworkTitle, auctionDate: auction.auctionDate, auctionHouse: auction.auctionHouse, productionYear: auction.productionYear, medium: auction.medium, normalizedPriceKRW: auction.normalizedPriceKRW, result: auction.result })), annualMetrics: artistRepository.getAnnualMetrics(id).map((metric) => ({ year: metric.year, offered: metric.offered, sold: metric.sold, medianPrice: metric.medianPrice, unsold: metric.unsold })), mode: syntheticDataMode });
}
