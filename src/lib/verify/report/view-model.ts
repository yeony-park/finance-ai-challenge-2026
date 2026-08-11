/**
 * 화면용 뷰 모델 — 엔진 산출 리포트(VerifyReport)에서만 파생되는 순수 변환.
 *
 * 원칙
 * - 화면이 보여주는 모든 수치·문구는 여기서 리포트로부터 파생된다(하드코딩 없음)
 * - 리포트에서 파생할 수 없는 값은 만들어내지 않고, 화면에서 정직하게 "미연결"로 표기한다
 * - 미판정(unjudged)은 숨기지 않고 "확인 불가" 계열로 표면화한다
 * - 익명화(발행사명·이력번호·지역)는 여기서 끝낸다 — 클라이언트로는 마스킹 결과만 나간다
 * - 판정 문구는 3값(일치 / 원장에서 확인되지 않음 / 확인 불가)만 쓰고 원인을 단정하지 않는다
 */
import type { Verdict } from "../types";
import {
  formatIsoDate,
  formatIsoDateShort,
  formatKstDateTime,
  formatKstShortDateTime,
  formatWon,
  formatYmd8,
} from "./format";
import { maskFreeText, maskRegion, maskTraceNo } from "./mask";
import type { JudgementRecord, ReportSnapshot } from "./snapshot";

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
  /** 이 개체가 미확인/확인 불가로 분류된 대표 사유 (엔진 rationale, 익명화 적용) */
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
  readonly tone: "good" | "warn" | "unknown";
  readonly title: string;
  readonly meta: string;
}

