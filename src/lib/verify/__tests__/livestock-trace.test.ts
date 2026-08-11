import { describe, expect, test } from "vitest";
import {
  createEkapeTraceAdapter,
  normalizeTraceResponse,
  toTraceNo12,
  toTraceNo9,
} from "../adapters/livestock-trace";
import {
  createFakeTraceAdapter,
  parseTraceSnapshot,
} from "../adapters/livestock-trace-fake";
import { hasLocalFile, SNAPSHOT_PATH, skipReason } from "./local-data";

describe("이력번호 정규화", () => {
  test("신고서 9자리에 002 프리픽스를 붙여 12자리로 만든다", () => {
    expect(toTraceNo12("212786152")).toBe("002212786152");
  });

  test("이미 12자리면 그대로 둔다", () => {
    expect(toTraceNo12("002212786152")).toBe("002212786152");
  });

  test("응답 15자리(410+12)에서 국가코드를 떼어낸다", () => {
    expect(toTraceNo12("410002212786152")).toBe("002212786152");
    expect(toTraceNo9("410002212786152")).toBe("212786152");
  });

  test("구분자가 섞여 있어도 숫자만 남겨 처리한다", () => {
    expect(toTraceNo12("002-212786152")).toBe("002212786152");
  });

  test("알 수 없는 길이는 조용히 넘기지 않고 예외를 던진다", () => {
    expect(() => toTraceNo12("12345")).toThrow(/이력번호 형식/);
  });
});

const TRACE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<response><header><resultCode>00</resultCode></header><body><items>
<item><infoType>2</infoType><regYmd>20260730</regYmd><regType>양수</regType><farmNo>485464</farmNo><farmerNm>김검증</farmerNm><farmAddr>강원특별자치도 검증군 가상읍 가상로90번길</farmAddr></item>
<item><infoType>1</infoType><cattleNo>410002212786152</cattleNo><birthYmd>20251211</birthYmd><lsTypeNm>한우</lsTypeNm><sexNm>수</sexNm><farmNo>485464</farmNo></item>
<item><infoType>2</infoType><regYmd>20251212</regYmd><regType>전산등록</regType><farmNo>131689</farmNo><farmerNm>이합성</farmerNm><farmAddr>충청북도 검증시 가상대로42안길</farmAddr></item>
<item><infoType>5</infoType><injectionYmd>20260507</injectionYmd><vaccineorder>2차</vaccineorder></item>
<item><infoType>7</infoType><inspectDt>20260629</inspectDt><inspectYn>음성</inspectYn></item>
</items></body></response>`;

const EMPTY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<response><header><resultCode>00</resultCode></header><body><items/></body></response>`;

