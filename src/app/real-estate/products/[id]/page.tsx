import { loadApprovedScenarios } from "@/lib/knowledge/loader";
import type { Metadata } from "next";

import {
  OfferReportPage,
  offerReportMetadata,
  type OfferPageProps,
} from "@/components/report/OfferReportPage";

export async function generateStaticParams() {
  return (await loadApprovedScenarios()).map((offer) => ({ id: offer.offerId }));
}

export const dynamicParams = false;

export function generateMetadata(props: OfferPageProps): Promise<Metadata> {
  return offerReportMetadata(props, "real-estate");
}

export default function RealEstateProductPage(props: OfferPageProps) {
  return OfferReportPage({ ...props, assetKind: "real-estate" });
}
