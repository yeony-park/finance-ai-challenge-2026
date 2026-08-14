import { narrativeDraftSchema, type NarrativeDraft } from "./schema";
import type { NarrativeDigest } from "./source";

export interface NarrativeClient {
  readonly name: string;
  readonly generator: "llm" | "fake";
  generate(input: {
    readonly system: string;
    readonly user: string;
    readonly digest: NarrativeDigest;
  }): Promise<NarrativeDraft>;
}

const NOT_FOUND = "공개 자료에서 확인되지 않음";

const assetWord = (digest: NarrativeDigest): string =>
  digest.assetKind === "real-estate" ? "자산" : "개체";

const unitWord = (digest: NarrativeDigest): string =>
  digest.assetKind === "real-estate" ? "건" : "두";

const HANGUL_BASE = 0xac00;
const HANGUL_JONGSUNG_COUNT = 28;

const hasFinalConsonant = (word: string): boolean => {
  const last = word.at(-1);
  if (last === undefined) return false;
  const code = last.charCodeAt(0) - HANGUL_BASE;
  if (code < 0) return false;
  return code % HANGUL_JONGSUNG_COUNT !== 0;
};

const josa = (word: string, withFinal: string, withoutFinal: string): string =>
  `${word}${hasFinalConsonant(word) ? withFinal : withoutFinal}`;

const realityDraft = (digest: NarrativeDigest, level: "easy" | "pro") => {
  const subject = digest.reality.subjectLevel;
  const item = digest.reality.itemLevel;
  const asset = assetWord(digest);
  const unit = unitWord(digest);
  const unmatched = subject["원장 불일치"] + subject["대조 불가"];

  if (level === "easy") {
    return [
      {
        tag: "fact" as const,
        text: `공시된 ${asset} ${subject.합계}${unit} 가운데 ${josa(`${subject.일치}${unit}`, "이", "가")} 공적 원장에서 그대로 확인됩니다.`,
      },
      {
        tag: "fact" as const,
        text:
          unmatched > 0
            ? `나머지 ${josa(`${unmatched}${unit}`, "은", "는")} 원장 불일치 또는 대조 불가로 남아 있습니다.`
            : `원장 불일치나 대조 불가로 남은 ${asset}는 없습니다.`,
      },
    ];
  }

  return [
    {
      tag: "calc" as const,
      text: `항목 판정 ${item.합계}건 — 일치 ${item.일치} · 원장 불일치 ${item["원장 불일치"]} · 대조 불가 ${item["대조 불가"]}.`,
    },
    {
      tag: "fact" as const,
      text:
        digest.reality.flagged[0] === undefined
          ? `일치가 아닌 항목은 없습니다.`
          : `${digest.reality.flagged[0].subject} ${digest.reality.flagged[0].field}는 ${digest.reality.flagged[0].verdictLabel}로 남았습니다.`,
    },
  ];
};

const placedCountOf = (price: NarrativeDigest["price"]): number =>
  price.kind === "livestock" ? price.placedCount : price.positions.length;

const priceDraft = (digest: NarrativeDigest, level: "easy" | "pro") => {
  const { price } = digest;
  const placed = placedCountOf(price);

  if (level === "easy") {
    return [
      {
        tag: "issuer_claim" as const,
        text:
          placed > 0
            ? `발행사가 공시한 금액 ${placed}건은 같은 조건의 시장 데이터 위에 위치로 표시했습니다.`
            : `발행사가 공시한 금액은 견줄 시장 데이터를 찾지 못해 위치를 표시하지 못했습니다.`,
      },
      {
        tag: "ai" as const,
        text: `이 표시는 금액이 시장의 어디쯤에 놓이는지를 보여 줄 뿐, 값이 알맞은지에 대한 판단이 아닙니다.`,
      },
    ];
  }

  return [
    {
      tag: "calc" as const,
      text: `가격 위치 제시 ${placed}건 · 위치 미제시 ${price.unplacedCount}건.`,
    },
    {
      tag: "fact" as const,
      text:
        price.kind === "livestock" && price.reference?.thinSample === true
          ? `참조 모수가 얇은 구간이 있어 평균값이 소수 표본에 좌우될 수 있습니다.`
          : `참조 모수와 비교군 건수는 각 항목의 근거 카드에 함께 적혀 있습니다.`,
    },
  ];
};

const historyDraft = (digest: NarrativeDigest, level: "easy" | "pro") => {
  const { history } = digest;

  if (level === "easy") {
    return [
      {
        tag: "fact" as const,
        text: `${history.documentBasis}을 대조했고, 지금까지 만들어진 리포트 ${history.storedReportVersions}건이 보관돼 있습니다.`,
      },
      { tag: "fact" as const, text: history.amendmentWatch },
    ];
  }

  return [
    {
      tag: "fact" as const,
      text: `대조 대상은 ${history.documentBasis}이며 대조 실행 시각은 ${digest.reportGeneratedAt}입니다.`,
    },
    {
      tag: "fact" as const,
      text:
        history.engineNotes[0] === undefined
          ? `엔진 실행 기록은 ${NOT_FOUND}입니다.`
          : history.engineNotes[0],
    },
  ];
};

const overallDraft = (digest: NarrativeDigest, level: "easy" | "pro") => {
  const subject = digest.reality.subjectLevel;
  const item = digest.reality.itemLevel;
  const asset = assetWord(digest);
  const unit = unitWord(digest);

  if (level === "easy") {
    return [
      {
        tag: "calc" as const,
        text: `${asset} ${subject.합계}${unit} 중 ${josa(`${subject.일치}${unit}`, "이", "가")} 원장과 일치하고, ${josa(`${subject["원장 불일치"]}${unit}`, "은", "는")} 원장 불일치입니다.`,
      },
    ];
  }

  return [
    {
      tag: "calc" as const,
      text: `${asset} 단위 ${subject.합계}${unit}(일치 ${subject.일치} · 원장 불일치 ${subject["원장 불일치"]} · 대조 불가 ${subject["대조 불가"]}), 항목 단위 ${item.합계}건 기준 집계입니다.`,
    },
  ];
};

const CLOSING = {
  easy: "원장 불일치는 값이 다르다는 표시, 대조 불가는 자료가 없다는 표시이며, 그 자체로 부정적인 판정을 뜻하지 않습니다.",
  pro: "세 층위는 서로 다른 질문에 답하며, 가격 위치는 판정이 아니라 위치 표시로만 읽어야 합니다.",
} as const;

const levelDraft = (digest: NarrativeDigest, level: "easy" | "pro") => ({
  reality: realityDraft(digest, level),
  price: priceDraft(digest, level),
  history: historyDraft(digest, level),
  overall: overallDraft(digest, level),
  overallClosing: CLOSING[level],
});

export const createFakeNarrativeClient = (): NarrativeClient => ({
  name: "fake",
  generator: "fake",
  async generate({ digest }): Promise<NarrativeDraft> {
    return narrativeDraftSchema.parse({
      easy: levelDraft(digest, "easy"),
      pro: levelDraft(digest, "pro"),
    });
  },
});

export const resolveNarrativeClient = async (): Promise<NarrativeClient> => {
  const hasUsableKey = Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY,
  );
  if (!hasUsableKey) return createFakeNarrativeClient();

  const { createAiSdkNarrativeClient } = await import("./ai-sdk-client");
  return createAiSdkNarrativeClient();
};
