import type { SubscriptionPhase } from "@/components/site/offers";
import type { AssetKind, RealEstateAssetLifecycle } from "@/lib/verify/types";

export const LIFECYCLE_TITLE = "이 공모는 지금 어느 단계인가";

export const LIFECYCLE_NOTE =
  "청약 단계는 증권신고서 일정 기준입니다. 이후 단계는 관련 공시가 접수되면 같은 절차로 대조합니다 — 주식과 달리 상시 유통시장이 없을 수 있습니다.";

export const HOLDING_STAGE_LABELS: Readonly<Record<AssetKind, string>> = {
  livestock: "사육·보유",
  "real-estate": "운영·보유",
};

export type LifecycleStageState = "done" | "current" | "pending";

export interface LifecycleStageView {
  readonly id: "subscription" | "allotment" | "holding" | "exit";
  readonly label: string;
  readonly state: LifecycleStageState;
  readonly note: string;
}

export const STAGE_NOTE_UPCOMING = "예정";
export const STAGE_NOTE_OPEN = "진행 중";
export const STAGE_NOTE_CLOSED = "종료";
export const STAGE_NOTE_PENDING = "공시 접수 대기";
export const STAGE_NOTE_PASSED = "경과";
export const STAGE_NOTE_EXIT_VERIFIED = "매각 공시 대조 완료";
export const STAGE_NOTE_OPERATING = "플랫폼 공지 기준 운영";

export const buildLifecycleStages = (input: {
  readonly phase: SubscriptionPhase;
  readonly assetKind: AssetKind;
  readonly assetLifecycle?: RealEstateAssetLifecycle;
  readonly isExitVerified?: boolean;
}): readonly LifecycleStageView[] => {
  const holdingLabel = HOLDING_STAGE_LABELS[input.assetKind];

  if (input.isExitVerified) {
    return [
      { id: "subscription", label: "청약", state: "done", note: STAGE_NOTE_CLOSED },
      { id: "allotment", label: "배정·납입", state: "done", note: STAGE_NOTE_PASSED },
      { id: "holding", label: holdingLabel, state: "done", note: STAGE_NOTE_PASSED },
      { id: "exit", label: "매각·정산", state: "done", note: STAGE_NOTE_EXIT_VERIFIED },
    ];
  }

  if (
    input.assetKind === "real-estate" &&
    input.assetLifecycle === "operating" &&
    input.phase === "closed"
  ) {
    return [
      { id: "subscription", label: "청약", state: "done", note: STAGE_NOTE_CLOSED },
      { id: "allotment", label: "배정·납입", state: "done", note: STAGE_NOTE_PASSED },
      { id: "holding", label: holdingLabel, state: "current", note: STAGE_NOTE_OPERATING },
      { id: "exit", label: "매각·정산", state: "pending", note: STAGE_NOTE_PENDING },
    ];
  }

  const subscriptionNote =
    input.phase === "upcoming"
      ? STAGE_NOTE_UPCOMING
      : input.phase === "open"
        ? STAGE_NOTE_OPEN
        : STAGE_NOTE_CLOSED;
  const subscriptionState: LifecycleStageState =
    input.phase === "closed" ? "done" : "current";
  const restState: LifecycleStageState = "pending";
  const restNote = input.phase === "closed" ? STAGE_NOTE_PENDING : "";

  return [
    {
      id: "subscription",
      label: "청약",
      state: subscriptionState,
      note: subscriptionNote,
    },
    { id: "allotment", label: "배정·납입", state: restState, note: restNote },
    { id: "holding", label: holdingLabel, state: restState, note: restNote },
    { id: "exit", label: "매각·정산", state: restState, note: restNote },
  ];
};
