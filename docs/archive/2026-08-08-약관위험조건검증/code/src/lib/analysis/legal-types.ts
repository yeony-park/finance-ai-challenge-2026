/**
 * 약관규제법 무효 유형 룰 카탈로그 (stream5 검증: 6~14조 체계는 현행법과 일치).
 * 스파인 SCREEN_RULES와 같은 카탈로그 형식. 룰은 "후보 제시" 역할이며
 * 단독으로 확정 판정을 만들지 않는다 — 등급 결정은 grading.ts 규칙이 담당.
 */
import type { ClauseSpan } from "./types";

export interface LegalTypeRule {
  readonly id: string;
  readonly article: string;
  readonly label: string;
  readonly pattern: RegExp;
  readonly note: string;
}

export const LEGAL_TYPE_RULES: readonly LegalTypeRule[] = [
  {
    id: "akl-7-exemption-widen",
    article: "제7조",
    label: "면책조항의 금지",
    pattern: /회사가\s*정하는[^\n]{0,24}(기준|검사|결과)[^\n]{0,24}(제한|지급하지)/,
    note: "회사가 일방적으로 정하는 기준으로 지급을 제한하는 조항은 부당한 면책·배상 제한에 해당할 수 있습니다.",
  },
  {
    id: "akl-9-termination-widen",
    article: "제9조",
    label: "계약의 해제·해지",
    pattern: /(상당한\s*기간|회사가\s*정하는\s*기간)[^\n]{0,40}해지/,
    note: "해지권 행사 기간을 불확정 기간으로 넓히는 조항은 사업자의 해지권을 부당하게 확대할 수 있습니다.",
  },
  {
    id: "akl-10-unilateral-change",
    article: "제10조",
    label: "채무의 이행",
    pattern: /회사가\s*정하는\s*바에\s*따라[^\n]{0,16}(조정|변경)/,
    note: "급부 내용을 사업자가 일방적으로 결정·변경할 수 있게 하는 조항일 수 있습니다.",
  },
  {
    id: "akl-12-deemed-consent",
    article: "제12조",
    label: "의사표시의 의제",
    pattern: /(표시하지\s*않으면|응답이\s*없는\s*경우)[^\n]{0,20}(동의|승낙|갱신)[^\n]{0,10}(한\s*것으로\s*보|된\s*것으로\s*보)/,
    note: "고객의 무응답을 의사표시로 간주하는 조항은 의사표시 의제로 무효가 될 수 있습니다.",
  },
];

export interface LegalTypeHit {
  readonly rule: LegalTypeRule;
  readonly clauseId: string;
  readonly matched: string;
}

export const matchLegalTypes = (
  clause: ClauseSpan,
): readonly LegalTypeHit[] =>
  LEGAL_TYPE_RULES.flatMap((rule) => {
    const matched = clause.text.match(rule.pattern);
    if (!matched) return [];
    return [{ rule, clauseId: clause.clauseId, matched: matched[0].slice(0, 80) }];
  });
