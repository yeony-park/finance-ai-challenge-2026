/**
 * 출처 강제(citation enforcement) — 신뢰 스파인의 핵심 계약.
 * 모델 초안(LlmDraft)의 sourceIds가 ①비어 있거나 ②레지스트리 밖이면
 * 답변을 내보내지 않고 abstain(공식 채널 안내)으로 강등한다.
 */
import { ASSISTIVE_NOTICE } from "../constants";
import type { Citation, LlmDraft, SpineAnswer } from "../types";
import { findDoc, isRegisteredSource, officialChannels } from "./corpus";

export const ABSTAIN_TEXT =
  "이 질문은 등록된 공식 자료로 확인할 수 없어 답변을 드리지 않습니다. 아래 공식 채널에서 직접 확인해 주세요.";

export const enforceCitations = (draft: LlmDraft): SpineAnswer => {
  const validIds = draft.sourceIds.filter(isRegisteredSource);
  const hasUnknownSource = validIds.length !== draft.sourceIds.length;
  const hasNoSource = validIds.length === 0;

  if (hasNoSource || hasUnknownSource) {
    return {
      kind: "abstain",
      text: ABSTAIN_TEXT,
      officialChannels: officialChannels(),
    };
  }

  const citations: readonly Citation[] = validIds.map((id) => {
    const doc = findDoc(id);
    return {
      sourceId: id,
      title: doc?.title ?? id,
      url: doc?.url ?? "",
    };
  });

  return {
    kind: "answer",
    text: `${draft.text}\n\n${ASSISTIVE_NOTICE}`,
    citations,
  };
};