export interface ReplayStepView {
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

/* ── 파생 헬퍼 ─────────────────────────────── */

const t = (text: string): RichSegment => ({ text });
const b = (text: string): RichSegment => ({ text, isStrong: true });

const VERDICT_LABEL: Record<Verdict, string> = {
  match: "일치",
  mismatch: "원장에서 확인되지 않음",
  unverifiable: "확인 불가",
};

const VERDICT_BADGE: Record<Verdict, string> = {
  match: "일치",
  mismatch: "미확인",
  unverifiable: "확인 불가",
};

const SUBJECT_NO_PATTERN = /(\d+)\s*호/;
const BIRTH_PATTERN = /출생\s*(\d{8})/;
const TRANSFER_PATTERN = /양수\s*등록\s*(\d{8})/;

/** "학산 24호" → 24 (발행사·농장명은 버린다) */
const subjectNo = (subject: string, fallback: number): number => {
  const matched = subject.match(SUBJECT_NO_PATTERN);
  return matched ? Number(matched[1]) : fallback;
};

/** "축산물이력제 개체정보 (…)" → "축산물이력제 개체정보" */
const shortSourceName = (sources: readonly string[]): string => {
  const first = sources[0];
  if (!first) return "출처 미기재";
  return first.split(" (")[0]?.trim() ?? first;
};

const findJudgement = (
  judgements: readonly JudgementRecord[],
  subject: string,
  kind: string,
): JudgementRecord | undefined =>
  judgements.find((j) => j.claim.subject === subject && j.claim.kind === kind);

/** 나머지 개체의 일괄 양수(소유권 이전) 등록일 — 비교군 문구의 근거 */
const peerTransfer = (
  judgements: readonly JudgementRecord[],
  exceptSubject: string,
): { readonly count: number; readonly date: string } | undefined => {
  const counts = new Map<string, number>();
  for (const judgement of judgements) {
    if (judgement.claim.kind !== "acquisition_date") continue;
    if (judgement.claim.subject === exceptSubject) continue;
    const matched = judgement.evidence[0]?.observed.match(TRANSFER_PATTERN);
    if (!matched?.[1]) continue;
    counts.set(matched[1], (counts.get(matched[1]) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b2) => b2[1] - a[1])[0];
  return top ? { count: top[1], date: formatYmd8(top[0]) } : undefined;
};

/* ── 근거 카드 ─────────────────────────────── */

const buildFocus = (
  snapshot: ReportSnapshot,
  subject: string,
  no: number,
  verdict: Verdict,
): FocusView => {
  const { judgements, unjudged } = snapshot;
  const trace = findJudgement(judgements, subject, "livestock_trace_no");
  const breed = findJudgement(judgements, subject, "livestock_breed");
  const sex = findJudgement(judgements, subject, "livestock_sex");
  const acquired = findJudgement(judgements, subject, "acquisition_date");
  const custody = findJudgement(judgements, subject, "custody_location");
  const price = unjudged.find(
    (item) =>
      item.claim.subject === subject && item.claim.kind === "acquisition_price",
  );
  const anchor = custody ?? trace ?? judgements.find((j) => j.claim.subject === subject);
  const location = anchor?.claim.location;
  const observedAt = anchor?.evidence[0]?.observedAt ?? snapshot.generatedAt;

  const claimRows: EvidenceRowView[] = [];
  if (trace) {
    claimRows.push({
      label: "이력번호",
      value: maskTraceNo(trace.claim.value),
      isAlert: false,
    });
  }
  if (acquired) {
    claimRows.push({
      label: "취득시기",
      value: formatIsoDate(acquired.claim.value),
      isAlert: false,
    });
  }
  if (custody) {
    claimRows.push({
      label: "보관장소",
      value: maskRegion(custody.claim.value),
      isAlert: false,
    });
  }
  if (price?.claim.numericValue !== undefined) {
    claimRows.push({
      label: "취득원가",
      value: formatWon(price.claim.numericValue),
      isAlert: false,
      note: `확인 불가 · ${maskFreeText(price.reason)}`,
    });
  }

  const ledgerRows: EvidenceRowView[] = [];
  if (trace) {
    const birth = trace.evidence[0]?.observed.match(BIRTH_PATTERN)?.[1];
    const traits = [breed?.evidence[0]?.observed, sex?.evidence[0]?.observed]
      .filter(Boolean)
      .join(" · ");
    ledgerRows.push({
      label: "개체 존재",
      value: [
        trace.verdict === "match" ? "등록됨" : VERDICT_LABEL[trace.verdict],
        traits,
        birth ? `출생 ${formatYmd8(birth)}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      isAlert: trace.verdict !== "match",
    });
  }
  if (acquired) {
    const observed = acquired.evidence[0]?.observed ?? "";
    const transferred = observed.match(TRANSFER_PATTERN)?.[1];
    ledgerRows.push({
      label: "취득 시점",
      value:
        acquired.verdict === "match" && transferred
          ? `양수 등록 ${formatYmd8(transferred)}`
          : VERDICT_LABEL[acquired.verdict],
      isAlert: acquired.verdict !== "match",
      note:
        acquired.verdict === "match" ? undefined : maskFreeText(acquired.rationale),
    });
  }
  if (custody) {
    const observedRegion = maskRegion(custody.evidence[0]?.observed ?? "");
    ledgerRows.push({
      label: "현재 사육지",
      value:
        custody.verdict === "mismatch"
          ? `${observedRegion} · 다른 농장`
          : observedRegion,
      isAlert: custody.verdict !== "match",
      note: custody.verdict === "match" ? undefined : maskFreeText(custody.rationale),
    });
  }
  const peer = peerTransfer(judgements, subject);
  if (peer) {
    ledgerRows.push({
      label: "참고",
      value: `나머지 ${peer.count}두는 ${peer.date} 양수(소유권 이전) 일괄 등록`,
      isAlert: false,
    });
  }

  const claimRegion = custody ? maskRegion(custody.claim.value) : "기재 지역";
  const observedRegion = custody
    ? maskRegion(custody.evidence[0]?.observed ?? "")
    : "다른 지역";
  const acquiredOn = acquired ? formatIsoDate(acquired.claim.value) : "기재일";

  const primary =
    judgements.find((j) => j.claim.subject === subject && j.verdict === "mismatch") ??
    judgements.find((j) => j.claim.subject === subject && j.verdict !== "match");

  return {
    no,
    title: `개체 ${no}호 · ${VERDICT_LABEL[verdict]}`,
    summary: primary
      ? maskFreeText(primary.rationale)
      : "원장에서 기재 내용이 확인되지 않았습니다",
    claimHeading: location
      ? `신고서 기재 · ${location.table} ${location.row}행`
      : "신고서 기재",
    claimRows,
    ledgerHeading: `국가 이력 원장 · ${formatKstShortDateTime(observedAt)} 조회`,
    ledgerRows,
    foot: {
      easy: [
        t(`신고서에는 이 개체를 ${acquiredOn}에 취득해 ${claimRegion} 농가에서 사육 중이라고 기재되어 있습니다. 그러나 국가 원장의 최종 사육지는 `),
        b(`${observedRegion}의 다른 농장`),
        t(
          "이어서, 기재된 보관 장소가 확인되지 않았습니다. 등록 지연·오기 등 다른 원인일 수 있으므로 이 기록만으로 문제가 있다고 단정할 수 없습니다.",
        ),
      ],
      pro: [
        ...(custody
          ? ([
              b(`${custody.claim.field} — ${maskFreeText(custody.rationale)}`),
              t(" "),
            ] as RichSegment[])
          : []),
        ...(acquired && acquired.verdict !== "match"
          ? ([
              t(`${acquired.claim.field} — ${maskFreeText(acquired.rationale)} `),
            ] as RichSegment[])
          : []),
        ...(peer
          ? ([
              t(
                `비교군 ${peer.count}두는 ${peer.date} 일괄 양수 등록으로 관측됩니다. `,
              ),
            ] as RichSegment[])
          : []),
        t("원인(등록 지연·미인도·오기)은 본 데이터만으로 판정할 수 없습니다."),
      ],
    },
    sourceDoc: location
      ? `신고서 원문 · ${location.section} · ${location.table} ${location.row}행`
      : "신고서 원문",
    sourceLedger: `${shortSourceName(snapshot.sources)} 조회 · ${formatKstDateTime(observedAt)}`,
  };
};

/* ── 조립 ──────────────────────────────────── */

export const toDemoView = (input: DemoViewInput): DemoView => {
  const { report, versionCount } = input;
  const { summary, bySubject, judgements, unjudged } = report;

  const headCount = bySubject.length;
  const countOf = (verdict: Verdict) =>
    bySubject.filter((head) => head.verdict === verdict).length;
  const matched = countOf("match");
  const mismatched = countOf("mismatch");
  const unverifiable = countOf("unverifiable");

  const generatedAt = formatKstDateTime(report.generatedAt);
  const submittedOn = formatIsoDate(report.document.submittedOn);
  const source = shortSourceName(report.sources);
  const modeLabel =
    report.mode === "fake"
      ? "fake 모드 · 실측 스냅샷 재생"
      : "live 모드 · 공공 API 실호출";
  const breed =
    judgements.find((j) => j.claim.kind === "livestock_breed")?.claim.value ??
    "기초자산";
  const offerTitle = `공모 A · ${breed} 사육 투자계약증권`;
  const claimTotal = judgements.length + unjudged.length;

  const subjects: readonly SubjectCardView[] = bySubject.map((head, index) => {
    const no = subjectNo(head.subject, index + 1);
    return {
      no,
      label: `${no}호`,
      verdict: head.verdict,
      badge: VERDICT_BADGE[head.verdict],
      ariaLabel: `개체 ${no}호, ${VERDICT_LABEL[head.verdict]}`,
      hasFocus: head.verdict !== "match",
    };
  });

  const focuses: readonly FocusView[] = bySubject
    .map((head, index) => ({ head, no: subjectNo(head.subject, index + 1) }))
    .filter((item) => item.head.verdict !== "match")
    .map((item) =>
      buildFocus(report, item.head.subject, item.no, item.head.verdict),
    );

  const flaggedLabels = subjects
    .filter((subject) => subject.hasFocus)
    .map((subject) => `${subject.no}호`);

  const prices = unjudged
    .filter((item) => item.claim.kind === "acquisition_price")
    .map((item) => item.claim.numericValue ?? 0)
    .filter((value) => value > 0);
  const priceSum = prices.reduce((acc, value) => acc + value, 0);
  const priceReason = maskFreeText(
    unjudged.find((item) => item.claim.kind === "acquisition_price")?.reason ??
      "대조할 공공 데이터가 아직 연결되지 않았습니다.",
  );

  return {
    meta: {
      badge: "검증 엔진 산출 리포트",
      items: [
        `대조 실행 ${generatedAt}`,
        modeLabel,
        `출처 ${source}`,
        "익명화 적용",
      ],
    },
    offer: {
      title: offerTitle,
      tag: `증권신고서 ${formatIsoDateShort(report.document.submittedOn)} 접수`,
      meta: `개체 ${headCount}두 · 항목 판정 ${summary.total}건 · 미판정 ${unjudged.length}건`,
    },
    verdict: {
      eyebrow: `개체 ${headCount}두 전수 대조 · 국가 원장`,
      title: offerTitle,
      when: `신고서 제출 ${submittedOn} · 대조 실행 ${generatedAt}`,
      tallies: [
        { value: matched, label: VERDICT_LABEL.match, tone: "good" },
        { value: mismatched, label: VERDICT_LABEL.mismatch, tone: "warn" },
        { value: unverifiable, label: VERDICT_LABEL.unverifiable, tone: "unk" },
      ],
      itemLine: `개체 단위 집계 · 항목 판정 ${summary.total}건 — 일치 ${summary.match} · 불일치 ${summary.mismatch} · 확인 불가 ${summary.unverifiable} · 미판정 ${unjudged.length}`,
      oneLiner: {
        easy: [
          t(`공시된 개체 ${headCount}두 중 ${matched}두가 공공 데이터와 일치합니다. `),
          b(`${mismatched}두는 국가 이력 원장에서 확인되지 않았습니다.`),
          t(
            ` 취득원가 ${unjudged.length}건은 대조할 공공 데이터가 아직 연결되지 않아 확인 불가로 남겨 두었습니다.`,
          ),
        ],
        pro: [
          t(
            `개체 ${headCount}두 중 ${matched}두 전 항목 일치 · 항목 ${summary.total}건 대조 결과 일치 ${summary.match} · 불일치 ${summary.mismatch} · 확인 불가 ${summary.unverifiable}. 미확인 개체의 사유는 `,
          ),
          b("보관장소(사육지) 미확인"),
          t(
            `이며, 취득원가 ${unjudged.length}건은 어댑터 미연결로 판정하지 않았습니다. 근거 카드에서 원문 위치와 조회 응답을 확인할 수 있습니다.`,
          ),
        ],
      },
    },
    reality: {
      heading: `공시된 개체 ${headCount}두의 국가 원장 대조`,
      source: `출처 · ${source}`,
      caption:
        flaggedLabels.length > 0
          ? [
              t("개체를 선택하면 대조 근거가 표시됩니다. "),
              b(flaggedLabels.join(", ")),
              t("에서 확인되지 않은 기록이 발견되었습니다."),
            ]
          : [t("모든 개체가 공공 데이터와 일치합니다.")],
      subjects,
      focuses,
    },
    price: {
      heading: "공시 취득원가의 시장가 대조",
      source: "출처 · 경락가 어댑터 미연결",
      items: [
        {
          tone: "unknown",
          title: `취득원가 ${unjudged.length}건 · 확인 불가(미판정)`,
          meta: priceReason,
        },
        ...(prices.length > 0
          ? [
              {
                tone: "unknown" as const,
                title: `신고서 기재 합계 ${formatWon(priceSum)}`,
                meta: `개체 ${prices.length}두 · 신고서 기재값이며 공공 데이터 대조 전입니다`,
              },
              {
                tone: "unknown" as const,
                title: `개체당 평균 ${formatWon(priceSum / prices.length)} · 범위 ${formatWon(Math.min(...prices))} ~ ${formatWon(Math.max(...prices))}`,
                meta: "신고서 기재값 분포 · 시장가 대조 결과가 아닙니다",
              },
            ]
          : []),
      ],
      note: "도매시장 경락가 어댑터가 연결되기 전까지 취득원가는 판정하지 않습니다. 판정할 수 없는 항목은 일치·불일치 어느 쪽으로도 세지 않고 확인 불가로 남깁니다.",
    },
    history: {
      heading: "검증 대상 문서와 재검증 이력",
      source: "출처 · 리포트 버전링",
      items: [
        {
          tone: "good",
          title: `증권신고서 ${submittedOn} 제출본 대조`,
          meta: `대조 실행 ${generatedAt} · 리포트 버전 ${versionCount}건 보관`,
        },
        ...report.notes.map(
          (note): NoteItemView => ({
            tone: "unknown",
            title: maskFreeText(note),
            meta: "엔진 실행 기록",
          }),
        ),
        {
          tone: "warn",
          title: "정정신고서 감시는 아직 연결되지 않았습니다",
          meta: "정정 접수 시 자동 재검증·알림은 다음 단계 범위입니다",
        },
      ],
    },
    replay: {
      heading: "감지 리플레이 · 실제 대조 실행 재생 (익명화)",
      lead:
        flaggedLabels.length > 0
          ? `개체 ${flaggedLabels.join(", ")}의 원장 미확인 기록이 발견되기까지의 과정입니다.`
          : "이번 대조에서는 확인되지 않은 기록이 없었습니다.",
      steps: [
        {
          date: formatIsoDateShort(report.document.submittedOn),
          title: `증권신고서 접수 · 주장 ${claimTotal}건 추출`,
          detail:
            "이력번호·품종·성별·취득시기·보관장소·취득원가를 검증 가능한 단위로 구조화",
          isWarned: false,
        },
        {
          date: formatKstShortDateTime(report.generatedAt),
          title: `국가 원장 개체 ${headCount}두 전수 대조`,
          detail: `항목 ${summary.total}건 판정 — 일치 ${summary.match} · 불일치 ${summary.mismatch} · 확인 불가 ${summary.unverifiable}`,
          isWarned: false,
        },
        ...focuses.map(
          (focus): ReplayStepView => ({
            date: formatKstShortDateTime(report.generatedAt),
            title: focus.title,
            detail: focus.summary,
            isWarned: true,
          }),
        ),
        {
          date: "예정",
          title: "관심 등록자에게 알림 발송",
          detail: "알림 발송은 아직 연결되지 않았습니다 — 아래는 동작 미리보기입니다",
          isWarned: false,
        },
      ],
      push: {
        title: `${offerTitle.split(" · ")[0]} 판정 변동`,
        body: `개체 ${flaggedLabels.length}건이 원장에서 확인되지 않습니다. 근거 카드를 확인하세요.`,
        meta: "미리보기 · 관심 공모 알림",
      },
    },
  };
};
