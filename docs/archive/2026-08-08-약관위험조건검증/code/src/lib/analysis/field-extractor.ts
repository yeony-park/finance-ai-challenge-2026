/**
 * 핵심 필드 추출 — 조항 텍스트에서 7필드 스키마 후보를 룰 기반으로 뽑는다(결정적·테스트 가능).
 * LLM은 이 위에 "쉬운 말 요약" 보강으로만 얹는다(pipeline 참조) — 추출값 자체는
 * 원문 좌표(clauseId) 없는 값을 만들지 않는다.
 */
import type { ClauseSpan, ExtractedField, FieldKind } from "./types";

const FIELD_PATTERNS: readonly { readonly kind: FieldKind; readonly pattern: RegExp }[] = [
  { kind: "면책사유", pattern: /지급하지\s*(않|아니)|면책/ },
  { kind: "알릴의무", pattern: /알릴\s*의무|고지\s*의무/ },
  { kind: "해지·해제", pattern: /해지|해제/ },
  { kind: "감액·삭감", pattern: /감액|삭감/ },
  { kind: "자동갱신", pattern: /자동으로\s*갱신|자동\s*갱신|갱신에\s*동의한\s*것으로/ },
  { kind: "보장기간", pattern: /보험기간|보장기간/ },
  { kind: "보험금지급", pattern: /보험금[^\n]{0,14}지급/ },
];

const firstSentence = (text: string): string => {
  const body = text.replace(/^제\s*\d+\s*조[^)]*\)\s*/, "");
  const end = body.indexOf("다.");
  return end > 0 ? body.slice(0, end + 2) : body.slice(0, 120);
};

export const extractFields = (
  clauses: readonly ClauseSpan[],
): readonly ExtractedField[] => {
  const fields: ExtractedField[] = [];
  const seen = new Set<string>();

  for (const clause of clauses) {
    if (!clause.parsed) continue;
    for (const { kind, pattern } of FIELD_PATTERNS) {
      const key = `${kind}:${clause.clauseId}`;
      if (seen.has(key) || !pattern.test(clause.text)) continue;
      seen.add(key);
      fields.push({ kind, clauseId: clause.clauseId, summary: firstSentence(clause.text) });
    }
  }

  return fields;
};
