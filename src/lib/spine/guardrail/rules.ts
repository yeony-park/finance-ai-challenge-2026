import type { RuleHit } from "../types";

export interface ScreenRule {
  readonly id: string;
  readonly category:
    | "instruction_override"
    | "role_hijack"
    | "prompt_exfil"
    | "encoding_smuggle"
    | "tool_abuse"
    | "scope_bait";
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
    pattern: /(시스템\s*프롬프트|숨겨진\s*(지시|규칙)|초기\s*설정)[^\n]{0,16}(보여|알려|출력|공개|말해)/i,
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
    id: "tool-abuse",
    category: "tool_abuse",
    weight: 5,
    pattern: /(도구|툴|tool|function)[^\n]{0,16}(권한|호출)[^\n]{0,12}(무시|우회|강제)|call\s+the\s+\w+\s+tool\s+with/i,
  },
  {
    id: "scope-bait-invest",
    category: "scope_bait",
    weight: 2,
    pattern: /(무조건|반드시|확실히)\s*(오르|수익|돈\s*버는)|(종목|코인)[^\n]{0,10}(추천해|찍어)/i,
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
