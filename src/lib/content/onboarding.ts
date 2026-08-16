import type { ProfileConcern, ProfileLevel } from "@/components/site/profile";

export const ONBOARDING_TITLE = "나의 확인 목록 만들기";

export const ONBOARDING_LEAD =
  "세 가지를 고르면 확인 질문의 순서와 설명 눈높이가 여기에 맞춰집니다 — 건너뛰어도 모든 내용은 그대로 볼 수 있습니다.";

export const LEVEL_QUESTION = "조각투자, 얼마나 익숙하세요?";

export interface LevelOption {
  readonly level: ProfileLevel;
  readonly label: string;
  readonly short: string;
}

export const LEVEL_OPTIONS: readonly LevelOption[] = [
  { level: "easy", label: "처음 들어요", short: "쉬움" },
  { level: "pro", label: "익숙해요", short: "전문" },
];

export const CONCERN_QUESTION = "가장 마음에 걸리는 게 뭐예요?";

export interface ConcernOption {
  readonly concern: ProfileConcern;
  readonly label: string;
  readonly short: string;
}

export const CONCERN_OPTIONS: readonly ConcernOption[] = [
  { concern: "asset-existence", label: "실물이 진짜 있는지", short: "실물 실재" },
  { concern: "return-structure", label: "돈이 어떻게 돌아오는지", short: "수익 구조" },
  { concern: "protection-scope", label: "문제 생기면 보호되는지", short: "보호 범위" },
  { concern: "exit-structure", label: "산 다음 언제 팔 수 있는지", short: "매각 시점" },
];

export const INTEREST_QUESTION = "어떤 자산이 궁금하세요?";

export const INTEREST_HINT = "여러 개 고를 수 있고, 고르지 않아도 됩니다.";

export const STORAGE_NOTE =
  "선택은 이 브라우저에만 저장됩니다 — 계정도 서버 전송도 없습니다.";

export const CHECKLIST_LINK_LABEL = "나의 확인 목록 보기 →";

export const CONCERN_TAG = "내 걱정";

export const CHECK_ORDER_NOTE =
  "내 걱정 항목이 맨 위에 있습니다 — 전체 8문항은 그대로입니다.";

export const PROFILE_RESET_LABEL = "초기화";

export const levelShort = (level: ProfileLevel): string =>
  LEVEL_OPTIONS.find((option) => option.level === level)?.short ?? level;

export const concernShort = (concern: ProfileConcern): string =>
  CONCERN_OPTIONS.find((option) => option.concern === concern)?.short ?? concern;
