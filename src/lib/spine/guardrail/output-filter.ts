/**
 * 출력 필터 — 모델 응답이 사용자에게 나가기 전 마지막 관문.
 * 1) 시스템 프롬프트 카나리 유출 차단
 * 2) 주민등록번호 등 식별정보 마스킹
 * 3) 범위 밖 단정(투자 수익 보장 등) 차단
 */
import { SYSTEM_PROMPT_CANARY } from "../constants";

export interface OutputFilterResult {
  readonly ok: boolean;
  readonly text: string;
  readonly violations: readonly string[];
}

const RRN_PATTERN = /\b\d{6}[-\s]?[1-4]\d{6}\b/g;
const RRN_MASK = "******-*******";

const FORBIDDEN_CLAIMS: readonly { readonly id: string; readonly pattern: RegExp }[] = [
  { id: "guaranteed-return", pattern: /(원금\s*보장|무조건\s*수익|확정\s*수익률|반드시\s*오릅)/ },
  { id: "impersonation", pattern: /(저는|본\s*서비스는)\s*(금융감독원|금융보안원|경찰청)\s*(소속|직원)/ },
  // ---- 약관 분석 표현 원칙: 확정 판정 금지 (검토서 제3조 · DoNotPay FTC 제재 반면교사) ----
  // 활용형 주의: "~될 수 있습니다"류 완곡 표현은 통과해야 한다 (분석 템플릿·법 유형 note가 사용)
  {
    id: "definitive-toxic-clause",
    pattern:
      /(명백한\s*독소\s*조항|독소\s*조항(이다|입니다|이\s*맞습니다|임이\s*분명|이\s*분명|으로\s*판단(됩니다|된다)|으로\s*확인))/,
  },
  {
    id: "definitive-invalid",
    // 주어 앵커에 의존하지 않는다 — bare 종결형·판단/확정/확인 활용형을 독립 대안으로 차단.
    // 완곡·인용형("무효가 될 수", "무효다는/무효다고", "판단될 수")은 통과해야 한다.
    pattern:
      /(조항|약관|특약|조건|규정|내용|항)(은|이|도|들은)?[^\n]{0,14}무효(다(?![는고])|이다|입니다|임이\s*분명|가\s*확실)|무효(다(?![는고])|입니다|이다)(?=[\s.,!?"']|$)|무효(라고|로|인\s*것으로)\s*(판단|확정|확인)(됩니다|된다|합니다|했)|명백히\s*무효|무효임이\s*분명|확정적으로\s*무효|무효인\s*(조항|약관|특약)/,
  },
  {
    id: "litigation-guarantee",
    // "보장되지 않습니다"류 부정형은 통과(위양성 방지 lookahead)
    pattern:
      /(승소|이길\s*것)[^\n]{0,12}(보장(?!되지\s*않|되지는\s*않|하지\s*않)|확실(?!하지\s*않))|(무조건|반드시|확실히)\s*(승소|이깁|이긴|이길)|(소송|분쟁|소\s*제기)[^\n]{0,20}(무조건|반드시|확실히)[^\n]{0,10}(이기|이깁|승소)|승소\s*확률[^\n]{0,10}100/,
  },
];

export const filterOutput = (raw: string): OutputFilterResult => {
  const violations: string[] = [];

  if (raw.includes(SYSTEM_PROMPT_CANARY)) violations.push("system-prompt-leak");

  for (const claim of FORBIDDEN_CLAIMS) {
    if (claim.pattern.test(raw)) violations.push(claim.id);
  }

  const masked = raw.replace(RRN_PATTERN, RRN_MASK);
  const leaked = violations.includes("system-prompt-leak");

  return {
    ok: violations.length === 0,
    // 유출·위반 응답은 본문을 내보내지 않는다 (마스킹은 통과 응답에만 의미)
    text: leaked ? "" : masked,
    violations,
  };
};
