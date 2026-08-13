/**
 * 개체 카드 — 공시된 개체 하나가 카드 한 장이 된다.
 * 발행사·농장명은 버리고 번호만 남긴다(익명화), 번호는 화면 key로도 쓰이므로 유일해야 한다.
 */
import type { ReportSnapshot } from "../snapshot";
import { VERDICT_LABEL } from "./labels";
import type { SubjectCardView } from "./types";

/** "학산 24호" → 24 */
const SUBJECT_NO_PATTERN = /(\d+)\s*호/;

const parseSubjectNo = (subject: string): number | undefined => {
  const matched = subject.match(SUBJECT_NO_PATTERN);
  if (!matched?.[1]) return undefined;
  const parsed = Number(matched[1]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
};

/**
 * 개체명에서 읽어낸 번호를 순서대로 배정한다.
 * 1차로 이름에서 읽어낸 번호를 확정하고, 읽지 못했거나 앞 개체와 겹치는 항목만
 * 2차에서 아직 쓰이지 않은 가장 작은 번호로 명시적으로 조정한다 — 번호 중복은 만들지 않는다.
 */
export const assignSubjectNos = (
  subjects: readonly string[],
): readonly number[] => {
  const assigned: (number | undefined)[] = subjects.map(() => undefined);
  const used = new Set<number>();

  subjects.forEach((subject, index) => {
    const parsed = parseSubjectNo(subject);
    if (parsed === undefined || used.has(parsed)) return;
    assigned[index] = parsed;
    used.add(parsed);
  });

  let candidate = 1;
  return assigned.map((no) => {
    if (no !== undefined) return no;
    while (used.has(candidate)) candidate += 1;
    used.add(candidate);
    return candidate;
  });
};

export const buildSubjectCards = (
  report: ReportSnapshot,
): readonly SubjectCardView[] => {
  const nos = assignSubjectNos(report.bySubject.map((head) => head.subject));
  return report.bySubject.map((head, index) => {
    const no = nos[index] ?? index + 1;
    return {
      no,
      label: `${no}호`,
      verdict: head.verdict,
      badge: VERDICT_LABEL[head.verdict],
      ariaLabel: `개체 ${no}호, ${VERDICT_LABEL[head.verdict]}`,
      // 일치 개체는 대조할 편차가 없어 근거 카드를 열지 않는다
      hasFocus: head.verdict !== "match",
    };
  });
};
