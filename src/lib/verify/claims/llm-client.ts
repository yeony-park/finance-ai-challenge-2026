/**
 * claim 추출 LLM 클라이언트 경계 — 스파인 `llm/client.ts`와 같은 원칙.
 * 추출기는 이 인터페이스에만 의존한다: 테스트·CI·데모는 fake, 실키 운영은 AI SDK 어댑터.
 * **키·네트워크가 없어도 전체 파이프라인이 완주해야 한다.**
 *
 * 스파인의 `LlmClient`는 자유 텍스트(LlmDraft) 계약이라 구조화 출력을 담지 못한다.
 * 그래서 계약만 이 도메인에 맞게 좁히고(응답 = zod로 검증된 claim 목록),
 * fake-first·키 없으면 자동 폴백이라는 **행동 계약은 그대로 승계**한다.
 */
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

// ---- fake 클라이언트 ----

/**
 * fake는 모델이 아니라 **프롬프트 텍스트만 보고 도는 결정적 추출기**다.
 *
 * 왜 이렇게 만드는가
 * - 목적은 모델 품질 대리(代理)가 아니라 ① 키 없는 CI 완주 ② 교차검증 배선의 실동작 검증이다
 * - 그래서 규칙 파서와 **다른 경로**로 읽는다: 규칙 파서는 헤더로 찾은 *열 위치*로 읽고,
 *   fake는 프롬프트에 실린 셀의 *내용 모양*(9자리 숫자·날짜 형식·행정구역 표기)으로 읽는다.
 *   열 순서가 바뀌어도 같은 값이 나오지만, 값 모양이 무너지면 두 경로가 갈라진다.
 * - 값은 원문 표기 그대로 돌려준다 — 정규화는 규칙 파서와 동일한 zod 게이트가 담당한다.
 */
const NINE_DIGITS = /^\d{9}$/;
const DATE_LIKE = /^\d{4}[-.]\d{2}[-.]\d{2}$/;
const MONEY_LIKE = /^\d{1,3}(,\d{3})+$/;
const BREED_LIKE = /(한우|육우|젖소|한돈|흑돼지)/;
/** 행정구역 토큰 — 보관장소는 "강원도 ○○읍"처럼 시·군이 생략되기도 해 토큰 2개 이상으로 본다 */
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

    // fake도 실 클라이언트와 같은 계약 검증을 통과해야 한다
    return llmExtractionSchema.parse({ claims });
  },
});

/**
 * 키가 있으면 AI SDK 어댑터, 없으면 fake.
 * 키 우선순위: AI_GATEWAY_API_KEY(게이트웨이) → OPENAI_API_KEY(직결).
 * ANTHROPIC_API_KEY 단독은 어댑터가 붙을 경로가 없으므로 fake로 남는다(오배선 방지).
 */
export const resolveClaimExtractionClient =
  async (): Promise<ClaimExtractionClient> => {
    // `??`가 아니라 `||` — .env에 `AI_GATEWAY_API_KEY=`처럼 빈 값으로 남아 있으면
    // 빈 문자열은 nullish가 아니어서 OpenAI 키까지 도달하지 못한다
    const hasUsableKey = Boolean(
      process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY,
    );
    if (!hasUsableKey) return createFakeClaimExtractionClient();

    const { createAiSdkClaimExtractionClient } = await import("./llm-ai-sdk");
    return createAiSdkClaimExtractionClient();
  };
