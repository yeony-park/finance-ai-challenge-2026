import { parseRowLine } from "./llm-prompt";
import {
  llmExtractionSchema,
  type LlmClaimDraft,
  type LlmExtractionPayload,
} from "./llm-schema";

export interface ClaimExtractionClient {
  readonly name: string;
  extract(input: {
    readonly system: string;
    readonly user: string;
  }): Promise<LlmExtractionPayload>;
}

const NINE_DIGITS = /^\d{9}$/;
const DATE_LIKE = /^\d{4}[-.]\d{2}[-.]\d{2}$/;
const MONEY_LIKE = /^\d{1,3}(,\d{3})+$/;
const BREED_LIKE = /(한우|육우|젖소|한돈|흑돼지)/;
const REGION_TOKEN = /[가-힣]{2,}[도시군구읍면동리]/g;
const MIN_REGION_TOKENS = 2;
const SEX_LIKE: readonly (readonly [RegExp, string])[] = [
  [/숫소|숫송아지|수송아지/, "수"],
  [/암소|암송아지/, "암"],
  [/거세/, "거세"],
];

const SUBJECT_LIKE = /\d+\s*호$/;

const firstCell = (
  cells: readonly string[],
  test: (cell: string) => boolean,
): string | undefined => cells.find((cell) => test(cell.trim()));

const looksLikeRegion = (cell: string): boolean =>
  !BREED_LIKE.test(cell) &&
  (cell.match(REGION_TOKEN) ?? []).length >= MIN_REGION_TOKENS;

const readRow = (
  row: number,
  cells: readonly string[],
): readonly LlmClaimDraft[] => {
  const subject = firstCell(cells, (cell) => SUBJECT_LIKE.test(cell))?.trim();
  if (!subject) return [];

  const rest = cells.filter((cell) => cell.trim() !== subject);
  const draft = (
    kind: LlmClaimDraft["kind"],
    value: string | undefined,
  ): readonly LlmClaimDraft[] =>
    value === undefined ? [] : [{ row, subject, kind, value }];

  const rowText = cells.join(" ");
  const sex = SEX_LIKE.find(([pattern]) => pattern.test(rowText))?.[1];

  return [
    ...draft(
      "livestock_trace_no",
      firstCell(rest, (cell) => NINE_DIGITS.test(cell.replace(/\s/g, ""))),
    ),
    ...draft(
      "livestock_breed",
      firstCell(rest, (cell) => BREED_LIKE.test(cell)),
    ),
    ...draft("livestock_sex", sex),
    ...draft(
      "acquisition_date",
      firstCell(rest, (cell) => DATE_LIKE.test(cell)),
    ),
    ...draft(
      "acquisition_price",
      firstCell(rest, (cell) => MONEY_LIKE.test(cell.replace(/\s/g, ""))),
    ),
    ...draft("custody_location", firstCell(rest, looksLikeRegion)),
  ];
};

export const createFakeClaimExtractionClient = (): ClaimExtractionClient => ({
  name: "fake",
  async extract({ user }): Promise<LlmExtractionPayload> {
    const claims = user
      .split("\n")
      .map(parseRowLine)
      .filter((parsed) => parsed !== undefined)
      .flatMap(({ row, cells }) => readRow(row, cells));

    return llmExtractionSchema.parse({ claims });
  },
});

export const resolveClaimExtractionClient =
  async (): Promise<ClaimExtractionClient> => {
    const hasUsableKey = Boolean(
      process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY,
    );
    if (!hasUsableKey) return createFakeClaimExtractionClient();

    const { createAiSdkClaimExtractionClient } = await import("./llm-ai-sdk");
    return createAiSdkClaimExtractionClient();
  };
