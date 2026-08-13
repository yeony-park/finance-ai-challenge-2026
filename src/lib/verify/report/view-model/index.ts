/**
 * 화면용 뷰 모델 — 엔진 산출 리포트(VerifyReport)에서만 파생되는 순수 변환.
 *
 * 원칙
 * - 화면이 보여주는 모든 수치·문구는 여기서 리포트로부터 파생된다(하드코딩 없음)
 * - 리포트에서 파생할 수 없는 값은 만들어내지 않고, 화면에서 정직하게 "미연결"로 표기한다
 * - 미판정(unjudged)은 숨기지 않고 "대조 불가" 계열로 표면화한다
 * - 익명화(발행사명·이력번호·지역)는 여기서 끝낸다 — 클라이언트로는 마스킹 결과만 나간다
 * - 화면 판정 명칭은 3값(일치 / 원장 미확인 / 대조 불가)만 쓰고 원인을 단정하지 않는다
 *
 * 구조: 공통 파생값(context) → 섹션별 빌더 → 여기서 조립. 섹션 빌더는 context만 읽는다.
 */
import { buildReportContext } from "./context";
import { buildHistorySection } from "./history-section";
import { buildPriceSection } from "./price-section";
import { buildReplaySection } from "./replay-section";
import { buildRealitySection } from "./subjects-section";
import {
  buildMetaSection,
  buildOfferSection,
  buildVerdictSection,
} from "./verdict-section";
import type { DemoView, DemoViewInput } from "./types";

export type {
  DemoView,
  DemoViewInput,
  EvidenceRowView,
  ExplainLevel,
  FocusView,
  NoteItemView,
  ReplayStepView,
  RichSegment,
  RichText,
  SubjectCardView,
  TallyView,
} from "./types";

export const toDemoView = (input: DemoViewInput): DemoView => {
  const ctx = buildReportContext(input);

  return {
    meta: buildMetaSection(ctx),
    offer: buildOfferSection(ctx),
    verdict: buildVerdictSection(ctx),
    reality: buildRealitySection(ctx),
    price: buildPriceSection(ctx),
    history: buildHistorySection(ctx),
    replay: buildReplaySection(ctx),
  };
};
