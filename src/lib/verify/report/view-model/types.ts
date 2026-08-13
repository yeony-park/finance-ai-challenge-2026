/**
 * 화면이 받는 뷰 계약 — 이 파일이 데모 화면과 엔진 사이의 유일한 인터페이스다.
 * 조립 규칙과 원칙은 index.ts 헤더 주석 참조.
 */
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
  /** 이 개체가 원장 미확인/대조 불가로 분류된 대표 사유 (엔진 rationale, 익명화 적용) */
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
  /** 목록 key용 안정 식별자 — 제목은 엔진 자유 문장이라 key로 쓸 수 없다 */
  readonly id: string;
  readonly tone: "good" | "warn" | "unknown";
  readonly title: string;
  readonly meta: string;
}

export interface ReplayStepView {
  /** 목록 key용 안정 식별자 — 제목은 판정 문구에서 파생돼 중복될 수 있다 */
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly detail: string | null;
  readonly isWarned: boolean;
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
  readonly replay: {
    readonly heading: string;
    readonly lead: string;
    readonly steps: readonly ReplayStepView[];
    readonly push: {
      readonly title: string;
      readonly body: string;
      readonly meta: string;
    };
  };
}

export interface DemoViewInput {
  readonly report: ReportSnapshot;
  readonly versionCount: number;
}
