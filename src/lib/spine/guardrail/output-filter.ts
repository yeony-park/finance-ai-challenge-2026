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
  {
    id: "definitive-toxic-clause",
    pattern:
      /(명백한\s*독소\s*조항|독소\s*조항(이다|입니다|이\s*맞습니다|임이\s*분명|이\s*분명|으로\s*판단(됩니다|된다)|으로\s*확인))/,
  },
  {
    id: "definitive-invalid",
    pattern:
      /(조항|약관|특약|조건|규정|내용|항)(은|이|도|들은)?[^\n]{0,14}무효(다(?![는고])|이다|입니다|임이\s*분명|가\s*확실)|무효(다(?![는고])|입니다|이다)(?=[\s.,!?"']|$)|무효(라고|로|인\s*것으로)\s*(판단|확정|확인)(됩니다|된다|합니다|했)|명백히\s*무효|무효임이\s*분명|확정적으로\s*무효|무효인\s*(조항|약관|특약)/,
  },
  {
    id: "litigation-guarantee",
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
    text: leaked ? "" : masked,
    violations,
  };
};
