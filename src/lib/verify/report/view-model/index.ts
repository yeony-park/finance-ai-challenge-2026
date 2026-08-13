import { buildReportContext } from "./context";
import { buildHistorySection } from "./history-section";
import { buildPriceSection } from "./price-section";
import { buildReplaySection } from "./replay-section";
import { buildRealitySection } from "./subjects-section";
import {
  buildMetaSection,
  buildOfferSection,
  buildVerdictSection,
} from "./verdict-section";
import type { DemoView, DemoViewInput } from "./types";

export { buildOfferCard } from "./offer-card";
export type { OfferCardInput, OfferCardView } from "./offer-card";

export type {
  DemoView,
  DemoViewInput,
  EvidenceRowView,
  ExplainLevel,
  FocusView,
  NoteItemView,
  ReplayStepView,
  RichSegment,
  RichText,
  SubjectCardView,
  TallyView,
} from "./types";

export const toDemoView = (input: DemoViewInput): DemoView => {
  const ctx = buildReportContext(input);

  return {
    meta: buildMetaSection(ctx),
    offer: buildOfferSection(ctx),
    verdict: buildVerdictSection(ctx),
    reality: buildRealitySection(ctx),
    price: buildPriceSection(ctx),
    history: buildHistorySection(ctx),
    replay: buildReplaySection(ctx),
  };
};
