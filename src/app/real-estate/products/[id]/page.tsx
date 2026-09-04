import type { Metadata } from "next";

import {
  OfferReportPage,
  offerReportMetadata,
  offerStaticParamsFor,
  type OfferPageProps,
} from "@/components/report/OfferReportPage";

export function generateStaticParams() {
  return offerStaticParamsFor("real-estate");
}

export const dynamicParams = false;

export function generateMetadata(props: OfferPageProps): Promise<Metadata> {
  return offerReportMetadata(props, "real-estate");
}

export default function RealEstateProductPage(props: OfferPageProps) {
  return OfferReportPage({ ...props, assetKind: "real-estate" });
}
