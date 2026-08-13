import type { ReportSnapshot } from "../snapshot";
import { VERDICT_LABEL } from "./labels";
import type { SubjectCardView } from "./types";

const SUBJECT_NO_PATTERN = /(\d+)\s*호/;

const parseSubjectNo = (subject: string): number | undefined => {
  const matched = subject.match(SUBJECT_NO_PATTERN);
  if (!matched?.[1]) return undefined;
  const parsed = Number(matched[1]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
};

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
  const isRealEstate = report.assetKind === "real-estate";
  const nos = assignSubjectNos(report.bySubject.map((head) => head.subject));
  return report.bySubject.map((head, index) => {
    const no = isRealEstate ? index + 1 : (nos[index] ?? index + 1);
    const label = isRealEstate ? head.subject : `${no}호`;
    return {
      no,
      label,
      verdict: head.verdict,
      badge: VERDICT_LABEL[head.verdict],
      ariaLabel: isRealEstate
        ? `${label}, ${VERDICT_LABEL[head.verdict]}`
        : `개체 ${label}, ${VERDICT_LABEL[head.verdict]}`,
      hasFocus: head.verdict !== "match",
    };
  });
};