describe("실 API 응답 정규화", () => {
  test("infoType 혼합 배열을 개체 레코드로 정규화한다", () => {
    // Act
    const record = normalizeTraceResponse(
      TRACE_XML,
      "212786152",
      "2026-08-12T00:00:00.000Z",
    );

    // Assert
    expect(record.exists).toBe(true);
    expect(record.traceNo12).toBe("002212786152");
    expect(record.breedName).toBe("한우");
    expect(record.sexName).toBe("수");
    expect(record.vaccinationCount).toBe(1);
    expect(record.brucellosisResult).toBe("음성");
    expect(record.slaughtered).toBe(false);
  });

  test("사육지 이력은 regYmd 순으로 정렬되고 마지막이 현 사육지다", () => {
    const record = normalizeTraceResponse(
      TRACE_XML,
      "212786152",
      "2026-08-12T00:00:00.000Z",
    );

    expect(record.farmHistory.map((f) => f.regYmd)).toEqual([
      "20251212",
      "20260730",
    ]);
    expect(record.currentFarm?.farmerName).toBe("김검증");
  });

  test("응답 구조가 어긋나면 '개체 없음'으로 삼키지 않고 실패한다", () => {
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg></cmmMsgHeader></OpenAPI_ServiceResponse>`;

    expect(() =>
      normalizeTraceResponse(errorXml, "212786152", "2026-08-12T00:00:00.000Z"),
    ).toThrow(/응답 형식/);
  });

  test("빈 items는 resultCode와 무관하게 미존재로 판정한다", () => {
    const record = normalizeTraceResponse(
      EMPTY_XML,
      "999999999",
      "2026-08-12T00:00:00.000Z",
    );

    expect(record.exists).toBe(false);
    expect(record.farmHistory).toEqual([]);
  });

  test("실 어댑터는 12자리로 변환한 traceNo로 호출한다", async () => {
    // Arrange
    const calls: string[] = [];
    const adapter = createEkapeTraceAdapter({
      serviceKey: "test-key",
      fetchImpl: (async (url: string) => {
        calls.push(String(url));
        return new Response(TRACE_XML, { status: 200 });
      }) as unknown as typeof fetch,
    });

    // Act
    await adapter.lookup("212786152");

    // Assert
    expect(calls[0]).toContain("traceNo=002212786152");
    expect(calls[0]).toContain("serviceKey=test-key");
  });
});

describe.skipIf(!hasLocalFile(SNAPSHOT_PATH))(
  `fake 어댑터 — 실측 스냅샷 재생 ${hasLocalFile(SNAPSHOT_PATH) ? "" : skipReason(SNAPSHOT_PATH)}`,
  () => {
    // 스냅샷의 실제 지명·성명은 테스트에 박지 않는다 — 구조와 관계만 확인한다
    test("1번 개체는 강원 지역 사육지로 확인된다", async () => {
      const adapter = await createFakeTraceAdapter();
      const record = await adapter.lookup("212786152");

      expect(adapter.name).toBe("fake");
      expect(record.exists).toBe(true);
      expect(record.breedName).toBe("한우");
      expect(record.sexName).toBe("수");
      expect(record.currentFarm?.farmerName.length).toBeGreaterThan(0);
      expect(record.currentFarm?.farmAddress).toMatch(/^강원/);
    });

    test("24번 개체는 현 사육지가 다른 광역(경북)으로 남아 있다", async () => {
      const adapter = await createFakeTraceAdapter();
      const record = await adapter.lookup("217935879");

      expect(record.exists).toBe(true);
      expect(record.farmHistory).toHaveLength(1);
      expect(record.currentFarm?.farmAddress).toMatch(/^경상북도/);
    });

    test("스냅샷에 없는 번호는 미등록으로 재생된다", async () => {
      const adapter = await createFakeTraceAdapter();
      const record = await adapter.lookup("999999999");

      expect(record.exists).toBe(false);
    });
  },
);

describe("스냅샷 경계 검증 — zod 게이트", () => {
  test("모양이 어긋난 스냅샷은 조용히 통과하지 않는다", () => {
    expect(() =>
      parseTraceSnapshot({ generatedAt: "2026-08-10", verdicts: {} }, "테스트"),
    ).toThrow(/스냅샷 형식/);
  });

  test("필수 필드가 빠진 개체는 사유와 함께 실패한다", () => {
    expect(() =>
      parseTraceSnapshot(
        { generatedAt: "2026-08-10", verdicts: [{ docTraceNo9: "212786152" }] },
        "테스트",
      ),
    ).toThrow(/verdicts\.0/);
  });

  test("분석용 부가 필드가 있어도 어댑터 계약 필드만 남기고 통과한다", () => {
    const parsed = parseTraceSnapshot(
      {
        generatedAt: "2026-08-10T01:40:38.382035",
        verdicts: [
          {
            no: 1,
            label: "검증 1호",
            docTraceNo9: "212786152",
            queriedTraceNo12: "002212786152",
            exists: true,
            lsdYmd: null,
            notes: [],
          },
        ],
      },
      "테스트",
    );

    expect(parsed.verdicts).toHaveLength(1);
    expect(parsed.verdicts[0]).not.toHaveProperty("label");
  });
});
