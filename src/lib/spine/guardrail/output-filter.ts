import { SYSTEM_PROMPT_CANARY } from "../constants";

export interface OutputFilterResult {
  readonly ok: boolean;
  readonly text: string;
  readonly violations: readonly string[];
}

const RRN_PATTERN = /\b\d{6}[-\s]?[1-4]\d{6}\b/g;
const RRN_MASK = "******-*******";

const FORBIDDEN_CLAIMS: readonly { readonly id: string; readonly pattern: RegExp }[] = [
  {
    id: "guaranteed-return",
    pattern:
      /(원금\s*(이|은)?\s*보장|원금\s*손실\s*(이|은)?\s*없|무조건\s*수익|확정\s*수익률|수익(을|이|은)?\s*보장(?!\s*하지\s*않|\s*하지는\s*않|\s*되지\s*않)|손실\s*(이|은)?\s*없(습니다|다(?![는고])))/,
  },
  {
    id: "impersonation",
    pattern:
      /(저는|저희는|본\s*서비스는|이\s*서비스는)\s*(금융감독원|금융위원회|금융보안원|한국거래소|축산물품질평가원|국토교통부|경찰청)\s*(소속|직원|산하|공식|위탁)/,
  },
  {
    id: "valuation-assertion",
    pattern:
      /(저평가|고평가|저가|고가)\s*(다(?![는고])|이다|입니다|가\s*(맞|분명|확실)|임이\s*분명|로\s*(판단|확인)(됩니다|된다|했))|명백(한|히)\s*(저평가|고평가)|(가격|공모가|매각가|밸류|가치)[^\n]{0,12}적정(하다(?![는고])|합니다|한\s*수준(입니다|이다)|하다고\s*(판단|확인))/,
  },
  {
    id: "price-prediction",
    pattern:
      /(오를\s*(것입니다|것이다|겁니다|게\s*확실)|상승할\s*것(입니다|이다)|하락할\s*것(입니다|이다)|(오릅니다|오른다|내린다|떨어진다|상승합니다|하락합니다)(?=[\s.,!?"']|$))|(반드시|무조건|확실히)\s*(오르|상승|하락|떨어)/,
  },
  {
    id: "investment-solicitation",
    pattern:
      /(사세요|매수하세요|청약하세요|투자하세요|사도\s*(됩니다|좋습니다|괜찮습니다)|담아도\s*(됩니다|좋습니다)|투자할\s*만합니다|추천(합니다|드립니다|해\s*드립니다)|(매수|청약|투자)(를|을)?\s*권(유|장)(?!\s*하지\s*않|\s*하지는\s*않|\s*되지\s*않)|(매수|청약|투자)(를|을)?\s*권합니다)/,
  },
  {
    id: "safety-assertion",
    pattern:
      /(안전(합니다|하다(?![는고])|한\s*(투자|공모|상품|자산))|위험(이|은)?\s*(전혀)?\s*없(습니다|다(?![는고]))|리스크(가|는)?\s*없(습니다|다(?![는고]))|안심하고\s*(투자|청약|담))/,
  },
  {
    id: "fraud-assertion",
    pattern:
      /(사기(다(?![는고])|입니다|가\s*맞습니다|임이\s*(분명|확실)|로\s*(판단|확인)(됩니다|된다|했))|허위\s*(공시)?\s*(다(?![는고])|입니다|로\s*판단(됩니다|된다))|조작(됐습니다|되었습니다|입니다|이\s*확실)|발행사(가|는)\s*속(였|이고))/,
  },
  {
    id: "materiality-grade",
    pattern:
      /중대한\s*(정정|변경|사항)(?!인지|일지|여부|인가)|경미한\s*(정정|변경)(?!인지|일지|여부)|중대성\s*등급(?!\s*(을|은|를)?\s*(매기지|부여하지|산정하지|표시하지|주지)\s*않)|(정정|변경)(의|이)?\s*중대성(은|이)?\s*(높|낮|큽|작)|[A-D]\s*류\s*(정정|변경|사안)|심각도\s*(는|가)?\s*(높|낮|상|중|하)/,
  },
  {
    id: "definitive-verdict",
    pattern:
      /확정\s*판정(입니다|이다|으로\s*보)|(검증|대조)(이|가)?\s*(끝났으므로|완료(되었으므로|됐으므로))[^\n]{0,12}(안전|문제\s*없|믿)|100\s*%?\s*(안전|확실|보장|신뢰)/,
  },
  {
    id: "participation-push",
    pattern:
      /(지금\s*(바로\s*)?(시작|참여|가입)(하세요|하십시오|해\s?보세요)|(투자|청약|참여|가입|거래)(를|을)?\s*시작(하세요|하십시오|해\s?보세요)|참여하세요|가입하세요|기회를\s*놓치지\s*마세요|늦기\s*전에\s*(시작|투자|청약|참여|가입))/,
  },
  {
    id: "aggregate-score",
    pattern:
      /((신뢰|검증|종합|안전|투자)\s*점수(?!(를|을|는|가)?\s*(매기지|부여하지|산정하지|계산하지|표시하지|내지)\s*않)|통과율(?!(을|를|은|는)?\s*(표시하지|계산하지|산정하지|쓰지)\s*않)|(검증|인증|신뢰)\s*(배지|마크)(?!(를|을)?\s*(부여하지|제공하지|표시하지|달지)\s*않)|별점|\d+\s*점\s*만점|(안전|신뢰|투자)\s*등급(?!(을|를|은|이)?\s*(매기지|부여하지|산정하지|표시하지|주지)\s*않))/,
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
