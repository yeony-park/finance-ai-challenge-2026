import type {
  SyntheticCatalogFilters,
  SyntheticOfferingStatus,
  SyntheticRecordLifecycle,
  SyntheticTrackStatus,
} from "./types";

export type SyntheticNaturalSearchIntent = {
  keyword: string;
  currentStatus: SyntheticOfferingStatus[];
  lifecycle: SyntheticRecordLifecycle[];
  status: SyntheticTrackStatus[];
};

const wordStart = "(?<!\\S)";
const wordEnd = "(?=$|\\s|[은는이가을를와과에의만]|[,，.。!?])";

const currentStatusRules: ReadonlyArray<[RegExp, SyntheticOfferingStatus]> = [
  [new RegExp(`${wordStart}청약\\s*예정(?:인|된)?${wordEnd}`, "gu"), "upcoming"],
  [new RegExp(`${wordStart}청약\\s*중(?:인)?${wordEnd}`, "gu"), "open"],
  [new RegExp(`${wordStart}운용\\s*중(?:인)?${wordEnd}`, "gu"), "operating"],
  [new RegExp(`${wordStart}상태\\s*미확인${wordEnd}`, "gu"), "unverified"],
];

const historyStatusRules: ReadonlyArray<
  [RegExp, SyntheticRecordLifecycle, SyntheticTrackStatus?]
> = [
  [new RegExp(`${wordStart}매각\\s*진행(?:\\s*중)?(?:인)?${wordEnd}`, "gu"), "exit_in_progress", "exit_in_progress"],
  [new RegExp(`${wordStart}매각\\s*완료(?:된)?${wordEnd}`, "gu"), "sold", "sold"],
  [new RegExp(`${wordStart}반환(?:된)?${wordEnd}`, "gu"), "returned", "returned"],
  [new RegExp(`${wordStart}손실\\s*확인(?:된)?${wordEnd}`, "gu"), "loss_confirmed", "loss_confirmed"],
  [new RegExp(`${wordStart}지연\\s*청산(?:된)?${wordEnd}`, "gu"), "liquidated", "delayed"],
  [new RegExp(`${wordStart}청산\\s*완료(?:된)?${wordEnd}`, "gu"), "liquidated", "liquidated"],
];

export function normalizeSyntheticCatalogKeyword(input: string): string {
  const compact = input.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!compact) return "";

  const particles = ["으로", "에서", "부터", "까지", "에게", "한테", "처럼", "보다", "의", "은", "는", "이", "가", "을", "를", "와", "과", "에", "로", "도", "만"];
  const lexicalEndings = new Set(["공모가", "취득가", "작가"]);

  return compact
    .split(" ")
    .map((token) => {
      if (lexicalEndings.has(token)) return token;
      return particles.reduce((value, particle) =>
        value.endsWith(particle) && value.length > particle.length + 1
          ? value.slice(0, -particle.length)
          : value,
      token);
    })
    .filter(Boolean)
    .join(" ");
}

function takeMatches<T extends string>(
  input: string,
  rules: ReadonlyArray<[RegExp, T]>,
): { remaining: string; values: T[] } {
  let remaining = input;
  const values: T[] = [];

  for (const [pattern, value] of rules) {
    pattern.lastIndex = 0;
    if (pattern.test(remaining)) values.push(value);
    pattern.lastIndex = 0;
    remaining = remaining.replace(pattern, " ");
  }

  return { remaining, values: [...new Set(values)] };
}

export function parseSyntheticNaturalQuery(input: string): SyntheticNaturalSearchIntent {
  let remaining = input.normalize("NFKC").trim();
  const lifecycle: SyntheticRecordLifecycle[] = [];
  const status: SyntheticTrackStatus[] = [];

  for (const [pattern, lifecycleValue, statusValue] of historyStatusRules) {
    pattern.lastIndex = 0;
    if (pattern.test(remaining)) {
      lifecycle.push(lifecycleValue);
      if (statusValue) status.push(statusValue);
    }
    pattern.lastIndex = 0;
    remaining = remaining.replace(pattern, " ");
  }

  const current = takeMatches(remaining, currentStatusRules);
  const genericCatalogWords = new Set(["상품", "작품", "기록", "이력"]);
  const keyword = normalizeSyntheticCatalogKeyword(current.remaining)
    .split(/\s+/)
    .filter((word) => word && !genericCatalogWords.has(word))
    .join(" ");
  return {
    keyword,
    currentStatus: current.values,
    lifecycle: [...new Set(lifecycle)],
    status: [...new Set(status)],
  };
}

const currentLabels: Record<SyntheticOfferingStatus, string> = {
  upcoming: "청약 예정",
  open: "청약 중",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  liquidated: "청산 완료",
  unverified: "상태 미확인",
};

const lifecycleLabels: Record<SyntheticRecordLifecycle, string> = {
  current: "현재",
  offering: "청약",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  sold: "매각 완료",
  liquidated: "청산 완료",
  returned: "반환",
  loss_confirmed: "손실 확인",
  unknown: "상태 미확인",
};

const statusLabels: Record<SyntheticTrackStatus, string> = {
  offering: "청약",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  sold: "매각 완료",
  returned: "반환",
  liquidated: "청산 완료",
  delayed: "지연 청산",
  unsold: "미매각",
  loss_confirmed: "손실 확인",
  unknown: "상태 미확인",
};

export function syntheticSearchConditionEntries(
  filters: Pick<SyntheticCatalogFilters, "keyword" | "currentStatus" | "lifecycle" | "status">,
): Array<{ key: string; label: string }> {
  return [
    ...filters.currentStatus.map((value) => ({ key: `current-${value}`, label: currentLabels[value] })),
    ...filters.lifecycle.map((value) => ({ key: `lifecycle-${value}`, label: lifecycleLabels[value] })),
    ...filters.status.map((value) => ({ key: `status-${value}`, label: statusLabels[value] })),
    ...(filters.keyword ? [{ key: "keyword", label: `키워드: ${filters.keyword}` }] : []),
  ];
}
