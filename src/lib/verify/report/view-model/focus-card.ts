/**
 * 근거 병치 카드 — 신고서 기재(좌)와 국가 원장 관측(우)을 나란히 놓는다.
 * 모든 행은 엔진 판정·근거에서만 파생되며, 지명·이력번호는 여기서 마스킹된다.
 */
import type { ClaimKind, UnjudgedClaim, Verdict } from "../../types";
import {
  formatIsoDate,
  formatKstDateTime,
  formatKstShortDateTime,
  formatWon,
  formatYmd8,
} from "../format";
import { maskFreeText, maskRegion, maskTraceNo } from "../mask";
import type { JudgementRecord, ReportSnapshot } from "../snapshot";
import { b, shortSourceName, t, VERDICT_LABEL } from "./labels";
import type { EvidenceRowView, ExplainLevel, FocusView, RichText } from "./types";

const BIRTH_PATTERN = /출생\s*(\d{8})/;
const TRANSFER_PATTERN = /양수\s*등록\s*(\d{8})/;

/** 나머지 개체의 일괄 양수(소유권 이전) 등록일 — 비교군 문구의 근거 */
interface PeerTransfer {
  readonly count: number;
  readonly date: string;
}

/** 한 개체에 걸린 판정들을 항목별로 모아 둔 묶음 */
interface SubjectFacts {
  readonly trace?: JudgementRecord;
  readonly breed?: JudgementRecord;
  readonly sex?: JudgementRecord;
  readonly acquired?: JudgementRecord;
  readonly custody?: JudgementRecord;
  readonly price?: UnjudgedClaim;
  readonly peer?: PeerTransfer;
}

const findJudgement = (
  judgements: readonly JudgementRecord[],
  subject: string,
  kind: ClaimKind,
): JudgementRecord | undefined =>
  judgements.find((j) => j.claim.subject === subject && j.claim.kind === kind);

