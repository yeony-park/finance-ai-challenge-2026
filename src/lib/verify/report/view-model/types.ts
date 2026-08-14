import type { Verdict } from "../../types";
import type { ReportSnapshot } from "../snapshot";

export type ExplainLevel = "easy" | "pro";

export interface RichSegment {
  readonly text: string;
  readonly isStrong?: boolean;
}
export type RichText = readonly RichSegment[];

export interface TallyView {
  readonly value: number;
  readonly label: string;
  readonly tone: "good" | "warn" | "unk";
}

export interface SubjectCardView {
  readonly no: number;
  readonly label: string;
  readonly verdict: Verdict;
  readonly badge: string;
  readonly ariaLabel: string;
  readonly hasFocus: boolean;
}

export interface EvidenceRowView {
  readonly label: string;
  readonly value: string;
  readonly isAlert: boolean;
  readonly note?: string;
}

export interface FocusView {
  readonly no: number;
  readonly title: string;
  readonly summary: string;
  readonly claimHeading: string;
  readonly claimRows: readonly EvidenceRowView[];
  readonly ledgerHeading: string;
  readonly ledgerRows: readonly EvidenceRowView[];
  readonly foot: Record<ExplainLevel, RichText>;
  readonly sourceDoc: string;
  readonly sourceLedger: string;
}

export interface NoteItemView {
  readonly id: string;
  readonly tone: "good" | "warn" | "unknown";
  readonly title: string;
  readonly meta: string;
}

export interface DemoView {
  readonly meta: { readonly badge: string; readonly items: readonly string[] };
  readonly offer: {
    readonly title: string;
    readonly tag: string;
    readonly meta: string;
  };
  readonly verdict: {
    readonly eyebrow: string;
    readonly title: string;
    readonly when: string;
    readonly tallies: readonly TallyView[];
    readonly itemLine: string;
    readonly oneLiner: Record<ExplainLevel, RichText>;
  };
  readonly reality: {
    readonly heading: string;
    readonly source: string;
    readonly caption: RichText;
    readonly subjects: readonly SubjectCardView[];
    readonly focuses: readonly FocusView[];
  };
  readonly price: {
    readonly heading: string;
    readonly source: string;
    readonly items: readonly NoteItemView[];
    readonly note: string;
  };
  readonly history: {
    readonly heading: string;
    readonly source: string;
    readonly items: readonly NoteItemView[];
  };
}

export interface DemoViewInput {
  readonly report: ReportSnapshot;
  readonly versionCount: number;
}
