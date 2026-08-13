import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { extractClaimsWithLlm } from "../claims/extract-llm";
import { extractClaims, selectHeadTable } from "../claims/extract-rules";
import { runExtraction } from "../claims/extract";
import {
  createFakeClaimExtractionClient,
  type ClaimExtractionClient,
} from "../claims/llm-client";
import { buildExtractionPrompt, parseRowLine } from "../claims/llm-prompt";
import type { DocumentRef } from "../types";
import { hasLocalFile, rawXmlPath, skipReason } from "./local-data";

const DOCUMENT: DocumentRef = {
  offerId: "livestock-9",
  rcpNo: "20260806000159",
  submittedOn: "2026-08-06",
};

const XML = `<?xml version="1.0" encoding="utf-8"?>
<DOCUMENT>
<PART><TITLE>제1부 모집 또는 매출에 관한 사항</TITLE>
<SECTION-1><TITLE>II. 증권의 주요 권리내용</TITLE>
<P USERMARK="B">8. 기초자산 취득에 관한 사항</P>
<TABLE><TBODY>
<TR><TD>구분</TD><TD>고유명칭</TD><TD>이력번호</TD><TD>취득시기</TD><TD>취득원가(원)</TD><TD>보관장소</TD></TR>
<TR><TD>검증 1호</TD><TD>한우 송아지</TD><TD>212786152</TD><TD>2026-07-14</TD><TD>4,574,865</TD><TD ROWSPAN="2">강원도 검증군 가상읍</TD></TR>
<TR><TD>검증 2호</TD><TD>한우 송아지</TD><TD>214838454</TD><TD>2026-07-14</TD><TD>4,654,865</TD></TR>
<TR><TD>합계</TD><TD>9,229,730</TD></TR>
</TBODY></TABLE>
</SECTION-1></PART>
</DOCUMENT>`;

const selection = () => {
  const found = selectHeadTable(XML, DOCUMENT);
  if (!found) throw new Error("테스트 픽스처에서 개체 명세표를 찾지 못했습니다");
  return found;
};

const stubClient = (
  extract: ClaimExtractionClient["extract"],
): ClaimExtractionClient => ({ name: "stub", extract });

describe("추출 프롬프트 — 문서 좌표 보존", () => {
  test("항목 경로·표 이름·원문 오프셋·행 번호가 모두 실린다", () => {
    // Arrange
    const head = selection();

    // Act
    const prompt = buildExtractionPrompt(DOCUMENT, head, [
      {
        cells: ["검증 1호", "한우 송아지", "212786152"],
        row: 1,
        subject: "검증 1호",
        traceNoRaw: "212786152",
      },
    ]);

    // Assert
    expect(prompt.user).toContain("8. 기초자산 취득에 관한 사항");
    expect(prompt.user).toContain("기초자산 개체 명세표");
    expect(prompt.user).toContain(`오프셋 ${head.source.charOffset}`);
    expect(prompt.user).toContain("행 1 | 검증 1호");
    expect(prompt.system).toContain("추측 금지");
  });

  test("직렬화한 행은 되읽을 수 있다 (fake 클라이언트의 입력 계약)", () => {
    expect(parseRowLine("행 12 | 가 | 나 | 다")).toEqual({
      row: 12,
      cells: ["가", "나", "다"],
    });
    expect(parseRowLine("이건 행이 아니다")).toBeUndefined();
  });
});

describe("fake 추출기 — 키 없이 결정적으로 완주한다", () => {
  test("셀 내용 모양으로 읽어 규칙 파서와 같은 값을 낸다", async () => {
    // Act
    const result = await extractClaimsWithLlm(
      selection(),
      DOCUMENT,
      createFakeClaimExtractionClient(),
    );
    const valueOf = (kind: string, subject: string) =>
      result.claims.find((c) => c.kind === kind && c.subject === subject)?.value;

    // Assert
    expect(result.clientName).toBe("fake");
    expect(valueOf("livestock_trace_no", "검증 1호")).toBe("212786152");
    expect(valueOf("livestock_breed", "검증 1호")).toBe("한우");
    expect(valueOf("acquisition_date", "검증 1호")).toBe("2026-07-14");
    expect(valueOf("acquisition_price", "검증 1호")).toBe("4574865");
    expect(valueOf("custody_location", "검증 2호")).toBe("강원도 검증군 가상읍");
  });

  test("두 번 돌려도 같은 결과다", async () => {
    const head = selection();
    const client = createFakeClaimExtractionClient();
    const first = await extractClaimsWithLlm(head, DOCUMENT, client);
    const second = await extractClaimsWithLlm(head, DOCUMENT, client);

    expect(JSON.stringify(second.claims)).toBe(JSON.stringify(first.claims));
  });

  test("추출값에 규칙 파서와 같은 문서 좌표가 붙는다", async () => {
    const result = await extractClaimsWithLlm(
      selection(),
      DOCUMENT,
      createFakeClaimExtractionClient(),
    );

    expect(result.claims[0].location.section).toBe(
      "8. 기초자산 취득에 관한 사항",
    );
    expect(result.claims[0].location.row).toBeGreaterThan(0);
    expect(result.claims[0].extractedBy).toBe("llm");
  });
});

