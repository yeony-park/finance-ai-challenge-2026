import type { OfferingStatus, ParsedSearchQuery, RecordLifecycle, TrackStatus, Verdict } from "@/lib/art/types";

// Status phrases are matched as words, not arbitrary substrings. Without the
// boundary, a normal keyword such as "진행형" would become current status.
const wordStart = "(?<!\\S)";
const wordEnd = "(?=$|\\s|[은는이가을를와과에의만]|[,，.。!?])";
const currentStatusRules: ReadonlyArray<[RegExp, OfferingStatus]> = [
  [new RegExp(`${wordStart}청약\\s*예정(?:인|된)?${wordEnd}`, "gu"), "upcoming"],
  [new RegExp(`${wordStart}청약\\s*중(?:인)?${wordEnd}`, "gu"), "open"],
  [new RegExp(`${wordStart}운용\\s*중(?:인)?${wordEnd}`, "gu"), "operating"],
  [new RegExp(`${wordStart}상태\\s*미확인${wordEnd}`, "gu"), "unverified"],
  // Keep the short aliases after their longer phrases have been removed.
  [new RegExp(`${wordStart}예정(?:인|된)?${wordEnd}`, "gu"), "upcoming"],
  [new RegExp(`${wordStart}진행(?:\\s*중)?(?:인)?${wordEnd}`, "gu"), "open"],
];

const historicalStatusRules: ReadonlyArray<[RegExp, RecordLifecycle, TrackStatus?]> = [
  [new RegExp(`${wordStart}매각\\s*진행(?:\\s*중)?(?:인)?${wordEnd}`, "gu"), "exit_in_progress"],
  [new RegExp(`${wordStart}매각\\s*완료(?:된)?${wordEnd}`, "gu"), "sold", "sold"],
  [new RegExp(`${wordStart}반환(?:된)?${wordEnd}`, "gu"), "returned", "returned"],
  [new RegExp(`${wordStart}손실\\s*확인(?:된)?${wordEnd}`, "gu"), "loss_confirmed", "loss_confirmed"],
  [new RegExp(`${wordStart}청산\\s*완료(?:된)?${wordEnd}`, "gu"), "liquidated"],
];

const verdictMap: Record<string, Verdict> = { "조건부 해볼 만함": "conditional", "해볼 만함": "worth_considering", "주의": "caution", "위험": "danger" };
const knownWords = new Set([
  "최근", "거래", "거래량", "많", "많은", "꾸준한", "작가", "상품", "공모가", "유사", "작품", "보다", "비싼", "청산", "자주", "지연", "지연된", "플랫폼", "취득가", "차이", "차이가", "작은", "3년", "낙찰률", "높은", "회수", "위험", "큰", "매각", "진행", "완료", "반환", "손실", "청약", "예정", "운용", "상태", "미확인", "중",
]);

/**
 * Normalize only common Korean particles at a token boundary.
 *
 * This is intentionally conservative: removing the final "가" from "작가"
 * would damage a normal keyword, so a one-syllable stem is never shortened.
 */
export function normalizeCatalogKeyword(input: string): string {
  const compact = input.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const particles = ["으로", "에서", "부터", "까지", "에게", "한테", "처럼", "보다", "의", "은", "는", "이", "가", "을", "를", "와", "과", "에", "로", "도", "만"];
  // These words end in a syllable that is also a particle, but the syllable
  // is part of the noun (공모가, 취득가). Keep them intact.
  const lexicalEndings = new Set(["공모가", "취득가", "위험도"]);
  return compact
    .split(" ")
    .map((token) => {
      if (lexicalEndings.has(token) || token.endsWith("주의")) return token;
      for (const particle of particles) {
        if (!token.endsWith(particle) || token.length <= particle.length + 1) continue;
        return token.slice(0, -particle.length);
      }
      return token;
    })
    .filter(Boolean)
    .join(" ");
}

function applyRules(input: string, rules: ReadonlyArray<[RegExp, string, (value: string) => void]>) {
  let remaining = input;
  for (const [pattern, value, onMatch] of rules) {
    pattern.lastIndex = 0;
    if (pattern.test(remaining)) onMatch(value);
    pattern.lastIndex = 0;
    remaining = remaining.replace(pattern, " ");
  }
  return remaining;
}

