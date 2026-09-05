import {
  reportHrefForOffer,
  type OfferEntry,
} from "@/components/site/offer-schedule";

import type { ReportChapterRef } from "./checklist";

export interface ChecklistBridgeOffer
  extends Pick<OfferEntry, "id" | "title" | "assetKind"> {
  readonly hasFilingFacts: boolean;
  readonly hasTrackRecord: boolean;
}

export const checklistReportHref = (
  offer: ChecklistBridgeOffer,
  chapter: ReportChapterRef,
): string | null => {
  if (chapter.requires === "filing-facts" && !offer.hasFilingFacts) return null;
  if (chapter.requires === "track-record" && !offer.hasTrackRecord) return null;
  return `${reportHrefForOffer(offer)}#${chapter.headingId}`;
};