describe("LLM 추출 방어선", () => {
  test("표에 없는 행 번호를 가리키는 추출값은 채택하지 않는다", async () => {
    // Arrange — 존재하지 않는 99행을 지어낸 응답
    const client = stubClient(async () => ({
      claims: [
        {
          row: 99,
          subject: "유령 3호",
          kind: "livestock_trace_no" as const,
          value: "999999999",
        },
      ],
    }));

    // Act
    const result = await extractClaimsWithLlm(selection(), DOCUMENT, client);

    // Assert
    expect(result.claims).toHaveLength(0);
    expect(result.notes.join(" ")).toContain("문서 좌표 미확인");
  });

  test("호출이 실패해도 파이프라인은 멈추지 않고 사유가 남는다", async () => {
    const client = stubClient(async () => {
      throw new Error("gateway 503");
    });

    const result = await extractClaimsWithLlm(selection(), DOCUMENT, client);

    expect(result.failed).toBe(true);
    expect(result.claims).toHaveLength(0);
    expect(result.notes.join(" ")).toContain("gateway 503");
  });

  test("LLM 실패는 규칙 단독 채택으로 흘러 claim을 잃지 않는다", async () => {
    // Act
    const run = await runExtraction(XML, DOCUMENT, {
      mode: "cross-check",
      extractor: stubClient(async () => {
        throw new Error("gateway 503");
      }),
    });
    const rulesOnly = extractClaims(XML, DOCUMENT);

    // Assert
    expect(run.claims).toHaveLength(rulesOnly.claims.length);
    expect(run.crossCheck?.rulesOnly).toBe(rulesOnly.claims.length);
    expect(run.crossCheck?.conflict).toBe(0);
  });

  test("모델이 값을 뒤집으면 그 필드만 확인 불가로 강등된다", async () => {
    // Arrange — 취득원가만 다른 값을 말하는 모델
    const client = stubClient(async () => ({
      claims: [
        {
          row: 1,
          subject: "검증 1호",
          kind: "acquisition_price" as const,
          value: "9,999,999",
        },
      ],
    }));

    // Act
    const run = await runExtraction(XML, DOCUMENT, {
      mode: "cross-check",
      extractor: client,
    });
    const price = run.claims.find(
      (c) => c.kind === "acquisition_price" && c.subject === "검증 1호",
    );
    const trace = run.claims.find(
      (c) => c.kind === "livestock_trace_no" && c.subject === "검증 1호",
    );

    // Assert
    expect(price?.verifiability).toBe("cross_check_conflict");
    expect(trace?.verifiability).toBe("verifiable");
    expect(run.crossCheck?.conflict).toBe(1);
  });
});

const RAW_XML_PATH = rawXmlPath(DOCUMENT.rcpNo);
const hasRawXml = hasLocalFile(RAW_XML_PATH);

describe.skipIf(!hasRawXml)(
  `원문 회귀 — fake 교차검증이 규칙 추출을 훼손하지 않는다 ${hasRawXml ? "" : skipReason(RAW_XML_PATH)}`,
  () => {
    test("37두 전 필드가 양쪽 일치이거나 규칙 단독이며, 불일치 강등은 0건이다", async () => {
      // Arrange
      const xml = readFileSync(RAW_XML_PATH, "utf8");

      // Act
      const run = await runExtraction(xml, DOCUMENT, { mode: "cross-check" });
      const rulesOnly = extractClaims(xml, DOCUMENT);

      // Assert
      expect(run.crossCheck?.conflict).toBe(0);
      expect(run.crossCheck?.llmOnly).toBe(0);
      expect(run.claims).toHaveLength(rulesOnly.claims.length);
      // 성별은 명세표 밖(취득가액 표)에서 읽으므로 규칙 단독, 나머지 5종은 양쪽 일치
      expect(run.crossCheck?.agreed).toBe(37 * 5);
      expect(run.crossCheck?.rulesOnly).toBe(37);
    });

    test("채택 값은 rules-only 모드와 한 글자도 다르지 않다", async () => {
      const xml = readFileSync(RAW_XML_PATH, "utf8");
      const crossCheck = await runExtraction(xml, DOCUMENT, {
        mode: "cross-check",
      });
      const rulesOnly = await runExtraction(xml, DOCUMENT, {
        mode: "rules-only",
      });

      // 출처 태그는 교차검증 모드에만 붙으므로 비교에서 제외한다
      const strip = (claims: typeof crossCheck.claims) =>
        claims.map((claim) => ({ ...claim, extractedBy: undefined }));

      expect(JSON.stringify(strip(crossCheck.claims))).toBe(
        JSON.stringify(strip(rulesOnly.claims)),
      );
    });
  },
);
