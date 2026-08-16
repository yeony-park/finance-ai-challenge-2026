import type { CategoryId } from "./categories";
import type { GuideTarget } from "./home";

export type ScaffoldMatch =
  | { readonly kind: "category"; readonly categoryId: CategoryId }
  | { readonly kind: "guide"; readonly target: GuideTarget }
  | { readonly kind: "reports" }
  | { readonly kind: "none" };

interface MatchRule {
  readonly pattern: RegExp;
  readonly result: ScaffoldMatch;
}

const RULES: readonly MatchRule[] = [
  { pattern: /(한우|송아지|축산|소\s*(공모|조각|투자))/, result: { kind: "category", categoryId: "cattle" } },
  { pattern: /(돼지|한돈|양돈)/, result: { kind: "category", categoryId: "pig" } },
  { pattern: /(미술|그림|아트|작품)/, result: { kind: "category", categoryId: "art" } },
  { pattern: /(부동산|건물|빌딩|상가|오피스)/, result: { kind: "category", categoryId: "real-estate" } },
  { pattern: /(예금자\s*보호|예탁금|보호\s*장치|보호되|보호\s*받)/, result: { kind: "guide", target: "protection" } },
  { pattern: /(청약|매각|환매|팔\s*수|판매|유통|언제\s*팔)/, result: { kind: "guide", target: "lifecycle" } },
  { pattern: /(확인해야|체크리스트|믿을|뭘\s*봐야|무엇을\s*확인|수익\s*구조|수수료|정산)/, result: { kind: "guide", target: "checklist" } },
  { pattern: /(리포트|검증\s*(결과|리포트)|대조\s*결과|불일치|정정|공시가?\s*(실제|사실|다르))/, result: { kind: "reports" } },
  { pattern: /(조각\s*투자|조각투자|뭔가요|무엇인가|처음|입문|시작)/, result: { kind: "guide", target: "intro" } },
];

export const matchScaffold = (rawInput: string): ScaffoldMatch => {
  const input = rawInput.trim();
  if (input.length === 0) return { kind: "none" };

  for (const rule of RULES) {
    if (rule.pattern.test(input)) return rule.result;
  }
  return { kind: "none" };
};
