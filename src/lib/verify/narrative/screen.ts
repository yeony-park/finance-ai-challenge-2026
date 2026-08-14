import { filterOutput } from "../../spine/guardrail/output-filter";
import type { NarrativeSentence } from "./types";

const LONG_DIGITS_PATTERN = /\d{9,}/;

const FORBIDDEN: readonly { readonly id: string; readonly pattern: RegExp }[] = [
  {
    id: "recommendation",
    pattern:
      /(투자(를)?\s*(권|추천|권유|고려하세요|하세요)|매수|청약(을)?\s*(권|추천|하세요)|추천(합니다|드립니다|해\s*드립)|피하(세요|시기)|주의(하세요|가\s*필요합니다))/,
  },
  {
    id: "definitive-safety",
    pattern:
      /(안전(합니다|하다|한\s*공모)|문제(가)?\s*없(습니다|다)|믿을\s*수\s*있|신뢰할\s*수\s*있는\s*공모|우량|적정(합니다|하다)|부적정|과대\s*평가(입니다|다)|저평가(입니다|다)|고평가(입니다|다))/,
  },
  {
    id: "definitive-modality",
    pattern:
      /(반드시|틀림없이|명백(히|한)|확실(히|합니다|한)|의심의\s*여지|100%|전혀\s*없습니다|분명(히|합니다))/,
  },
  {
    id: "fraud-assertion",
    pattern: /(허위|사기|조작(입니다|된|했)|은폐|기망|부실\s*공시(입니다|다))/,
  },
  {
    id: "forecast",
    pattern:
      /(오를\s*것|내릴\s*것|상승할\s*것|하락할\s*것|전망(입니다|됩니다)|예상\s*수익|수익률(이)?\s*기대)/,
  },
  {
    id: "self-reporting",
    pattern:
      /(우리(는|가)|저희(는|가)|본\s*서비스(는|가)|이\s*서비스(는|가)|저희가\s*(검증|대조|발견))/,
  },
  {
    id: "process-praise",
    pattern:
      /(체계적(으로|인)|충실(히|하게)|철저(히|한)|꼼꼼(히|하게)|정밀(하게|한\s*검증)|신뢰도(가)?\s*높|투명(하게)?\s*관리)/,
  },
  {
    id: "internal-verdict-name",
    pattern: /(불일치|일치하지\s*않|합치하지\s*않|어긋(납니다|난|나는))/,
  },
  { id: "unmasked-identifier", pattern: LONG_DIGITS_PATTERN },
];

const DIGIT_PATTERN = /\d/;

export interface SentenceScreenResult {
  readonly ok: boolean;
  readonly text: string;
  readonly violations: readonly string[];
}

const normalize = (raw: string): string =>
  raw.replace(/。/g, ".").replace(/\s+/g, " ").trim();

export const screenSentence = (
  raw: string,
  tag?: NarrativeSentence["tag"],
): SentenceScreenResult => {
  const spine = filterOutput(normalize(raw));
  const local = FORBIDDEN.filter((rule) => rule.pattern.test(spine.text)).map(
    (rule) => rule.id,
  );
  const mistagged =
    tag === "ai" && DIGIT_PATTERN.test(spine.text) ? ["numeric-ai-tag"] : [];
  const violations = [...spine.violations, ...local, ...mistagged];

  return { ok: violations.length === 0, text: spine.text, violations };
};

export interface ScreenedSentences {
  readonly kept: readonly NarrativeSentence[];
  readonly discarded: number;
  readonly violations: readonly string[];
}

export const screenSentences = (
  sentences: readonly NarrativeSentence[],
): ScreenedSentences => {
  const kept: NarrativeSentence[] = [];
  const violations: string[] = [];

  for (const sentence of sentences) {
    const result = screenSentence(sentence.text, sentence.tag);
    if (result.ok) {
      kept.push({ tag: sentence.tag, text: result.text });
      continue;
    }
    violations.push(...result.violations);
  }

  return {
    kept,
    discarded: sentences.length - kept.length,
    violations: [...new Set(violations)].sort(),
  };
};
