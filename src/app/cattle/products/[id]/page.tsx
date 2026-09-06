import type { Metadata } from "next";

import {
  OfferReportPage,
  offerReportMetadata,
  offerStaticParamsFor,
  type OfferPageProps,
} from "@/components/report/OfferReportPage";

export function generateStaticParams() {
  return offerStaticParamsFor("livestock");
}

export const dynamicParams = false;
export const revalidate = 600;

export function generateMetadata(props: OfferPageProps): Promise<Metadata> {
  return offerReportMetadata(props, "livestock");
}

export default function CattleProductPage(props: OfferPageProps) {
  return OfferReportPage({ ...props, assetKind: "livestock" });
}
