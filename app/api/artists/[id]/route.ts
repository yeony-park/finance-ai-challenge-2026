import { NextResponse } from "next/server";
import { artistRepository } from "@/lib/repositories/art-repositories";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const id=(await params).id;
 const artist=artistRepository.getById(id);
 if(!artist)return NextResponse.json({error:"not found"},{status:404});
 const current=artistRepository.getCurrentProducts(id);
 const historical=artistRepository.getHistoricalProducts(id);
 const operating=historical.filter(item=>item.lifecycle==="operating"||item.lifecycle==="exit_in_progress");
 const completed=historical.filter(item=>item.lifecycle!=="operating"&&item.lifecycle!=="exit_in_progress");
 return NextResponse.json({artist,groups:{current,operating,historical:completed},counts:{current:current.length,operating:operating.length,historical:historical.length,reportedReturn:historical.filter(item=>item.trackRecord.sourceReportedReturnPct!=null).length,calculatedSettlementReturn:historical.filter(item=>item.trackRecord.calculatedSettlementReturnPct!=null).length},auctions:artistRepository.getAuctions(id),annualMetrics:artistRepository.getAnnualMetrics(id),mode:"normalized_repository"});
}
