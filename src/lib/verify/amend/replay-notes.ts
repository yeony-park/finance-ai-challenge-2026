import type { SubscriptionPhase } from "../../../components/site/offers";

export const replayDisclosureOf = (
  amendmentCount: number,
  phase: SubscriptionPhase,
): string =>
  phase === "closed"
    ? `청약이 종료된 공모를 사후에 대조한 기록입니다 — 실제 접수된 정정신고서 ${amendmentCount}건 가운데 최종 정정본을 원 신고서와 같은 절차로 각각 다시 대조했고, 개체 원장 조회는 대조 실행 시각 기준입니다.`
    : `실제 접수된 정정신고서 ${amendmentCount}건 가운데 최종 정정본을 원 신고서와 같은 절차로 각각 다시 대조한 기록입니다 — 개체 원장 조회는 대조 실행 시각 기준입니다.`;

export const replayRunNoteOf = (phase: SubscriptionPhase): string =>
  phase === "closed"
    ? "청약이 종료된 공모라 두 버전 모두 지금 시점의 원장과 대조했습니다 — 청약 당시의 원장 상태와는 다를 수 있습니다."
    : "정정 전후 두 버전 모두 대조 실행 시점의 원장과 대조했습니다 — 각 신고서 제출 당시의 원장 상태와는 다를 수 있습니다.";