/** Parse the deterministic demo search language used when AI mode is off. */
export function parseDemoSearchQuery(input: string): ParsedSearchQuery {
  const query = input.normalize("NFKC").trim();
  const offeringStatus: OfferingStatus[] = [];
  const lifecycle: RecordLifecycle[] = [];
  const status: TrackStatus[] = [];
  let residue = query;

  // Historical phrases run first. This prevents "매각 진행" from also
  // matching the broad "진행" alias, which would incorrectly force current scope.
  residue = applyRules(residue, historicalStatusRules.map(([pattern, value, trackStatus]) => [pattern, value, (matched) => {
    lifecycle.push(matched as RecordLifecycle);
    if (trackStatus) status.push(trackStatus);
    if (matched === "exit_in_progress" || matched === "liquidated") offeringStatus.push(matched as OfferingStatus);
  }]));
  residue = applyRules(residue, currentStatusRules.map(([pattern, value]) => [pattern, value, (matched) => offeringStatus.push(matched as OfferingStatus)]));

  const verdict: Verdict[] = [];
  for (const [label, value] of Object.entries(verdictMap)) {
    // A label must start at a token boundary. This keeps ordinary keywords
    // such as "작가주의" from being reduced to the caution verdict.
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`${wordStart}${escaped}(?:[은는이가을를와과에의만]|한|할)?(?=$|\\s|[,，.。!?])`, "gu");
    pattern.lastIndex = 0;
    if (pattern.test(residue)) verdict.push(value);
    pattern.lastIndex = 0;
    residue = residue.replace(pattern, " ");
  }

  if (/최근.*거래.*꾸준|거래.*많/.test(query)) {
    // This is an analytical current-catalog condition, not a literal phrase.
    // The caller may combine it with a historical status; URL construction
    // resolves that explicit historical intent before choosing scope.
  }
  const parsed: ParsedSearchQuery = {};
  const uniqueOfferingStatus = [...new Set(offeringStatus)];
  const uniqueLifecycle = [...new Set(lifecycle)];
  const uniqueStatus = [...new Set(status)];
  if (uniqueOfferingStatus.length) parsed.offeringStatus = uniqueOfferingStatus;
  if (uniqueLifecycle.length) parsed.lifecycle = uniqueLifecycle;
  if (uniqueStatus.length) parsed.status = uniqueStatus;
  if (verdict.length) parsed.verdict = [...new Set(verdict)];
  if (/최근.*거래.*꾸준|거래.*많/.test(query)) { parsed.auctionVolumeMin = 20; parsed.sort = "auction_volume_desc"; }
  if (/낙찰률.*높/.test(query)) { parsed.sellThroughRateMin = 70; parsed.sort = "auction_volume_desc"; }
  if (/유사 작품보다 비싼|공모가.*비싼/.test(query)) { parsed.premiumMin = 15; parsed.sort = "premium_desc"; }
  if (/취득가.*차이.*작/.test(query)) parsed.premiumMax = 15;
  if (/청산.*지연|지연된 플랫폼/.test(query)) { parsed.delayedExitOnly = true; parsed.sort = "delay_desc"; }
  if (/회수 위험.*큰/.test(query)) { parsed.verdict = ["caution", "danger"]; parsed.sort = "verdict"; }

  const normalizedResidue = normalizeCatalogKeyword(residue);
  const residueWords = normalizedResidue
    .split(/\s+/)
    .filter((word) => word && !knownWords.has(word));
  if (residueWords.length) parsed.keyword = residueWords.join(" ");
  return parsed;
}

export function searchConditionEntries(parsed: ParsedSearchQuery) {
  const entries: Array<{ key: keyof ParsedSearchQuery; label: string }> = [];
  parsed.offeringStatus?.forEach((status) => entries.push({ key: "offeringStatus", label: { upcoming: "청약 예정", open: "청약 중", operating: "운용 중", exit_in_progress: "매각 진행", liquidated: "청산 완료", unverified: "상태 미확인" }[status] }));
  parsed.lifecycle?.forEach((value) => entries.push({ key: "lifecycle", label: { current: "현재", offering: "청약", operating: "운용 중", exit_in_progress: "매각 진행", sold: "매각 완료", liquidated: "청산 완료", returned: "반환", loss_confirmed: "손실 확인", unknown: "상태 미확인" }[value] }));
  parsed.status?.forEach((value) => entries.push({ key: "status", label: { offering: "청약", operating: "운용 중", exit_in_progress: "매각 진행", sold: "매각 완료", returned: "반환", liquidated: "청산 완료", delayed: "지연 청산", unsold: "미매각", loss_confirmed: "손실 확인", unknown: "상태 미확인" }[value] }));
  parsed.verdict?.forEach((value) => entries.push({ key: "verdict", label: { worth_considering: "해볼 만함", conditional: "조건부 해볼 만함", caution: "주의", danger: "위험" }[value] }));
  if (parsed.auctionVolumeMin) entries.push({ key: "auctionVolumeMin", label: `최근 3년 거래 ${parsed.auctionVolumeMin}건 이상` });
  if (parsed.sellThroughRateMin) entries.push({ key: "sellThroughRateMin", label: `낙찰률 ${parsed.sellThroughRateMin}% 이상` });
  if (parsed.premiumMin != null) entries.push({ key: "premiumMin", label: `공모가 차이율 ${parsed.premiumMin}% 이상` });
  if (parsed.premiumMax != null) entries.push({ key: "premiumMax", label: `공모가 차이율 ${parsed.premiumMax}% 이하` });
  if (parsed.delayedExitOnly) entries.push({ key: "delayedExitOnly", label: "청산 지연 이력" });
  if (parsed.keyword) entries.push({ key: "keyword", label: `키워드: ${parsed.keyword}` });
  return entries;
}
