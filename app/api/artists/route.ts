import { NextResponse } from "next/server";
import { serializeArtist, syntheticDataMode } from "@/lib/art/dtos";
import { artistRepository } from "@/lib/repositories/art-repositories";

const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const needle = normalize(query);
  const items = artistRepository.getList().filter((artist) => !needle || normalize(`${artist.nameKo} ${artist.nameEn ?? ""}`).includes(needle)).map((artist) => {
    const current = artistRepository.getCurrentProducts(artist.id); const historical = artistRepository.getHistoricalProducts(artist.id); const operating = historical.filter((item) => item.lifecycle === "operating" || item.lifecycle === "exit_in_progress");
    return { artist: serializeArtist(artist), dataMode: syntheticDataMode, counts: { current: current.length, operating: operating.length, historical: historical.length, reportedReturn: historical.filter((item) => item.trackRecord.sourceReportedReturnPct != null).length, calculatedSettlementReturn: historical.filter((item) => item.trackRecord.calculatedSettlementReturnPct != null).length }, platforms: [...new Set([...current.map((item) => item.platform.name), ...historical.map((item) => item.platform.name)])] };
  });
  return NextResponse.json({ dataMode: syntheticDataMode, items, total: items.length, query, mode: syntheticDataMode });
}