const peerTransfer = (
  judgements: readonly JudgementRecord[],
  exceptSubject: string,
): PeerTransfer | undefined => {
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

const collectFacts = (
  snapshot: ReportSnapshot,
  subject: string,
): SubjectFacts => {
  const { judgements, unjudged } = snapshot;
  return {
    trace: findJudgement(judgements, subject, "livestock_trace_no"),
    breed: findJudgement(judgements, subject, "livestock_breed"),
    sex: findJudgement(judgements, subject, "livestock_sex"),
    acquired: findJudgement(judgements, subject, "acquisition_date"),
    custody: findJudgement(judgements, subject, "custody_location"),
    price: unjudged.find(
      (item) =>
        item.claim.subject === subject && item.claim.kind === "acquisition_price",
    ),
    peer: peerTransfer(judgements, subject),
  };
};

/** 좌열 — 신고서에 적힌 값 그대로(마스킹만 적용) */
const buildClaimRows = (facts: SubjectFacts): readonly EvidenceRowView[] => {
  const { trace, acquired, custody, price } = facts;
  const rows: EvidenceRowView[] = [];
  if (trace) {
    rows.push({
      label: "이력번호",
      value: maskTraceNo(trace.claim.value),
      isAlert: false,
    });
  }
  if (acquired) {
    rows.push({
      label: "취득시기",
      value: formatIsoDate(acquired.claim.value),
      isAlert: false,
    });
  }
  if (custody) {
    rows.push({
      label: "보관장소",
      value: maskRegion(custody.claim.value),
      isAlert: false,
    });
  }
  if (price?.claim.numericValue !== undefined) {
    rows.push({
      label: "취득원가",
      value: formatWon(price.claim.numericValue),
      isAlert: false,
      note: `확인 불가 · ${maskFreeText(price.reason)}`,
    });
  }
  return rows;
};

/** 우열 — 원장 조회 응답에서 관측된 값 */
const buildLedgerRows = (facts: SubjectFacts): readonly EvidenceRowView[] => {
  const { trace, breed, sex, acquired, custody, peer } = facts;
  const rows: EvidenceRowView[] = [];

  if (trace) {
    const birth = trace.evidence[0]?.observed.match(BIRTH_PATTERN)?.[1];
    const traits = [breed?.evidence[0]?.observed, sex?.evidence[0]?.observed]
      .filter(Boolean)
      .join(" · ");
    rows.push({
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
    const transferred = (acquired.evidence[0]?.observed ?? "").match(
      TRANSFER_PATTERN,
    )?.[1];
    rows.push({
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
    rows.push({
      label: "현재 사육지",
      value:
        custody.verdict === "mismatch"
          ? `${observedRegion} · 다른 농장`
          : observedRegion,
      isAlert: custody.verdict !== "match",
      note: custody.verdict === "match" ? undefined : maskFreeText(custody.rationale),
    });
  }

  if (peer) {
    rows.push({
      label: "참고",
      value: `나머지 ${peer.count}두는 ${peer.date} 양수(소유권 이전) 일괄 등록`,
      isAlert: false,
    });
  }

  return rows;
};

/** 카드 하단 해설 — 판정은 같고 설명 깊이만 다르다 */
const buildFootnote = (facts: SubjectFacts): Record<ExplainLevel, RichText> => {
  const { acquired, custody, peer } = facts;
  const claimRegion = custody ? maskRegion(custody.claim.value) : "기재 지역";
  const observedRegion = custody
    ? maskRegion(custody.evidence[0]?.observed ?? "")
    : "다른 지역";
  const acquiredOn = acquired ? formatIsoDate(acquired.claim.value) : "기재일";

  return {
    easy: [
      t(`신고서에는 이 개체를 ${acquiredOn}에 취득해 ${claimRegion} 농가에서 사육 중이라고 기재되어 있습니다. 그러나 국가 원장의 최종 사육지는 `),
      b(`${observedRegion}의 다른 농장`),
      t(
        "이어서, 기재된 보관 장소가 확인되지 않았습니다. 등록 지연·오기 등 다른 원인일 수 있으므로 이 기록만으로 문제가 있다고 단정할 수 없습니다.",
      ),
    ],
    pro: [
      ...(custody
        ? [b(`${custody.claim.field} — ${maskFreeText(custody.rationale)}`), t(" ")]
        : []),
      ...(acquired && acquired.verdict !== "match"
        ? [t(`${acquired.claim.field} — ${maskFreeText(acquired.rationale)} `)]
        : []),
      ...(peer
        ? [t(`비교군 ${peer.count}두는 ${peer.date} 일괄 양수 등록으로 관측됩니다. `)]
        : []),
      t("원인(등록 지연·미인도·오기)은 본 데이터만으로 판정할 수 없습니다."),
    ],
  };
};

/** 이 개체가 미확인/확인 불가로 분류된 대표 사유 */
const primaryRationale = (
  judgements: readonly JudgementRecord[],
  subject: string,
): string => {
  const primary =
    judgements.find((j) => j.claim.subject === subject && j.verdict === "mismatch") ??
    judgements.find((j) => j.claim.subject === subject && j.verdict !== "match");
  return primary
    ? maskFreeText(primary.rationale)
    : "원장에서 기재 내용이 확인되지 않았습니다";
};

export const buildFocus = (
  snapshot: ReportSnapshot,
  subject: string,
  no: number,
  verdict: Verdict,
): FocusView => {
  const facts = collectFacts(snapshot, subject);
  const anchor =
    facts.custody ??
    facts.trace ??
    snapshot.judgements.find((j) => j.claim.subject === subject);
  const location = anchor?.claim.location;
  const observedAt = anchor?.evidence[0]?.observedAt ?? snapshot.generatedAt;

  return {
    no,
    title: `개체 ${no}호 · ${VERDICT_LABEL[verdict]}`,
    summary: primaryRationale(snapshot.judgements, subject),
    claimHeading: location
      ? `신고서 기재 · ${location.table} ${location.row}행`
      : "신고서 기재",
    claimRows: buildClaimRows(facts),
    ledgerHeading: `국가 이력 원장 · ${formatKstShortDateTime(observedAt)} 조회`,
    ledgerRows: buildLedgerRows(facts),
    foot: buildFootnote(facts),
    sourceDoc: location
      ? `신고서 원문 · ${location.section} · ${location.table} ${location.row}행`
      : "신고서 원문",
    sourceLedger: `${shortSourceName(snapshot.sources)} 조회 · ${formatKstDateTime(observedAt)}`,
  };
};
