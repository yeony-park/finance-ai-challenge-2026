import type { RuleHit } from "../types";

export interface ScreenRule {
  readonly id: string;
  readonly category:
    | "instruction_override"
    | "role_hijack"
    | "prompt_exfil"
    | "encoding_smuggle"
    | "tool_abuse"
    | "advice_solicitation"
    | "assertion_demand"
    | "grading_demand"
    | "unmasking"
    | "pii_probe"
    | "verdict_tampering";
  readonly weight: number;
  readonly pattern: RegExp;
}

export const SCREEN_RULES: readonly ScreenRule[] = [
  {
    id: "override-ko",
    category: "instruction_override",
    weight: 5,
    pattern: /(이전|위|앞선|기존)\s*(지시|명령|프롬프트|규칙)[^\n]{0,12}(무시|잊|버리|취소)/i,
  },
  {
    id: "override-en",
    category: "instruction_override",
    weight: 5,
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  },
  {
    id: "role-hijack-ko",
    category: "role_hijack",
    weight: 5,
    pattern: /(지금부터|이제)\s*(너|당신|넌)[^\n]{0,20}(역할|모드|인격|캐릭터|개발자 모드)/i,
  },
  {
    id: "role-hijack-en",
    category: "role_hijack",
    weight: 5,
    pattern: /\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be|developer\s+mode|jailbreak|\bDAN\b)\b/i,
  },
  {
    id: "prompt-exfil-ko",
    category: "prompt_exfil",
    weight: 5,
    pattern: /(시스템\s*프롬프트|숨겨진\s*(지시|규칙)|내부\s*(태그|규칙|지침)|초기\s*설정)[^\n]{0,16}(보여|알려|출력|공개|말해)/i,
  },
  {
    id: "prompt-exfil-en",
    category: "prompt_exfil",
    weight: 5,
    pattern: /(reveal|show|print|repeat)[^\n]{0,24}(system\s*prompt|hidden\s*(instructions?|rules?))/i,
  },
  {
    id: "encoding-smuggle",
    category: "encoding_smuggle",
    weight: 3,
    pattern: /(base64|rot13|hex)[^\n]{0,16}(디코딩|해독|decode|실행)|[A-Za-z0-9+/]{80,}={0,2}/,
  },
  {
    id: "encoding-exec",
    category: "encoding_smuggle",
    weight: 5,
    pattern: /(base64|rot13|hex|인코딩[^\n]{0,6}문자열)[^\n]{0,24}(디코딩|해독|decode)[^\n]{0,24}(대로|실행|따르|수행|처리)/i,
  },
  {
    id: "tool-abuse",
    category: "tool_abuse",
    weight: 5,
    pattern: /(도구|툴|tool|function)[^\n]{0,16}(권한|호출)[^\n]{0,12}(무시|우회|강제)|call\s+the\s+\w+\s+tool\s+with/i,
  },
  {
    id: "advice-buy",
    category: "advice_solicitation",
    weight: 5,
    pattern:
      /(사도\s*(되|돼|될까|괜찮|무방)|살까요|사야\s*(하나|할까|되나|되는|하는)|청약\s*(할까|해도\s*(되|돼)|하는\s*게|말지)|매수\s*(할까|해도\s*(되|돼)|타이밍)|투자\s*(할까|해도\s*(되|돼)|가치가?\s*있|해\s*보라))/,
  },
  {
    id: "advice-recommend",
    category: "advice_solicitation",
    weight: 5,
    pattern:
      /(추천해\s*(줘|주세요|주라|줄래|봐)|골라\s*(줘|주세요|줄래)|찍어\s*(줘|주세요)|어디에\s*투자|어느\s*공모(가|를)?\s*(좋|나은|유리))/,
  },
  {
    id: "scope-bait-invest",
    category: "advice_solicitation",
    weight: 2,
    pattern: /(무조건|반드시|확실히)\s*(오르|수익|돈\s*버는)|(종목|코인)[^\n]{0,10}(추천|찍어)/,
  },
  {
    id: "assertion-demand",
    category: "assertion_demand",
    weight: 5,
    pattern:
      /(단정|확정|장담|확언)(해서|적으로|지어)?\s*(말해|말씀|써|적어|답해|판정|알려)|(사기|허위|조작|저평가|고평가|안전|위험|적정)(라고|다고|이라고)[^\n]{0,10}(말해|써|적어|단정|확정|답해|해\s*줘)/,
  },
  {
    id: "assertion-demand-fraud",
    category: "assertion_demand",
    weight: 5,
    pattern: /(사기|허위|조작|먹튀|부실\s*공시)\s*(지|죠|맞(지|죠|나요|는)|아닌가|아니야|인\s*거지|인\s*거\s*맞)/,
  },
  {
    id: "grading-demand",
    category: "grading_demand",
    weight: 5,
    pattern:
      /(중대성|중요도|심각도|중대한지|경미한지|위험도)[^\n]{0,16}(등급|점수|분류|매겨|평가해|판단해|매겨줘)|([A-D]\s*[~∼-]\s*[A-D]|[A-D]\s*류)[^\n]{0,10}(등급|분류|매겨|부여)/,
  },
  {
    id: "unmask-identity",
    category: "unmasking",
    weight: 5,
    pattern:
      /(실명|본명|진짜\s*이름|실제\s*이름)(이|은|을|를|만)?\s*(뭐|알려|공개|말해|보여|적어|찾아)|(마스킹|가림|익명화)[^\n]{0,10}(해제|풀어|없이|빼고|제거)|(가려진|가린|마스킹된)\s*(이름|성명|번호|주소|값)[^\n]{0,12}(복원|알려|보여|공개)/,
  },
  {
    id: "pii-probe",
    category: "pii_probe",
    weight: 5,
    pattern:
      /(주민(등록)?번호|생년월일|연락처|전화번호|휴대폰\s*번호|계좌번호|집\s*주소|자택|거주지|농장\s*주소)[^\n]{0,14}(알려|조회|공개|보여|찾아|말해|적어)/,
  },
  {
    id: "verdict-tampering",
    category: "verdict_tampering",
    weight: 5,
    pattern:
      /(판정|검증\s*결과|대조\s*결과|불일치|원장\s*미확인|확인\s*불가)[^\n]{0,16}(무시|빼고|숨기|지우|제외|덮어|없던)|(좋게|긍정적으로|유리하게|문제없게)\s*(써|적어|바꿔|포장|정리해|말해)/,
  },
  {
    id: "solicitation-copy-demand",
    category: "advice_solicitation",
    weight: 5,
    pattern:
      /(시작하세요|투자하세요|청약하세요|참여하세요|가입하세요|사세요)[^\n]{0,8}(이?라고|고)\s*[^\n]{0,14}(써|적어|만들|말해|문구|카피)/,
  },
  {
    id: "aggregate-score-demand",
    category: "grading_demand",
    weight: 5,
    pattern:
      /((신뢰|검증|종합|안전|투자)\s*점수[^\n]{0,20}(매겨|매기|몇\s*점|알려|평가)|\d+\s*점\s*만점[^\n]{0,16}(매겨|평가|몇\s*점)|통과율[^\n]{0,12}(알려|계산|평가))/,
  },
];

export const matchRules = (input: string): readonly RuleHit[] =>
  SCREEN_RULES.flatMap((rule) => {
    const matched = input.match(rule.pattern);
    if (!matched) return [];
    return [
      {
        ruleId: rule.id,
        category: rule.category,
        weight: rule.weight,
        matched: matched[0].slice(0, 80),
      },
    ];
  });
