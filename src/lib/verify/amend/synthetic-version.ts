export interface SyntheticEdit {
  readonly label: string;
  readonly find: string;
  readonly replace: string;
}

export const SYNTHETIC_AMENDMENT_RCP_NO = "00000000000000";

export const SYNTHETIC_DISCLOSURE =
  "실제 접수된 정정신고서가 아니라 원문을 조작해 만든 합성 정정본 비교 결과입니다 — 리플레이 데모 전용.";

export const DEFAULT_SYNTHETIC_EDITS: readonly SyntheticEdit[] = [
  {
    label: "개체 1건의 이력번호 끝자리 변경",
    find: "214820575",
    replace: "214820576",
  },
  {
    label: "개체 1건의 취득원가 변경",
    find: "4,574,865",
    replace: "4,900,000",
  },
];

export const applySyntheticEdits = (
  xml: string,
  edits: readonly SyntheticEdit[] = DEFAULT_SYNTHETIC_EDITS,
): string =>
  edits.reduce((acc, edit) => {
    if (!acc.includes(edit.find)) {
      throw new Error(
        `합성 정정본을 만들 수 없습니다 — 원문에서 "${edit.find}"를 찾지 못했습니다 (${edit.label})`,
      );
    }
    return acc.split(edit.find).join(edit.replace);
  }, xml);
